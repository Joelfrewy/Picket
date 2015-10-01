var app = angular.module('app', ['ngRoute','angularUtils.directives.dirPagination']);

app.config(function($routeProvider) {
  $routeProvider
  // route for the home page
    .when('/home', {
    templateUrl: 'home.html',
    controller: 'ctrl'
  })

  .when('/item/:id', {
    templateUrl: 'item.html',
    controller: 'itemctrl'
  })

  .when('/login', {
    templateUrl: 'login.html',
    controller: 'loginctrl'
  })

  .when('/settings/User', {
    templateUrl: 'settings-user.html',
    controller: 'usersettings'
  })

  .when('/settings/Item', {
    templateUrl: 'settings-item.html',
    controller: 'itemsettings'
  })

  .when('/settings/:type', {
    templateUrl: 'settings.html',
    controller: 'settings'
  })

  .otherwise({
    redirectTo: '/home'
  });
});

app.factory('Auth', ['$location', '$q', function($location, $q) {
  Parse.initialize("2kz7IE2OW2q2J6u3gfUky7urscRr7SBnJUoA59iT",
    "tcIZ1tMEIvAvKKcrAQQkdRlhf1YlhBLXP8BAkJuA");
  return {
    isLoggedIn: function() {
      return Parse.User.current();
    },
    logIn: function(form) {
      var deferred = $q.defer();
      Parse.User.logIn(form.username, form.password, {
        success: function(user) {
          deferred.resolve(true);
        },
        error: function(user, error) {
          deferred.reject(error);
        }
      });
      return deferred.promise;
    },
    logOut: function() {
      Parse.User.logOut();
    },
    isAdmin: function(user) {
      return user.get('isAdmin');
    },
    currentIsAdmin: function() {
      return Parse.User.current().get('isAdmin');
    },
  };
}]);

app.run(['$rootScope', 'Auth', '$location', '$http',
  function($rootScope, Auth, $location, $http) {
    $rootScope.$on('$locationChangeStart', function(event, next, current) {
      // redirect to login page if not logged in
      if ($location.path() !== '/login' && !Auth.isLoggedIn()) {
        $location.path('/login');
      }
    });
  }
]);

app.controller('loginctrl', ['$scope', 'Auth', '$location', function($scope, Auth, $location) {
  $scope.invalid = false;
  $scope.logIn = function(form) {
    Auth.logIn(form).then(function(result) {
      $location.path('/home');
    }, function(error) {
      $scope.invalid = true;
    });
  };
}]);

app.controller('navctrl', ['$scope', 'Auth', '$location', function($scope, Auth, $location) {
  $scope.isAdmin = Auth.currentIsAdmin();

  $scope.logOut = function() {
    Auth.logOut();
    $location.path('/login');
  };
}]);

