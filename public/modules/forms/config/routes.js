'use strict';

// Setting up route
angular.module('forms').config(['$stateProvider',
	function($stateProvider) {
		// Articles state routing
		$stateProvider.
		state('homeForms', {
			url: '/forms',
			templateUrl: 'modules/forms/views/home.html'
		}).
		state('newForm', {
			url: '/form/new',
			templateUrl: 'modules/forms/views/new.html'
		}).
		state('itemForm', {
			url: '/form/:formId',
			templateUrl: 'modules/forms/views/item.html'
		});
	}
]);