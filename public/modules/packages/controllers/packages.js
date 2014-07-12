'use strict';

angular.module('packages').controller('PackageController', ['$scope', '$stateParams', 'Authentication', '$http',
    function($scope, $stateParams, Authentication, $http) {

        $scope.authentication = Authentication;

        $scope.showAllPackage = function() { //display YPackage
            $http.get('/getYPackages').success(function(data) {
                if(data.status == 0) {
                    $scope.status = false;
                    $scope.error_msg = data.error_msg;
                    console.log("Controller: Package[showAllPackages], error in database: " + data.error_msg);
                }
                else {
                    $scope.status = true;
                    if(data.pck_arr.length == 0)
                    {
                        $scope.no_pck = true;
                        console.log("Controller: Package[showAllPackages], no packages");
                    }
                    else
                    {
                        $scope.no_pck = false;
                        $scope.pck = data;
                        if($scope.pck.per_page === undefined)
                            $scope.pck.per_page = 3;
                        $scope.pages_count = Math.ceil($scope.pck.pck_count / $scope.pck.per_page);
                        $scope.pages = [];
                        for (var i = 0; i < $scope.pages_count; i++) {
                            $scope.pages.push({num:i+1});
                        };
                        console.log($scope.pages);
                        if($scope.pages_count > 1)
                            $scope.no_pages = true;
                    }
                }
            }).error(function(data) {
                console.log("YPackageController: DisplayYPackage failed. Error details: ", data);
            });
        }

        $scope.showPackage = function() {
            $http.get('/getYPckContents?ypckId='+$stateParams.packageId).success(function(data) {
                if(data.status == 0) {
                    $scope.status = false;
                    $scope.error_msg = data.error_msg;
                    console.log("Controller: Package[showPackage], error in database: ", data.error_msg);
                }
                else {
                    $scope.status = true;
                    $scope.package = data;
                    if($scope.package.yFormResponse == null)
                    {
                        $scope.package.yFormResponse = "YForm response[empty]";
                    }
                    if($scope.package.id == null)
                        $scope.package.id = $stateParams.packageId;
                    console.log("Controller: Package[showPackage], YPackage found: ", $scope.package);
                        
                }
                
            }).error(function(data) {
                console.log("Controller: Package[showPackage], recive selected YPackage [error on server side]: ",data);
            });
            $http.get('/getYPckFileDetails?ypckId='+$stateParams.packageId).success(function(data) {
                $scope.details = data;
                console.log("Controller: Package[showPackage], recive YPackage details: ",data);
            }).error(function(data) {
                console.log("Controller: Package[showPackage], recive YPackage details [error on server side]: ",data);
            });      
        }

        $scope.getDate = function(packageDate) {
            var date = new Date(packageDate);
            return date.toLocaleString();            
        }

        $scope.packageSizeString = function(size) {
            var KB = 1024;            
            if(size > KB*KB*KB)
            {
                size = Math.ceil(size/KB/KB/KB);
                return size + ' GB';
            }
            else if (size > KB*KB)
            {
                size = Math.ceil(size/KB/KB);
                return size + ' MB';
            }
            else if (size > KB)
            {
                size = Math.ceil(size/KB);
                return size + ' KB';
            }
            else
                return size + ' Byte';

        }

        $scope.changePage = function(page) {
            var num = page.num;
            $http.get('/getYPackages?page=' + num).success(function(data) {
                if(data.status == 0) {
                    $scope.status = false;
                    $scope.error_msg = data.error_msg;
                    console.log("Controller: File[showAllPackages], error in database: " + data.error_msg);
                }
                else {
                    $scope.status = true;
                    if(data.pck_arr.length == 0)
                        console.log("Controller: File[showAllPackages], no packages");
                    else
                    {
                        $scope.pck = data;
                        if($scope.pck.per_page === undefined)
                            $scope.pck.per_page = 5;
                        $scope.pages_count = Math.ceil($scope.pck.pck_count / $scope.pck.per_page);
                        $scope.pages = [];
                        for (var i = 0; i < $scope.pages_count; i++) {
                            $scope.pages.push({num:i+1});
                        };
                    }
                }
            }).error(function(data) {
                console.log("YPackageController: DisplayYPackage failed. Error details: ", data);
            });
        }


    }
]);