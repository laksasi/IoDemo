angular.module('app.controllers', [])

  .controller('loginCtrl', ['$scope', '$location', 'SISOService', 'SISOFactory',
    function ($scope, $location, SISOService, SISOFactory) {
      $scope.user = {username: "", password: ""};

      $scope.goNext = function (path) {

        SISOService.getUserByUsername({username: $scope.user.username, password: $scope.user.password},
          function (userRec) {
            console.log(userRec);
            if (userRec.success) {
              SISOFactory.set(userRec.record);
              $location.path(path);
            }else{
              console.log(userRec);
            }
          });


      };


    }])

  .controller('checkInCheckOutCtrl', ['$scope', '$interval', '$ionicPopup', '$ionicLoading', 'SISOService', 'SISOFactory',
    function ($scope, $interval, $ionicPopup, $ionicLoading, SISOService, SISOFactory) {

      $scope.record = {status: 'Non-Signed', signInTime: '', signOutTime: '', locationId: 0};
      //$scope.submitLabel = 'Sign Out';
      $scope.submitColor = 'button-assertive';
      $scope.locationSelectedName = '';

      $scope.locations = [
        {id: 1, "name": 'Operations', "checked": false},
        {id: 2, "name": 'Altmeyer', "checked": false},
        {id: 3, "name": 'Annex', "checked": false},
        {id: 4, "name": 'WOC', "checked": false},
        {id: 5, "name": 'NCC', "checked": false},
        {id: 6, "name": 'East Low Rise', "checked": false},
        {id: 7, "name": 'East High Rise', "checked": false},
        {id: 8, "name": 'West Low Rise', "checked": false},
        {id: 9, "name": 'West High Rise', "checked": false}
      ];
      $scope.myTimes = [];

      function chunk(arr, size) {
        var newArr = [];
        for (var i = 0; i < arr.length; i += size) {
          newArr.push(arr.slice(i, i + size));
        }
        return newArr;
      }

      $scope.submitButtonLabel = function(){
        if($scope.record.status === 'Non-Signed'){
          return 'Sing In';
        }else if($scope.record.status === 'Signed-In'){
          return 'Signed Out'
        }else{
          return 'Create New';
        }
      };

      $scope.selectLocation = function (locEl) {
        if ($scope.record.status !== 'Non-Signed') return;

        angular.forEach($scope.locations, function (el) {
          el.checked = false;
          if (locEl === el.id) locEl = el;
        });

        locEl.checked = !locEl.checked;
        $scope.record.locationId = locEl.id;
        $scope.locationSelectedName = locEl.name;

      };


      $scope.$on('$ionicView.loaded', function () {
        $scope.userInfo = SISOFactory.get();

        SISOService.get({pin: $scope.userInfo.pin, status: 'Signed-In'}, function (record) {
          if (record.success && record.records[0]) {
            $scope.selectLocation(record.records[0]['locationId']);
            $scope.record = record.records[0];
          }
        });

      });

      $scope.$on('$ionicView.enter', function () {
        //console.log('$ionicView.enter', $scope.userInfo);
      });

      $scope.myDynamicTimes = function () {

        var currentTime = new Date();
        currentTime.setMinutes(-15);
        var curMinute = currentTime.getMinutes();
        var rawQuarter = precision(curMinute / 15);
        var quarter = Math.ceil(rawQuarter);
        if (quarter === 0) quarter = 1;

        if (rawQuarter <= 3) {
          currentTime.setMinutes(quarter * 15, 0, 0);
        } else {
          currentTime.setHours(currentTime.getHours() + 1, 0, 0, 0);
        }

        // creates times for every lapse of times (15 minutes --> [1000 * 60 * 15])
        if ($scope.myTimes.length === 0 || getLapseOfTime(currentTime) !== $scope.myTimes[0]['hour']) {
          for (var i = 0; i < 5; i++) {
            $scope.myTimes[i] = {"hour": getLapseOfTime(currentTime), "checked": false};
            currentTime = new Date(currentTime.getTime() + (1000 * 60 * 15));
          }
        }

        function precision(n) {
          return (n * 100) / 100;
        }

        function getLapseOfTime(date) {
          return date.toLocaleTimeString().replace(/:\d+ /, ' ');
        }

      };

      // calculate for first-time
      $scope.myDynamicTimes();

      // recalculate every 5 min ---> [1000 * 60 * 5]
      $interval($scope.myDynamicTimes, 1000 * 60 * 1);

      $scope.chunkedLocations = chunk($scope.locations, Math.ceil($scope.locations.length / 2));
      $scope.chunkedTimes = chunk($scope.myTimes, Math.ceil($scope.myTimes.length / 3));

      $scope.singInTime = function (timeEl) {
        $scope.resetTimes();
        timeEl.checked = true;
        $scope.record.signInTime = timeEl.hour;
      };

      $scope.resetTimes = function () {
        angular.forEach($scope.myTimes, function (el) {
          el.checked = false;
        });
      };

      $scope.resetLocations = function () {
        angular.forEach($scope.locations, function (el) {
          el.checked = false;
        });
      };

      $scope.enableSubmit = function () {
        return ($scope.record.status === 'Non-Signed' &&
          $scope.record.locationId > 0 &&
          $scope.record.signInTime.length > 0) ||
          ($scope.record.status === 'Signed-In' && $scope.record.signOutTime.length > 0 )
      };

      $scope.resetForm = function () {
        $scope.resetTimes();
        $scope.resetLocations();

        //$scope.submitLabel = 'Sign In';
        //$scope.submitColor = 'button-balanced';

        $scope.record = {status: 'Non-Signed', signInTime: '', signOutTime: '', locationId: 0};
      };

      $scope.signIn = function () {

        var message = "";
        if ($scope.record.status === 'Non-Signed') {
          message = "You will not be able to change the Location and Sign-In Time after submit";
        } else {
          message = "Please confirm your Signing-out";
        }

        var confirmPopup = $ionicPopup.confirm({
          title: '<b>Submitting Time</b>',
          template: message
        });

        confirmPopup.then(function (res) {
          if (res) {
            if (typeof $scope.record['_id'] === 'undefined') {

              //$scope.record.saved = true;
              $scope.record.status = "Signed-In";
              $scope.record.pin = SISOFactory.get().pin;
              //$scope.submitLabel = 'Sign Out';
              //$scope.submitColor = 'button-assertive';

              $scope.resetTimes();

              //console.log('User on Factory: ', UserFactory.get());
              //console.log('User on Controller: ', $scope.user);


              // TODO save to server
              SISOService.save($scope.record, function (record) {
                if (record.success) {
                  if (record.records.length > 0) {
                    var r = record.records[0];
                    $scope.record['_id'] = r['_id'];
                    $scope.record['__v'] = r['__v'];
                    $ionicLoading.show({template: 'Saved!', noBackdrop: true, duration: 2500});
                  }
                }
              });

            } else if ($scope.record.status === 'Signed-In') {
              $scope.record.status = "Signed-Out";

              // TODO save to server
              SISOService.update($scope.record, function (result) {
                if (result.ok === 1) {
                  $ionicLoading.show({template: 'Updated!', noBackdrop: true, duration: 2500});
                  $scope.resetForm();
                }
              });
            } else {

            }
          } else {
            // console.log('Cancel');

          }
        });


      };

      $scope.singOutTime = function (timeEl) {
        $scope.resetTimes();
        timeEl.checked = true;
        $scope.record.signOutTime = timeEl.hour;
      };

    }])

  .controller('userInfoCtrl', ['$scope', 'SISOFactory', function ($scope, SISOFactory) {
      $scope.userInfo = SISOFactory.get();

  }])

  .controller('logCtrl', ['$scope', 'SISOService', 'SISOFactory', function ($scope, SISOService, SISOFactory) {

    $scope.userInfo = SISOFactory.get();
    $scope.locations = [
      {id: 1, "name": 'Operations', "checked": false},
      {id: 2, "name": 'Altmeyer', "checked": false},
      {id: 3, "name": 'Annex', "checked": false},
      {id: 4, "name": 'WOC', "checked": false},
      {id: 5, "name": 'NCC', "checked": false},
      {id: 6, "name": 'East Low Rise', "checked": false},
      {id: 7, "name": 'East High Rise', "checked": false},
      {id: 8, "name": 'West Low Rise', "checked": false},
      {id: 9, "name": 'West High Rise', "checked": false}
    ];

    $scope.$on('$ionicView.enter', function () {
      SISOService.list({pin: $scope.userInfo.pin}, function (record) {
        if (record.success && record.records.length > 0) {
          $scope.records = record.records;
        }
      });
    });

    $scope.getLocation = function (id) {
      return $scope.locations.filter(function(el){
        return el.id === id;
      });
    };

  }]);