app.controller('ctrl', ['$scope', 'Auth', '$location', function($scope, Auth, $location) {
  Parse.initialize("2kz7IE2OW2q2J6u3gfUky7urscRr7SBnJUoA59iT",
    "tcIZ1tMEIvAvKKcrAQQkdRlhf1YlhBLXP8BAkJuA");
  $scope.monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
  var item = Parse.Object.extend("Item");

  $scope.isAdmin = Auth.isAdmin(Parse.User.current());
  $scope.ordering = "-status";
  $scope.shipfilter = "";
  $scope.sectionfilter = "";
  $scope.ships = [];
  $scope.sections = [];

  var sectionobj = Parse.Object.extend("Section");
  var sectionquery = new Parse.Query(sectionobj);
  sectionquery.find({
    success: function(results) {
      for (var i = 0; i < results.length; i++) {
        $scope.sections.push(results[i].get("name"));
      }
    },
    error: function(error) {

    }
  });

  var shipobj = Parse.Object.extend("Ship");
  var shipquery = new Parse.Query(shipobj);
  shipquery.find({
    success: function(results) {
      for (var i = 0; i < results.length; i++) {
        $scope.ships.push(results[i].get("name"));
      }
    },
    error: function(error) {

    }
  });

  
  
  $scope.filter = function(type, filter) {
    if (type === 0) {
      $scope.shipfilter = filter;
    } else {
      $scope.sectionfilter = filter;
    }
  }

  $scope.settings = function() {
    if (Auth.isAdmin(Parse.User.current())) {
      $location.path('/settings/User');
    }
  };

  $scope.logOut = function() {
    Auth.logOut();
    $location.path('/login');
  };

  $scope.changeorder = function(pressed) {
    if ($scope.ordering == pressed) {
      $scope.ordering = "-" + pressed;
    } else {
      $scope.ordering = pressed;
    }
  };

  $scope.updateTable = function() {

    var query = new Parse.Query(item);
    $scope.rows = [];
    var currentship = Parse.User.current().get("ship");
    if(currentship != "All"){
    query.equalTo("ship",currentship);
    }
    query.ascending("score");
    query.find({
      success: function(results) {
        // Do something with the returned Parse.Object values

        for (var i = 0; i < results.length; i++) {
          var object = results[i];
          var time = object.get('lastChecked');
          if (typeof time === 'undefined') {
            time = "";
            nexttime = "";
            check = 1;
          } else {
            var nexttime = new Date(time.getTime() + 86400000 * object.get("minDays"));
            var check = 0;
            if (time.getTime() + 86400000 * object.get("maxDays") < new Date().getTime()) {
              check = 2;
            } else if (time.getTime() + 86400000 * object.get("minDays") < new Date().getTime()) {
              check = 1;
            }
          }
          $scope.rows.push({
            "id": object.id,
            "item": object.get("name"),
            "ship": object.get("ship"),
            "section": object.get("section"),
            "lastchecked": time,
            "nextcheck": nexttime,
            "status": check
          });
          $scope.$apply();
        }
      },
      error: function(error) {
        alert("Error: " + error.code + " " + error.message);
      }
    });
  };

  $scope.exceptEmptyStrictComparator = function (actual, expected) {
        if (!expected) {
            return true;
        }
        return angular.equals(expected, actual);
    };

  $scope.updateTable();

  $scope.temp = false;

  $scope.go = function(id) {
    $location.path("/item/" + id);
  };

  $scope.addRow = function() {
    $scope.temp = false;
    $scope.addName = "";
  };

  $scope.plural = function(tab) {
    return tab.length > 1 ? 's' : '';
  };

  $scope.addTemp = function() {
    if ($scope.temp) $scope.rows.pop();
    else if ($scope.addName) $scope.temp = true;

    if ($scope.addName) $scope.rows.push($scope.addName);
    else $scope.temp = false;
  };

  $scope.isTemp = function(i) {
    return i == $scope.rows.length - 1 && $scope.temp;
  };
}]);

