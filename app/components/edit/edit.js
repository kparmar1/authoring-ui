'use strict';

angular.module( 'singleConceptAuthoringApp.edit', [
  //insert dependencies here
    'ngRoute'
])

.config(function config( $routeProvider ) {
  $routeProvider
    .when('/edit/:projectId/:taskId', {
        controller: 'EditCtrl',
        templateUrl: 'components/edit/edit.html'
      });
})

.controller( 'EditCtrl', function AboutCtrl( $scope, $rootScope) {
	  $scope.tabs = ['Log','Timeline','Messages'];
	  $scope.popover = {
		  placement: 'left',
  'title': 'Title',
  'content': 'Hello Popover<br />This is a multiline message!'
};
    var addToList = function (item) {
            console.log(item);
    };
});