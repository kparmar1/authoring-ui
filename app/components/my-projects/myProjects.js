'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp.myProjects', [
  //insert dependencies here
  'ngRoute',
  'ngTable'
])

  .config(function config($routeProvider) {
    $routeProvider
      .when('/my-projects', {
        controller: 'MyProjectsCtrl',
        templateUrl: 'components/my-projects/myProjects.html',
        resolve: ['terminologyServerService', '$q', function(terminologyServerService, $q) {
            var defer = $q.defer();
            terminologyServerService.getEndpoint().then(function(){
              defer.resolve();
            });                        
            return defer.promise;
          }
        ]
      });
  })

  .controller('MyProjectsCtrl', function MyProjectsCtrl($scope, $rootScope, ngTableParams, $filter, $modal, scaService, terminologyServerService, metadataService, notificationService, hotkeys, localStorageService) {

    // clear task-related i nformation
    $rootScope.validationRunning = false;
    $rootScope.classificationRunning = false;

    // TODO Placeholder, as we only have the one tab at the moment
    $rootScope.pageTitle = "My Projects"
    $scope.projects = null;
    $scope.browserLink = '..';
    
    hotkeys.bindTo($scope)
        .add({
          combo: 'alt+n',
          description: 'Create a New Task',
          callback: function() {$scope.openCreateTaskModal();}
        })
        .add({
          combo: 'alt+l',
          description: 'Go to notification link',
          callback: function() {
             $rootScope.$broadcast('gotoNotificationLink', {});
          }
        })

    // declare table parameters
    $scope.tableParams = new ngTableParams({
        page: 1,
        count: localStorageService.get('my-project-table-display-number') ? localStorageService.get('my-project-table-display-number') : 10,
        sorting: {
          title: 'asc',
          lead: 'asc',
          latestClassificationJson: 'asc',
          validationStatus: 'asc'
        },
        orderBy: 'title'
      },
      {
        filterDelay: 50,
        total: $scope.projects ? $scope.projects.length : 0, // length of data
        getData: function ($defer, params) {
          // Store display number to local storage, then can be re-used later
          if (!localStorageService.get('my-project-table-display-number') 
              || params.count() !== localStorageService.get('my-project-table-display-number')) {
              localStorageService.set('my-project-table-display-number', params.count());
          }

          if (!$scope.projects || $scope.projects.length === 0) {
            $defer.resolve(new Array());
          } else {

            var searchStr = params.filter().search;
            var mydata = [];

            if (searchStr) {
              mydata = $scope.projects.filter(function (item) {
                return item.title.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                || item.projectLead.displayName.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                || item.projectLead.username.toLowerCase().indexOf(searchStr.toLowerCase()) > -1
                || item.key.toLowerCase().indexOf(searchStr.toLowerCase()) > -1;
              });
            } else {
              mydata = $scope.projects;
            }
            params.total(mydata.length);
            mydata = params.sorting() ? $filter('orderBy')(mydata, params.orderBy()) : mydata;

            $defer.resolve(mydata.slice((params.page() - 1) * params.count(), params.page() * params.count()));
          }

        }
      }
    );

    $scope.getBranchStateText = function (project) {
      if (!project) {
        return null;
      }

      switch (project.branchState) {

        case 'UP_TO_DATE':
          return 'Up To Date';
        case 'FORWARD' :
          return 'Forward';
        case 'BEHIND':
          return 'Behind';
        case 'DIVERGED':
          return 'Diverged';
        case 'STALE':
          return 'Stale';
        default:
          return '??';
      }
    };

    // on successful set, reload table parameters
    $scope.$watch('projects', function () {
      if (!$scope.projects || $scope.projects.length === 0) {
      }
      else {
        // add top-level element for ng-table sorting
        angular.forEach($scope.projects, function(project) {
          project.lead = project.projectLead.displayName;
        });
        $scope.tableParams.reload();
      }

    }, true);

    function relatesToUser(project)
    {

    }


    function loadProjects() {
      $scope.projects = [];
      scaService.getProjects().then(function(results){
          angular.forEach($scope.projectKeys, function(projectKey) {
                angular.forEach(results, function(result) {
                    if(result.key === projectKey)
                    {
                        $scope.projects.push(result);
                    }
                });
            });
          notificationService.sendMessage('Projects loaded', 5000);
      });
    }

    // Initialization:  get projects
    function initialize() {

      notificationService.sendMessage('Loading projects...');

      $scope.projectKeys = [];
      var tasksDone = false;
      var reviewTasksDone = false;

      scaService.getTasks().then(function (response) {
        angular.forEach(response, function (task) {
          if ($scope.projectKeys.indexOf(task.projectKey) === -1) {
            $scope.projectKeys.push(task.projectKey);
          }

        });
        tasksDone = true;

        if (reviewTasksDone) {
          loadProjects()
        }
        ;
      });

      scaService.getReviewTasks().then(function (response) {
        angular.forEach(response, function (task) {
          if ($scope.projectKeys.indexOf(task.projectKey) === -1) {
            $scope.projectKeys.push(task.projectKey);
          }
        });
        reviewTasksDone = true;

        if (tasksDone) {
          loadProjects();
        }

      });

    }


    $scope.openCreateTaskModal = function () {
      var modalInstance = $modal.open({
        templateUrl: 'shared/task/task.html',
        controller: 'taskCtrl',
        resolve: {
          task: function() {
            return null;
          },
          canDelete: function() {
              return false;
            }
        }
      });

      modalInstance.result.then(function () {
        initialize();
      }, function () {
      });
    };


    initialize();

  })
;
