'use strict';


angular.module('core').controller('HomeController', ['$scope', 'Authentication', 'schemaForm', '$http', '$fileUploader',
    function($scope, Authentication, schemaForm, $http, $fileUploader) {
        // This provides Authentication context.
        $scope.authentication = Authentication;
        $scope.uploadSuccess = false;

        // if user authorized, generate form and upload button
        if($scope.authentication.user) {
        // Generate Form
            $scope.packageData = { };

                $http.get('/getFormJson').success(function(data) {
                    console.log("Controller: Home, recive YFormJson: success");
                    $scope.form = data;
                    $scope.formJson   = JSON.stringify($scope.form,undefined,2);          

                    $http.get('/getFormSchema').success(function(data) {
                        console.log("Controller: Home, recive YFormSchema: success");
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
                        console.log("Controller: Home, recive YFormSchema: error",data);
                    });

                }).error(function(data) {
                    console.log("Controller: Home, recive YFormJson: error",data);
                });

            // Progress bar
            // create a uploader with options 
            $scope.packageId = $scope.authentication.user.id + Math.floor((Math.random()*60000)+1); // generate random packageId for upload session
			
			console.log('Maxim -- $scope.authentication.user._id = ', $scope.authentication.user.id);
			console.log('Maxim -- $scope.packageId = ', $scope.packageId);
			
			$scope.packageId = Math.floor((Math.random()*60000)+1);
			console.log('Maxim -- $scope.packageId = ', $scope.packageId);
            
            var uploader = $scope.uploader = $fileUploader.create({
                scope: $scope,                          
                url: 'uploadFileToYPackage',
                headers : {
                    //'pck_complete' : false,
                    'pck_id' : $scope.packageId
                }
            });

            // initialize progress bar and packages
            uploader.progress = 0;
            $scope.packages = [];
            $scope.debug = [];
            $scope.addToDebug = function (string) {
                $scope.debug.push({id:new Date().getTime(),msg:string});
            }


            // REGISTER HANDLERS
            uploader.bind('afteraddingfile', function (event, item) {
                console.info('After adding a file', item);
                if($scope.packages.length > 0)
                {
                    for (var i = $scope.packages.length - 1; i >= 0; i--) {
                        console.log($scope.packages[i].file.name + " " + item.file.name);                    
                        if($scope.packages[i].file.name != item.file.name)
                        {
                            $scope.packages.push(item);
                            $scope.addToDebug("added to upload queue " + item.file.name);
                        }
                        else
                        {
                            uploader.removeFromQueue(item);
                            console.log("File already in queue");
                            $scope.addToDebug("File already in queue " + item.file.name);
                        }
                    }    
                }
                else
                {
                    $scope.packages.push(item);
                    $scope.addToDebug("added to upload queue " + item.file.name);
                }
            });

            uploader.bind('whenaddingfilefailed', function (event, item) {
                console.info('When adding a file failed', item);
            });

            uploader.bind('afteraddingall', function (event, items) {
                console.info('After adding all files', items);
            });

            uploader.bind('beforeupload', function (event, item) {
                console.info('Before upload', item);
            });

            uploader.bind('progress', function (event, item, progress) {
                console.info('Progress: ' + progress, item);
            });

            uploader.bind('success', function (event, xhr, item, response) {
                //console.info('Success', xhr, item, response);
                console.info('Success');
                $scope.addToDebug("uploaded to the server " + item.file.name);
            });

            uploader.bind('cancel', function (event, xhr, item) {
                console.info('Cancel', xhr, item);
            });

            uploader.bind('error', function (event, xhr, item, response) {
                console.info('Error', xhr, item, response);
            });

            uploader.bind('complete', function (event, xhr, item, response) {
                //console.info('Complete', xhr, item, response);
                console.info('Complete');
            });

            uploader.bind('progressall', function (event, progress) {
                console.info('Total progress: ' + progress);
            });

            uploader.bind('completeall', function (event, items) {
                console.info('Complete all', items);            
                // yFormId hardcode
                var yFormId = '53b827903991cf0c674c7a2a';
                var yFormResponse = $scope.packageData;                
                var data = {
                    'yform_id':yFormId,
                    'yform_response':angular.toJson(yFormResponse),
                    //'pck_complete':true,
                    'pck_id':$scope.packageId
                };
                console.info('Complete all -- yform_id', yFormId);  
                console.info('Complete all -- yFormResponse', angular.toJson(yFormResponse));    
                
                $http({method: 'POST', url: '/finalizeYPackage', headers: data}).success(function() {    
                    $scope.clearQueue();                
                    $scope.addToDebug("Your upload is complete");
                    $scope.uploadSuccess = true;
                }).error(function(data) {
                    $scope.clearQueue();
                    $scope.addToDebug("Error on server side. File not uploaded");
                });
                uploader.clearQueue();
            });

            $scope.fillData1 = function() {
                $scope.packageData.main_contact = new Object();
                $scope.packageData.main_contact.email = "johndoe@gmail.com";
                $scope.packageData.main_contact.company = "Yourbit company";
                $scope.packageData.main_contact.contact = "John Doe";
                $scope.packageData.main_contact.phone = "+735 222 98 25";
                $scope.packageData.main_contact.fax = "2220041";
                $scope.packageData.project = new Object();
                $scope.packageData.project.physical_addr = "wall street 112";
                $scope.packageData.project.bid_date = "17/02/14";
                $scope.packageData.project.bid_time = "17:38";
                $scope.packageData.project.pre_bid_meeting = "01/03/14";

                $scope.packageData.inform = "additional information string";
                $scope.packageData.selector = 'test value 1';
                
                console.log($scope.packageData);
            };

            $scope.testError1 = function() {
                var data = {'failure1':true};
                $http({method: 'POST', url: '/uploadFileToYPackageTestFailure', headers: data}).success(function(data) {                    
                    $scope.addToDebug("testError1:" + data);
                }).error(function(data) {
                    $scope.addToDebug("Error on server side. testError1 failed");
                });
            }

            $scope.testError2 = function() {
                var data = {'failure2':true};
                $http({method: 'POST', url: '/uploadFileToYPackageTestFailure', headers: data}).success(function(data) {                    
                    $scope.addToDebug("testError2:" + data);
                }).error(function(data) {
                    $scope.addToDebug("Error on server side. testError1 failed");
                });
            }

            $scope.clearQueue = function() {
                uploader.clearQueue();
                $scope.packages = [];
                $scope.debug = [];                
            }

        }

    }
]);