'use strict';

angular.module('happyMeterApp')
  .controller('HomeCtrl', ['$scope', '$http', function ($scope, $http){
    $scope.isEmployee = function(){
      return $scope.currentUser ? $scope.currentUser.role === 'employee' : false;
    };

    $scope.isExecutive = function(){
      return $scope.currentUser ? $scope.currentUser.role === 'executive' : false;
    };
  }]);
