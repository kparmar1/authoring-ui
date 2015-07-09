'use strict';
angular.module('singleConceptAuthoringApp')
  .directive('conceptEdit', function ($modal, $q, snowowlService, objectService) {
    return {
      restrict: 'A',
      transclude: true,
      replace: true,
      scope: {
        // the concept being displayed
        concept: '=concept',

        // the branch of the concept
        branch: '=branch',
        ctrlFn: '&'
      },
      templateUrl: 'shared/concept-edit/conceptEdit.html',

      link: function (scope, element, attrs, linkCtrl, $timeout) {

        if (!scope.concept) {
          console.error('conceptEdit directive requires concept to be specified');
          return;
        }

        if (!scope.branch) {
          console.error('conceptEdit directive requires branch to be specified');
        }

        ////////////////////////////////
        // Concept Elements
        ////////////////////////////////

        var inactivateConceptReasons = [
          {id: '', text: 'Ambiguous concept (inactive concept)'},
          {id: '', text: 'Duplicate concept (inactive concept)'},
          {id: '', text: 'Erroneous concept (inactive concept)'},
          {id: '', text: 'Limited status concept (inactive concept)'},
          {id: '', text: 'Moved elsewhere (inactive concept'},
          {id: '', text: 'Outdated concept (inactive concept)'},
          {id: '', text: 'Reason not stated concept (inactive concept)'},
          {id: '', text: 'No reason'}
        ];

        scope.toggleConceptActive = function (Conceptconcept) {
          // if inactive, simply set active
          if (!Conceptconcept.active) {
            Conceptconcept.active = true;
          }

          // otherwise, open a selct reason modal
          else {
            // TODO Decide what the heck to do with result
            selectInactivationReason(Conceptconcept, 'Concept', inactivateConceptReasons).then(function (reason) {

               scope.concept.active = false;

              // if reason is selected, deactivate all descriptions and
              // relationships
              if (reason) {
                angular.forEach(scope.concept.descriptions, function (description) {
                  description.active = false;
                });
                angular.forEach(scope.concept.outboundRelationships, function (relationship) {
                  relationship.active = false;
                });
              }
            });
          }
        };

        ////////////////////////////////
        // Description Elements
        ////////////////////////////////

        // ensure at least one empty description is present
        if (!scope.concept.descriptions || scope.concept.descriptions.length === 0) {
          scope.concept.descriptions = [];
          scope.concept.descriptions.push(objectService.getNewDescription(scope.concept.id));
        }

        // Define available languages
        scope.languages = [
          {id: 'en', abbr: 'en'}
        ];

        // Define definition types
        scope.typeIds = [
          {id: '900000000000003001', abbr: 'FSN'},
          {id: '900000000000013009', abbr: 'SYN'},
          {id: '900000000000550004', abbr: 'DEF'}
        ];

        // define acceptability types
        scope.acceptabilities = [
          {id: 'PREFERRED', abbr: 'Preferred'},
          {id: 'ACCEPTABLE', abbr: 'Acceptable'},
          {id: 'NOT ACCEPTABLE', abbr: 'Not acceptable'}
        ];

        // List of acceptable reasons for inactivating a description
        // TODO:  More metadata to be retrieved on init and stored
        var inactivateDescriptionReasons = [
          {
            id: '',
            text: 'ALTERNATIVE association reference set (foundation metadata concept)'
          },
          {
            id: '',
            text: 'MOVED FROM association reference set (foundation metadata concept)'
          },
          {
            id: '',
            text: 'MOVED TO association reference set (foundation metadata concept)'
          },
          {
            id: '',
            text: 'POSSIBLY EQUIVALENT TO association reference set (foundation metadata concept'
          },
          {
            id: '',
            text: 'REFERS TO concept association reference set (foundation metadata concept)'
          },
          {
            id: '',
            text: 'REPLACED BY association reference set (foundation metadata concept)'
          },
          {
            id: '',
            text: 'SAME AS association reference set (foundation metadata concept)'
          },
          {
            id: '',
            text: 'SIMILAR TO association reference set (foundation metadata concept)'
          },
          {
            id: '',
            text: 'WAS A association reference set (foundation metadata concept)'
          },
          {id: '', text: 'No reason'}
        ];

        scope.addDescription = function () {

          var description = objectService.getNewDescription(scope.concept.id);
          scope.concept.descriptions.push(description);
        };

        scope.toggleDescriptionActive = function (description) {
          // if inactive, simply set active
          if (!description.active) {
            description.active = true;
          }

          // otherwise, open a selct reason modal
          else {
            // TODO Decide what the heck to do with result
            selectInactivationReason(description, 'Description', inactivateDescriptionReasons).then(function(reason) {
              description.active = false;
            });
          }
        };

        ////////////////////////////////
        // Relationship Elements
        ////////////////////////////////

        // ensure at least one empty outbound relationship is present
        if (!scope.concept.outboundRelationships || scope.concept.outboundRelationships.length === 0) {
          scope.concept.outboundRelationships = [];
          scope.concept.outboundRelationships.push(objectService.getNewRelationship(scope.concept.id));
        }

        // define characteristic types
        scope.characteristicTypes = [
          {id: 'STATED_RELATIONSHIP', abbr: 'Stated'},
          {id: 'INFERRED_RELATIONSHIP', abbr: 'Inferred'}
        ];

        scope.addRelationship = function (isAttribute) {

          var relationship = objectService.getNewRelationship(scope.concept.id);

          // if an attribute, clear the default type id
          // TODO May want to separate these out, we'll see
          if (isAttribute) {
            relationship.typeId = ''; // causes filter to read as attribute
          }
          scope.concept.outboundRelationships.push(relationship);
        };
        scope.nameMap = {};
        var i = 1;
        // retrieve names of all relationship targets
        angular.forEach(scope.concept.outboundRelationships, function (rel) {

          snowowlService.getConceptPreferredTerm(rel.destinationId, scope.branch).then(function (response) {
            rel.destinationName = response.term;
            scope.ctrlFn({arg: scope.concept.outboundRelationships.length});
            i++;
          });

          // if not an isa relationship, retrieve attribute type
          // TODO Factor this into the mountain of metadata
          if (rel.typeId !== '116680003') {
            snowowlService.getConceptPreferredTerm(rel.typeId, scope.branch).then(function(response) {
              rel.typeName = response.term;
            });
          }


        });

        scope.toggleRelationshipActive = function(relationship) {
          // no special handling required, simply toggle
          relationship.active = !relationship.active;
        };

        ////////////////////////////////
        // Shared Elements
        ////////////////////////////////

        // deactivation modal for reason s elect
        var selectInactivationReason = function (component, componentType, reasons) {

          var deferred = $q.defer();

          var modalInstance = $modal.open({
            templateUrl: 'shared/inactivate-component-modal/inactivateComponentModal.html',
            controller: 'inactivateComponentModalCtrl',
            resolve: {
              componentType: function () {
                return componentType;
              },
              reasons: function () {
                return reasons;
              }
            }
          });

          modalInstance.result.then(function (reason) {
            deferred.resolve(reason);
          }, function () {
            deferred.reject();
          });
          
          return deferred.promise;
        };
        
      }
    };
  })
;
