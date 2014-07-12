'use strict';

// Authentication service for user variables
angular.module('core').factory('systemDebug', [

	function() {
		var _this = this;

		_this._data = {
			msg: window.msg,
			status: function() {
				if(this.msg === undefined)
					return false;
				else
					return true;
			},
			addMsg: function(msg) {
				if(this.status())
					this.msg = this.msg + "\n\n"+ msg;
				else
					this.msg = msg;
			}
		};

		return _this._data;
	}
]);