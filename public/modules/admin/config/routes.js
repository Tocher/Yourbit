'use strict';

// Setting up route
angular.module('admin').config(['$stateProvider',
	function($stateProvider) {
		// Articles state routing
		$stateProvider.
		state('homeAdmin', {
			url: '/admin',
			templateUrl: 'modules/admin/views/home.html'
		});
	}
]);