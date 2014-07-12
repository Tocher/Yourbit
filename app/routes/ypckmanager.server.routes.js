'use strict';

var checkAuth = require('../../config/middleware/checkAuth');

module.exports = function(app) {
    var ypckmanager = require('../../app/controllers/ypckmanager');
    var yformsmanager = require('../../app/controllers/yformsmanager');   

    app.route('/initFormData').get(yformsmanager.initFormData);
	
    app.route('/getFormSchema').get(yformsmanager.getFormSchema);
    app.route('/getFormJson').get(yformsmanager.getFormJson);

    app.route('/getYPackages').get(checkAuth, ypckmanager.getYPackages);
	
	app.route('/downloadYPackage').get(checkAuth, ypckmanager.downloadYPackage);
    //app.route('/deleteYPackage').get(checkAuth, ypckmanager.deleteYPackage);
    app.route('/getYPckContents').get(checkAuth, ypckmanager.getYPckContents);
	app.route('/getYPckFileDetails').get(checkAuth, ypckmanager.getYPckFileDetails);

    app.route('/uploadFileToYPackage').post(checkAuth, ypckmanager.uploadFileToYPackage);
	app.route('/finalizeYPackage').post(checkAuth, ypckmanager.finalizeYPackage);

    app.route('/uploadFileToYPackageTestFailure').post(checkAuth, ypckmanager.uploadFileToYPackageTestFailure);

};