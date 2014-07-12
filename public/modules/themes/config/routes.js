'use strict';

// Setting up route
angular.module('themes').config(['$stateProvider',
	function($stateProvider) {
		// Articles state routing
		$stateProvider.
		state('homeThemes', {
			url: '/themes',
			templateUrl: 'modules/themes/views/home.html'
		});
	}
]);