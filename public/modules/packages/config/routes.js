'use strict';

// Setting up route
angular.module('packages').config(['$stateProvider',
	function($stateProvider) {
		// Articles state routing
		$stateProvider.
		state('homePackage', {
			url: '/packages',
			templateUrl: 'modules/packages/views/home.html'
		}).
		state('itemPackage', {
			url: '/packages/:packageId',
			templateUrl: 'modules/packages/views/item.html'
		});
	}
]);