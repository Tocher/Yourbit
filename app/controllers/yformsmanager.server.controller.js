

var config = require('../../config/config').getConfig();
var ObjectID = require('mongodb').ObjectID;
var logger = require('../../libs/log')(module);
var YCustomer = require('../models/jugglingdb.server.model').YCustomer;
var YForm = require('../models/jugglingdb.server.model').YForm;

//auxiliary function to init form data in the DB
exports.initFormData = function(req, res, next) {
    //for cross-domain ajax-requests
    if (req.method === 'OPTIONS') {
        processOptionsReq(req, res);
    }
    else {

        if (req.method == 'GET') {

            //for cross-domain ajax-requests
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Headers:", "Origin, X-Requested-With, Content-Type, Accept");

            //get user (for now - ycustomer) id from session
            var userId = req.user.id;
			logger.info('***initFormData, userId = ' + userId);
			
            YForm.findOne({where: {createdBy: userId}}, function(err, userForm) {
                if (err) return next(err);
                if (userForm != null) {
 
					var myFormSchemaObj = {
									  "type": "object",
									  "title": "MAIN",
									  "properties": {
										"main_contact": {
										  "type": "object",
										  "title": "Contact",
										  "properties": {
											"email": {
											  "title": "Email address",
											  "type": "string",
											  "minLength": 3
											},
											"company": {
											  "title": "Company",
											  "type": "string"
											},
											"contact": {
											  "title": "Contact",
											  "type": "string"
											},
											"phone": {
											  "title": "Phone",
											  "type": "string"
											},
											"fax": {
											  "title": "Fax",
											  "type": "string"
											}
										  }
										},
										"selector": {
										  "title": "Choose value",
										  "type": "string",
										  "enum": [
											"test value 1",
											"test value 2",
											"test value 3",
											"test value 4"
										  ]
										},
										"project": {
										  "type": "object",
										  "title": "Project",
										  "properties": {
											"physical_addr": {
											  "title": "Physical Address",
											  "type": "string"
											},
											"bid_date": {
											  "title": "Bid Date",
											  "type": "string",
											  "format": "date"
											},
											"bid_time": {
											  "title": "Bid Time",
											  "type": "string",
											  "format": "date"
											},
											"pre_bid_meeting": {
											  "title": "Pre-bid Meeting",
											  "type": "string",
											  "format": "date"
											}
										  }
										},
										"inform": {
										  "title": "Additional Information",
										  "type": "string"
										}
									  }
									};
									
					userForm.formSchema = myFormSchemaObj;
					
					var myformJsonObj = ["main_contact", "project", {"key":"inform", "type":"textarea"}, {"key":"selector", "feedback":false}];
					userForm.formJson = myformJsonObj;
					
					
					logger.info('***initFormData, saving to DB...');
					
					userForm.save(function(err, userFormEntry) {
						if (err) return cb(err);

						logger.info('***initFormData, saved to DB = ' + JSON.stringify(userFormEntry));
					});

                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify(userForm));
			
                }
                else {
                    logger.error('***initFormData, not able to find a form for user ' + userId);
                    res.end('There are no forms for this user. Please, relogin');
                }
            });

        }
    }
}


exports.getFormSchema = function(req, res, next) {
    //for cross-domain ajax-requests
    if (req.method === 'OPTIONS') {
        processOptionsReq(req, res);
    }
    else {

        if (req.method == 'GET') {

            //for cross-domain ajax-requests
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Headers:", "Origin, X-Requested-With, Content-Type, Accept");

            //get user (for now - customer) id from session
            var userId = req.user.id;
			logger.info('***getFormSchema, userId = ' + userId);
			
            YForm.findOne({where: {createdBy: userId}}, function(err, userForm) {
                if (err) return next(err);
                if (userForm != null) {
					logger.info('***getFormSchema, FormSchema = ' + userForm.formSchema);
					
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify(userForm.formSchema));
                }
                else {
                    logger.error('***getFormSchema, not able to find a form for user ' + userId);
                    res.end('There are no forms for this user. Please, relogin');
                }
            });

        }
    }
};

exports.getFormJson = function(req, res, next) {
    //for cross-domain ajax-requests
    if (req.method === 'OPTIONS') {
        processOptionsReq(req, res);
    }
    else {

        if (req.method == 'GET') {

            //for cross-domain ajax-requests
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Headers:", "Origin, X-Requested-With, Content-Type, Accept");

            //get user (for now - customer) id from session
            var userId = req.user.id;
			logger.info('***getFormJson, userId = ' + userId);
			
			
            YForm.findOne({where: {createdBy: userId}}, function(err, userForm) {
                if (err) return next(err);
                if (userForm != null) {
					logger.info('***getFormJson, raw formJson = ' + userForm.formJson);
					
                    res.setHeader("Content-Type", "application/json");
					res.end(JSON.stringify(userForm.formJson));
                }
                else {
                    logger.error('***getFormJson, not able to find a form for user ' + userId);
                    res.end('There are no forms for this user. Please, relogin');
                }
            });
			
        }
    }
};


function processOptionsReq(req, res) {
    var headers = {};
    headers["Access-Control-Allow-Origin"] = "*";
    headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
    headers["Access-Control-Allow-Credentials"] = false;
    headers["Access-Control-Max-Age"] = '86400'; // 24 hours
    headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
    res.writeHead(200, headers);
    res.end();
};