app.controller('itemctrl', ['$scope', 'Auth', '$location', '$routeParams', function($scope, Auth, $location, $routeParams) {
  $scope.monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
  $scope.id = $routeParams.id;
  $scope.comment = "";
  $scope.ordering = "-date";
  $scope.adding = false;
  $scope.date = new Date();
  Parse.initialize("2kz7IE2OW2q2J6u3gfUky7urscRr7SBnJUoA59iT",
    "tcIZ1tMEIvAvKKcrAQQkdRlhf1YlhBLXP8BAkJuA");
  var checks = Parse.Object.extend("Checks");

  $scope.updateTable = function(item) {
    $scope.checks = [];
    var check = new Parse.Query(checks);
    check.equalTo("item", item.get("name"));
    check.descending("time");
    check.find({
      success: function(results) {
        // Do something with the returned Parse.Object values
        for (var i = 0; i < results.length; i++) {
          var object = results[i];
          $scope.checks.push({
            "id": object.id,
            "user": object.get("user"),
            "date": object.get("time"),
            "comment": object.get("comment")
          });
        }
        $scope.$apply();
      },
      error: function(error) {
        alert("Error: " + error.code + " " + error.message);
      }
    });
  };

  var item = Parse.Object.extend("Item");
  var query = new Parse.Query(item);
  query.get($scope.id, {
    success: function(item) {
      var time = item.get('lastChecked');
      if (typeof time === 'undefined') {
        time = "";
        nexttime = "";
        check = 1;
      } else {
      var nexttime = new Date(item.get('lastChecked').getTime() + 86400000 * item.get("minDays"));
      var check = 0;
      if (time.getTime() + 86400000 * item.get("maxDays") < new Date().getTime()) {
        check = 2;
      } else if (time.getTime() + 86400000 * item.get("minDays") < new Date().getTime()) {
        check = 1;
      }
      }
      $scope.ship = item.get("ship");
      $scope.section = item.get("section");
      $scope.item = item.get("name");
      $scope.nextcheck = nexttime;
      $scope.status = check;
      $scope.updateTable(item);
    },
    error: function(object, error) {}
  });

  $scope.changeorder = function(pressed) {
    if ($scope.ordering == pressed) {
      $scope.ordering = "-" + pressed;
    } else {
      $scope.ordering = pressed;
    }
  };

  $scope.startadd = function() {
    $scope.adding = true;
  };

  $scope.check = function() {
    var checkquery = new Parse.Query(item);
    checkquery.get($scope.id, {
      success: function(gameScore) {
        gameScore.set("lastChecked", new Date());
        gameScore.save();
        $scope.nextcheck = new Date(gameScore.get('lastChecked').getTime() + 86400000 * gameScore.get("minDays"));
        $scope.$apply();
      },
      error: function(object, error) {
        // The object was not retrieved successfully.
        // error is a Parse.Error with an error code and message.
      }
    });
  };

  $scope.add = function(comment) {
    var newcheck = new checks();
    newcheck.save({
      user: Parse.User.current().get("username"),
      ship: $scope.ship,
      section: $scope.section,
      item: $scope.item,
      time: new Date(),
      comment: comment
    }, {
      success: function(newcheck) {
        $scope.checks.push({
          "id": newcheck.id,
          "user": Parse.User.current().get("username"),
          "date": new Date(),
          "comment": comment
        });
        $scope.status = 0;
        $scope.check();
        $scope.$apply();
      },
      error: function(newcheck, error) {}
    });
    $scope.adding = false;
  };

  $scope.$watch('comment', function(newValue, oldValue) {
    if (newValue) {
      if (newValue.length > 140) {
        $scope.comment = oldValue;
      }
    }
  });

  $scope.back = function() {
    $location.path("/home");
  };
}]);

app.controller('settings', ['$scope', 'Auth', '$location', '$routeParams', function($scope, Auth, $location, $routeParams) {
  $scope.types = ["User", "Item", "Section", "Ship"];
  $scope.type = $routeParams.type;
  $scope.addname = "";
  $scope.rows = [];
  Parse.initialize("2kz7IE2OW2q2J6u3gfUky7urscRr7SBnJUoA59iT",
    "tcIZ1tMEIvAvKKcrAQQkdRlhf1YlhBLXP8BAkJuA");
  var item = Parse.Object.extend($scope.type);

  $scope.adding = false;

  $scope.go = function(t) {
    $location.path("/settings/" + t);
  };

  $scope.updateTable = function() {

    var query = new Parse.Query(item);
    $scope.rows = [];
    query.find({
      success: function(results) {
        // Do something with the returned Parse.Object values
        for (var i = 0; i < results.length; i++) {
          var object = results[i];
          var name = object.get("name");
          $scope.rows.push({
            "id": object.id,
            "name": name
          });
          $scope.$apply();
        }
      },
      error: function(error) {
        alert("Error: " + error.code + " " + error.message);
      }
    });
  };
  $scope.updateTable();

  $scope.startadd = function() {
    $scope.adding = true;
  }
  
  $scope.stopadd = function() {
    $scope.adding = false;
  }

  $scope.delete = function(index) {
    var deletequery = new Parse.Query(item);
    deletequery.get($scope.rows[index].id, {
      success: function(item) {
        $scope.rows.splice(index, 1);
        item.destroy();
        $scope.$apply();
      },
      error: function(object, error) {}
    });
  };

  $scope.add = function(name) {
    var newitem = new item();
    newitem.save({
      name: $scope.addname
    }, {
      success: function(newitem) {
        $scope.rows.push({
          "id": newitem.id,
          "name": $scope.addname
        });
        $scope.$apply()
        stopadd();
      },
      error: function(newitem, error) {}
    });
    $scope.adding = false;
    $scope.$apply();
  };

}]);

