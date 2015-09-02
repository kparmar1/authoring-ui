'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('conflicts', ['$rootScope', 'ngTableParams', '$routeParams', '$filter', '$timeout', '$modal', '$compile', '$sce', 'scaService', 'accountService', 'notificationService',
    function ($rootScope, NgTableParams, $routeParams, $filter, $timeout, $modal, $compile, $sce, scaService, accountService, notificationService) {
      return {
        restrict: 'A',
        transclude: false,
        replace: true,
        scope: {
          // conflicts container structure:
          // { conceptsToResolve: [...], conceptsResolved: [...] }

          conflictsContainer: '=',

          // branch this conflict report was generated against
          sourceBranch: '=',

          // branch this conflict report was generated for
          targetBranch: '='

        },
        templateUrl: 'shared/conflicts/conflicts.html',

        link: function (scope, element, attrs, linkCtrl) {

          // declare To Resolve table parameters
          scope.conceptsToResolveTableParams = new NgTableParams({
              page: 1,
              count: 10,
              sorting: {fsn: 'asc'},
              orderBy: 'fsn'
            },
            {
              filterDelay: 50,
              total: scope.conflictsContainer && scope.conflictsContainer.conflicts && scope.conflictsContainer.conflicts.conceptsToResolve ?
                scope.conflictsContainer.conflicts.conceptsToResolve.length : 0,

              getData: function ($defer, params) {

                if (!scope.conflictsContainer || !scope.conflictsContainer.conflicts || !scope.conflictsContainer.conflicts.conceptsToResolve || scope.conflictsContainer.conflicts.conceptsToResolve.length === 0) {
                  console.debug('in null if');
                  scope.conceptsToResolveViewed = [];
                } else {

                  console.debug(scope.conflictsContainer.conflicts);

                  // filter
                  var conceptsToResolveViewed = params.filter() ?
                    $filter('filter')(scope.conflictsContainer.conflicts.conceptsToResolve, params.filter()) :
                    scope.conflictsContainer.conflicts.conceptsToResolve;

                  console.debug(conceptsToResolveViewed);

                  // hard set the new total
                  params.total(conceptsToResolveViewed.length);

                  // order
                  conceptsToResolveViewed = params.sorting() ? $filter('orderBy')(conceptsToResolveViewed, params.orderBy()) : conceptsToResolveViewed;

                  // extract the paged results
                  scope.conceptsToResolveViewed = (conceptsToResolveViewed.slice((params.page() - 1) * params.count(), params.page() * params.count()));

                  console.debug(scope.conceptsToResolveViewed);

                }
              }
            }
          );

          // declare Resolved table parameters
          scope.conceptsResolvedTableParams = new NgTableParams({
              page: 1,
              count: 10,
              sorting: {fsn: 'asc'},
              orderBy: 'fsn'
            },
            {
              filterDelay: 50,
              total: scope.conflictsContainer && scope.conflictsContainer.conflicts && scope.conflictsContainer.conflicts.conceptsResolved ?
                scope.conflictsContainer.conflicts.conceptsResolved.length : 0,

              getData: function ($defer, params) {

                if (!scope.conflictsContainer || !scope.conflictsContainer.conflicts || !scope.conflictsContainer.conflicts.conceptsResolved || scope.conflictsContainer.conflicts.conceptsResolved.length === 0) {
                  scope.conceptsResolvedViewed = [];
                } else {


                  // filter
                  var conceptsResolvedViewed = params.filter() ?
                    $filter('filter')(scope.conflictsContainer.conflicts.conceptsResolved, params.filter()) :
                    scope.conflictsContainer.conflicts.conceptsResolved;

                  // hard set the new total
                  params.total(conceptsResolvedViewed.length);

                  // order
                  conceptsResolvedViewed = params.sorting() ? $filter('orderBy')(conceptsResolvedViewed, params.orderBy()) : conceptsResolvedViewed;

                  // extract the paged results
                  scope.conceptsResolvedViewed = (conceptsResolvedViewed.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                }
              }
            }
          );

          //////////////////////////////////////////////
          // Resolved List Functions
          //////////////////////////////////////////////

          // update the resolved list
          function updateResolvedListUiState() {
            var conceptIds = [];
            angular.forEach(scope.conflictsContainer.conflicts.conceptsResolved, function (concept) {
              conceptIds.push(concept.id);
            });
            scaService.saveUIState($routeParams.projectKey, $routeParams.taskKey, 'resolved-list', conceptIds);
          }

          // move item from ToResolve to Resolved
          scope.addToResolved = function (item, stopUiStateUpdate) {
            item.selected = false;
            scope.conflictsContainer.conflicts.conceptsResolved.push(item);
            var elementPos = scope.conflictsContainer.conflicts.conceptsToResolve.map(function (x) {
              return x.id;
            }).indexOf(item.id);
            scope.conflictsContainer.conflicts.conceptsToResolve.splice(elementPos, 1);
            scope.conceptsToResolveTableParams.reload();
            scope.conceptsResolvedTableParams.reload();

            // if stop request not indicated (or not supplied), update ui state
            if (!stopUiStateUpdate) {
              updateResolvedListUiState();
            }

          };

          // move item from Resolved to ToResolve
          scope.returnToResolve = function (item, stopUiStateUpdate) {
            item.selected = false;
            scope.conflictsContainer.conflicts.conceptsToResolve.push(item);
            var elementPos = scope.conflictsContainer.conflicts.conceptsResolved.map(function (x) {
              return x.id;
            }).indexOf(item.id);
            scope.conflictsContainer.conflicts.conceptsResolved.splice(elementPos, 1);
            scope.conceptsResolvedTableParams.reload();
            scope.conceptsToResolveTableParams.reload();

            // if stop request not indicated (or not supplied), update ui state
            if (!stopUiStateUpdate) {
              updateResolvedListUiState();
            }
          };

          scope.selectAll = function (actionTab, isChecked) {
            console.debug('selectAll', actionTab, isChecked);
            if (actionTab === 1) {
              angular.forEach(scope.conceptsToResolveViewed, function (item) {
                item.selected = isChecked;
              });
            } else if (actionTab === 2) {
              angular.forEach(scope.conceptsResolvedViewed, function (item) {
                item.selected = isChecked;
              });
            }
          };

          // move all selected objects from one list to the other
          // depending on current viewed tab
          // NOTE:  Apply stopUiUpdate flag
          scope.moveMultipleToOtherList = function (actionTab) {
            if (actionTab === 1) {
              angular.forEach(scope.conceptsToResolveViewed, function (item) {
                if (item.selected === true) {
                  console.debug('adding to resolved list', item);
                  scope.addToResolved(item, true);
                }
              });
            } else if (actionTab === 2) {
              angular.forEach(scope.conceptsResolvedViewed, function (item) {
                console.debug('checking item', item);
                if (item.selected === true) {
                  console.debug('adding to to resolve list', item);
                  scope.returnToResolve(item, true);
                }
              });
            }

            // update the ui state
            updateResolvedListUiState();
          };

          //////////////////////////////////
          // Add To Edit List functions
          //////////////////////////////////

          scope.addToEdit = function (concept) {
            // note that edit list notification expects array of concept ids
            $rootScope.$broadcast('editConflictConcepts', {conceptIds: [concept.conceptId]});
          };

          // add all selected objects to edit panel list
          // depending on current viewed tab
          scope.addMultipleToEdit = function (actionTab) {
            var conceptIds = [];
            if (actionTab === 1) {
              angular.forEach(scope.conceptsToResolveViewed, function (item) {
                if (item.selected === true) {
                  conceptIds.push(item.conceptId);
                }
              });
            } else if (actionTab === 2) {
              angular.forEach(scope.conceptsResolvedViewed, function (item) {
                if (item.selected === true) {
                  conceptIds.push(item.conceptId);
                }
              });
            }

            if (conceptIds.length > 0) {
              $rootScope.$broadcast('editConflictConcepts', {conceptIds: conceptIds});
            }
          };

          // function called when dropping concept
          // targetIndex: the point at which to insert the dropped concept
          // draggedConcept: {startIndex: N, concept: {...}}
          scope.dropConcept = function (droppedConcept, draggedConcept, actionTab) {

            console.debug('drop event', droppedConcept, draggedConcept, actionTab);

            if (droppedConcept === draggedConcept) {
              // do nothing if same target as source
            } else {

              // copy array (to avoid triggering watch statement below)
              // on drop, disable auto-sorting of table params  -- otherwise
              // drag/drop makes no sense, will only be auto-re-ordered
              var newConceptArray = [];
              switch (actionTab) {
                case 1:
                  newConceptArray = scope.conflictsContainer.conflicts.conceptsToResolve;
                  scope.conceptsToResolveTableParams.sorting('');
                  break;
                case 2:
                  newConceptArray = scope.conflictsContainer.conflicts.conceptsResolved;
                  scope.conceptsResolvedTableParams.sorting('');
                  break;
                default:
                  console.error('Invalid tab selected for grouping selected concepts');
                  return;
              }

              // find the index at which the target concept is located
              // NOTE: This cannot be passed in simply, due to filtering
              var droppedIndex = -1;
              var draggedIndex = -1;
              for (var i = 0; i < newConceptArray.length; i++) {

                console.debug('checking concept', newConceptArray[i]);

                // NOTE: Compare by.conceptId, as dragged/dropped concepts have
                // $hashkey which prevents true equality checking
                if (newConceptArray[i].conceptId === droppedConcept.conceptId) {
                  console.debug('found dropped');
                  droppedIndex = i;
                }
                if (newConceptArray[i].conceptId === draggedConcept.conceptId) {
                  draggedIndex = i;
                  console.debug('found dragged');
                }
              }

              // check that both indices were found
              if (droppedIndex === -1 || draggedIndex === -1) {
                console.error('Error determining indices for drag and drop');
                return;
              }

              // insert very slight timeout to allow dragndrop to check for
              // requested effects (deleting too fast causes undefined-access
              // errors)
              $timeout(function () {
                // remove the passed object
                newConceptArray.splice(draggedIndex, 1);

                // insert the dragged concept at the target index
                newConceptArray.splice(droppedIndex, 0, draggedConcept);

                // replace the appropriate array
                switch (actionTab) {
                  case 1:
                    scope.conflictsContainer.conflicts.conceptsToResolve = newConceptArray;
                    scope.conceptsToResolveTableParams.reload();
                    break;
                  case 2:
                    scope.conflictsContainer.conflicts.conceptsResolved = newConceptArray;
                    scope.conceptsResolvedTableParams.reload();
                    break;
                  default:
                    console.error('Invalid tab selected for grouping selected concepts');
                    return;
                }

              }, 25);
            }
          };

          ////////////////////////////////////////////////////////////////////
          // Watch freedback container -- used as Initialization Block
          ////////////////////////////////////////////////////////////////////
          scope.$watch('conflictsContainer', function () {

            console.debug('conflictsContainer changed', scope.conflictsContainer);

            if (!scope.conflictsContainer) {
              return;
            }

            // pre-processing on initial load (conceptsToResolve and
            // conceptsResolved do not yet exist)
            if (scope.conflictsContainer.conflicts && scope.conflictsContainer.conflicts.concepts.length > 0 && !scope.conflictsContainer.conflicts.conceptsToResolve && !scope.conflictsContainer.conflicts.conceptsResolved) {

              console.debug('initial setup');

              // INITIAL SETUP:  put all concepts into toResolve
              scope.conflictsContainer.conflicts.conceptsToResolve = scope.conflictsContainer.conflicts.concepts;
              scope.conflictsContainer.conflicts.conceptsResolved = [];

              // on load, initialize tables -- all subsequent reloads manual
              scope.conceptsToResolveTableParams.reload();
              scope.conceptsResolvedTableParams.reload();
            }
          }, true);
        }
      };
    }])
;