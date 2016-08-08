'use strict';

angular.module('singleConceptAuthoringApp')
/**
 * Handles all functionality surrounding CRS tickets
 */
  .factory('crsService', function ($http, $rootScope, $q, scaService, snowowlService) {

      var currentTask;

      var currentTaskConcepts = null;

      function getNewCrsConcept(conceptJson, guid) {
        return {
          // the id fields
          guid: guid,
          conceptId: conceptJson.conceptId,
          fsn: conceptJson.fsn,
          preferredSynonym: conceptJson.preferredSynonym,

          // the original concept Json from the CRT ticket
          conceptJson: conceptJson,

          // flags
          saved: false,
          finished: false

        };
      }

      function getJsonAttachment(url) {
        var deferred = $q.defer();
        $http.get(url).then(function (response) {
          deferred.resolve(response.data);
        }, function (error) {
          deferred.reject(error.message);
        });
        return deferred.promise;
      }

      // Stores the CRS Concept list
      function storeCrsConcepts(concepts) {
        scaService.saveUiStateForTask(currentTask.projectKey, currentTask.key, 'crs-concepts', concepts);
      }

      // initialize ui states from a task
      function initialize() {
        var deferred = $q.defer();

        console.debug('initializing from task', currentTask);

        // the list of containers to storea nd return
        var containers = [];

        // cycle over each linked issue attachment
        angular.forEach(currentTask.issueLinkAttachments, function (url) {

          var promise = $q.defer();
          containers.push(promise);

          // retrieve the JSON attachments
          getJsonAttachment(url).then(function (jsonConcepts) {

            // cycle over each concept in the attachment
            angular.forEach(jsonConcepts, function (jsonConcept) {

              // create a GUID for this concept
              var guid = snowowlService.createGuid();

              // get the container object
              var crsContainer = getNewCrsConcept(jsonConcept, guid);

              // add the container to the list
              promise.resolve(crsContainer);
            });
          });
        });

        // after all promises complete, store and return the container list
        $q.all(containers, function () {
          console.debug(containers);
          storeCrsConcepts(containers);
          deferred.resolve(containers);
        }, function (error) {
          deferred.reject(error);
        });

        return deferred.promise;
      }

      //
      // Clear the CRS Concept list for a task
      //
      function clearCrsConceptsForTask(task) {
        var deferred = $q.defer();
        scaService.deleteUiStateForTask(task.projectKey, task.key, 'crs-concepts').then(function () {
          currentTaskConcepts = null;
          deferred.resolve();
        }, function (error) {
          deferred.reject('Error deleting crs-concepts ui state');
        });
      }

      //
      // Gets the CRS concepts for task, initializing UI states on first attempt
      //
      function getCrsConceptsForTask(task) {
        var deferred = $q.defer();

        console.debug('get crs concepts for task', task);

        // PREREQUISITE: Task must have CRS label
        if (task.labels.indexOf('CRS') === -1) {
          currentTask = null;
          currentTaskConcepts = null;
          deferred.reject('Not a CRS task');
        }



        // set the local task variable for use by other functions
        currentTask = task;

        // check if this task has previously been initialized
        scaService.getUiStateForTask(task.projectKey, task.key, 'crs-concepts').then(function (concepts) {

          console.debug('crs ui-state', concepts);

          // if already initialized, simply return
          if (concepts) {
            currentTaskConcepts = concepts;
            deferred.resolve(concepts);
          } else {
            initialize().then(function (concepts) {
              currentTaskConcepts = concepts;
              deferred.resolve(concepts);
            }, function(error) {
              deferred.reject('Error initializing CRS content');
            });
          }

          return deferred.promise;
        });
      }

      //
      // Function exposure
      //
      return {
        getCrsConceptsForTask: getCrsConceptsForTask,
        clearCrsConceptsForTask: clearCrsConceptsForTask
      };
    }
  )
;