app.controller('usersettings', ['$scope', 'Auth', '$location', function($scope, Auth, $location) {
  $scope.types = ["User", "Item", "Section", "Ship"];
  $scope.type = "User";
  $scope.ships = ["All"];
  $scope.rows = [];
  $scope.addemail = "";
  $scope.adding = false;
  $scope.addpassword = "";
  Parse.initialize("2kz7IE2OW2q2J6u3gfUky7urscRr7SBnJUoA59iT",
    "tcIZ1tMEIvAvKKcrAQQkdRlhf1YlhBLXP8BAkJuA");
  var user = Parse.Object.extend("User");
  var ship = Parse.Object.extend("Ship");
  var shipquery = new Parse.Query(ship)
  shipquery.find({
    success: function(results) {
      // Do something with the returned Parse.Object values
      for (var i = 0; i < results.length; i++) {
        var object = results[i];
        $scope.ships.push(object.get("name"));
      }
      $scope.$apply();
    },
    error: function(error) {
      alert("Error: " + error.code + " " + error.message);
    }
  });

  $scope.go = function(t) {
    $location.path("/settings/" + t);
  };

  $scope.updateTable = function() {

    var query = new Parse.Query(user);
    $scope.rows = [];
    $scope.changingpassword = false;
    query.find({
      success: function(results) {
        // Do something with the returned Parse.Object values
        for (var i = 0; i < results.length; i++) {
          var object = results[i];
          $scope.rows.push({
            "id": object.id,
            "email": object.get("username"),
            "ship": object.get("ship"),
            "isAdmin": Auth.isAdmin(object)
          });
          $scope.$apply();
        }
      },
      error: function(error) {
        alert("Error: " + error.code + " " + error.message);
      }
    });
  };
  $scope.updateTable();

  $scope.startadd = function() {
    $scope.adding = true;
  };

  $scope.stopadd = function() {
    $scope.adding = false;
  };

  $scope.delete = function(id) {
    Parse.Cloud.run('deleteUser', {
      userid: Parse.User.current().id,
      deleteid: id
    }, {
      success: function(secretString) {
        for (var i = 0; i < $scope.rows.length; i++) {
          if ($scope.rows[i].id === id) {
            $scope.rows.splice(i, 1);
          }
        }
        $scope.$apply();
      },
      error: function(error) {}
    });
  };

  $scope.startChangePassword = function() {
    $scope.changingpassword = true;
  }

  $scope.stopChangePassword = function() {
    $scope.changingpassword = false;
  }

  $scope.changePassword = function(id, password) {
    alert(id);
    alert(password);
    var query = new Parse.Query(user);
    query.get(id, {
      success: function(user) {
        user.set("password", password);
        user.save();
        $scope.changingpassword = false;
        $scope.$apply();
      },
      error: function(object, error) {
        // The object was not retrieved successfully.
        // error is a Parse.Error with an error code and message.
      }
    });
  }

  $scope.add = function() {
    var newuser = new user();
    newuser.save({
      username: $scope.addemail,
      ship: $scope.addship,
      password: $scope.addpassword,
      isAdmin: false
    }, {
      success: function(newuser) {
        $scope.rows.push({
          "id": newuser.id,
          "email": $scope.addemail,
          "ship": $scope.addship,
          "isAdmin": false
        });
        $scope.$apply();
      },
      error: function(newitem, error) {}
    });
    $scope.adding = false;
  };

}]);

