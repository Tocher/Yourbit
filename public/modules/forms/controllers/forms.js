'use strict';

angular.module('forms').controller('FormController', ['$scope', '$stateParams', 'schemaForm', '$http', 
    function($scope, $stateParams, schemaForm, $http) {

    	$scope.showAllForms = function() {
    		var form;

            $http.get('/getFormJson').success(function(data) {
                form = data;            

		        $http.get('/getFormSchema').success(function(data) {
		            $scope.formStruct = {'_id':1,'form':form,'schema':data};
		    		$scope.forms = [
		    			$scope.formStruct
		    		];
		    		console.log($scope.forms);

	    		}).error(function(data) {
	                console.log(data);
	            });

    		}).error(function(data) {
                console.log(data);
            });
        }

        $scope.showForm = function() {

    		$scope.person = { favorite: 'NaN' };

            $http.get('/getFormJson').success(function(data) {
                $scope.form = data;
		  		$scope.formJson   = JSON.stringify($scope.form,undefined,2);          

		        $http.get('/getFormSchema').success(function(data) {
		            $scope.schema = data;
		  			$scope.schemaJson = JSON.stringify($scope.schema,undefined,2);		            

		            $scope.formData = {'_id':1,'form':$scope.form,'schema':$scope.schema};

		    		$scope.decorator = 'bootstrap-decorator';

					  $scope.itParses     = true;
					  $scope.itParsesForm = true;
					 
					  $scope.$watch('schemaJson',function(val,old){
					    if (val && val !== old) {
					      try {
					        $scope.schema = JSON.parse($scope.schemaJson);
					        $scope.itParses = true;
					      } catch (e){
					        $scope.itParses = false;
					      }
					    }
					  });

					  $scope.$watch('formJson',function(val,old){
					    if (val && val !== old) {
					      try {
					        $scope.form = JSON.parse($scope.formJson);
					        $scope.itParsesForm = true;
					      } catch (e){
					        $scope.itParsesForm = false;
					      }
					    }
					  });

					  $scope.pretty = function(){
					    return JSON.stringify($scope.person,undefined,2,2);
					  };

	    		}).error(function(data) {
	                console.log(data);
	            });

    		}).error(function(data) {
                console.log(data);
            });

        }

        $scope.saveForm = function() {
        	$http.post('/saveSchema', $scope.schema).success(function(data) {

        	}).error(function(data) {
                console.log(data);
            });
            $http.post('/saveForm', $scope.form).success(function(data) {

        	}).error(function(data) {
                console.log(data);
            });
        }
    }
]);