app.controller('itemsettings', ['$scope', 'Auth', '$location', function($scope, Auth, $location) {
  $scope.type = "User";
  $scope.ships = [];
  $scope.sections = [];
  $scope.rows = [];
  $scope.addname = "";
  $scope.addship = "";
  $scope.addsection = "";
  $scope.addmindays = 7;
  $scope.addmaxdays = 10;
  Parse.initialize("2kz7IE2OW2q2J6u3gfUky7urscRr7SBnJUoA59iT",
    "tcIZ1tMEIvAvKKcrAQQkdRlhf1YlhBLXP8BAkJuA");
  var item = Parse.Object.extend("Item");

  $scope.adding = false;

  var ship = Parse.Object.extend("Ship");
  var shipquery = new Parse.Query(ship)
  shipquery.find({
    success: function(results) {
      // Do something with the returned Parse.Object values
      for (var i = 0; i < results.length; i++) {
        var object = results[i];
        $scope.ships.push(object.get("name"));
      }
      $scope.$apply();
    },
    error: function(error) {
      alert("Error: " + error.code + " " + error.message);
    }
  });

  var section = Parse.Object.extend("Section");
  var sectionquery = new Parse.Query(section)
  sectionquery.find({
    success: function(results) {
      // Do something with the returned Parse.Object values
      for (var i = 0; i < results.length; i++) {
        var object = results[i];
        $scope.sections.push(object.get("name"));
      }
      $scope.$apply();
    },
    error: function(error) {
      alert("Error: " + error.code + " " + error.message);
    }
  });

  $scope.go = function(t) {
    $location.path("/settings/" + t);
  };

  $scope.updateTable = function() {

    var query = new Parse.Query(item);
    $scope.rows = [];
    $scope.changingpassword = false;
    query.find({
      success: function(results) {
        // Do something with the returned Parse.Object values
        for (var i = 0; i < results.length; i++) {
          var object = results[i];
          $scope.rows.push({
            "id": object.id,
            "name": object.get("name"),
            "ship": object.get("ship"),
            "section": object.get("section"),
            "minDays": object.get("minDays"),
            "maxDays": object.get("maxDays")
          });
          $scope.$apply();
        }
      },
      error: function(error) {
        alert("Error: " + error.code + " " + error.message);
      }
    });
  };
  $scope.updateTable();

  $scope.startadd = function() {
    $scope.adding = true;
  };

  $scope.stopadd = function() {
    $scope.adding = false;
  };

  $scope.delete = function(id) {
    var deletequery = new Parse.Query(item);
    deletequery.get(id, {
      success: function(item) {
        for (var i = 0; i < $scope.rows.length; i++) {
          if ($scope.rows[i].id === id) {
            $scope.rows.splice(i, 1);
          }
        }
        item.destroy();
        $scope.$apply();
      },
      error: function(object, error) {}
    });
  };

  $scope.add = function() {
    var newitem = new item();
    newitem.save({
      name: $scope.addname,
      ship: $scope.addship,
      section: $scope.addsection,
      minDays: $scope.addmindays,
      maxDays: $scope.addmaxdays
    }, {
      success: function(newitem) {
        $scope.rows.push({
          "id": newitem.id,
          "name": newitem.get("name"),
          "ship": newitem.get("ship"),
          "section": newitem.get("section"),
          "minDays": newitem.get("minDays"),
          "maxDays": newitem.get("maxDays")
        });
        $scope.$apply();
      },
      error: function(newitem, error) {}
    });
    $scope.adding = false;
  };

}]);