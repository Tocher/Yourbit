'use strict';

var formidable = require('formidable');
var config = require('../../config/config').getConfig();
var util = require('util');
var path = require('path');
var fs = require('fs');
var archiver = require('archiver');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');
var async = require('async');
var sendgrid  = require('sendgrid')(config.get('sendgrid_user'), config.get('sendgrid_password'));
var url = require('url');
var logger = require('../../libs/log')(module);
var mongodb = require('mongodb');
var HttpError = require('../../config/error').HttpError;


var YCustomer = require('../models/jugglingdb.server.model').YCustomer;
var YPackage = require('../models/jugglingdb.server.model').YPackage;
var YPck_details = require('../models/jugglingdb.server.model').YPck_details;
var ObjectID = require('mongodb').ObjectID;


var pck_uploadDir;          //All files for current package will be stored into this folder
var arr_YPck_details = [];  //Array of file definitions (name, size, archiveID) (files that belong to current package)


//Main method called from GUI 
//Angular FileUpload sends multiple files (each file per HTTP request)
//req.headers.pck_id -- unique package ID
//req.headers.pck_complete -- flag that notifies that all package files have been sent and we should process them (archive and store info in the db)

exports.uploadFileToYPackage = function(req, res, next) {

    if (req.method.toLowerCase() == 'post') {

            if (req.headers.pck_id != null) {
       
                    logger.info('***uploadFileToYPackage pck_id = ' + req.headers.pck_id);
					
                    var userId = GetUserID(req);
                    pck_uploadDir = path.join(config.get('uploadDir'), userId);

                    logger.info('*** uploadFileToYPackage - uploading file to ' + pck_uploadDir);
                    
                    //create (do nothing if already exists) a temp folder for this package (all package files will be stored there)
                    mkdirp(pck_uploadDir, function(err) {
                        if (err) 
						{
							logger.error('***ERROR*** uploadFileToYPackage --- unable to create upload directory ');
							return next(err);
						}
                    });

                        //just store file into the folder
                        processUploadingFile(req, res, function(err) {
                            if (err) return next(err);
                        }); 
            }
            else {
				//
                 logger.error('***ERROR*** uploadFileToYPackage --- pck_id not defined');
				 res.end('YUpload failed -- package id not defined');
            }
    }
};


//Package has been transferred, time to archive files and store info to the DB
exports.finalizeYPackage = function(req, res, next) {
	
	if (req.method.toLowerCase() == 'post') {
	   if (req.headers.pck_id != null) {
			logger.info('***finalizeYPackage pck_id = ' + req.headers.pck_id);
			logger.info('***finalizeYPackage yform_id = ' + req.headers.yform_id);
			logger.info('***finalizeYPackage yform_response = ' + req.headers.yform_response);
			
			//logger.info('***finalizeYPackage req.headers = ' + JSON.stringify(req.headers));
			

				//all files uploaded, create YPackage and save to DB
				
				dofinalizeYPackage(req, res, function(err) {
					if (err) return next(err);
					/*sendEmail(req, function(err, result) {
						if (err) return next(err);
					});*/
					
				res.end(JSON.stringify({
					message: 'YPackage finalized'
				}));
					logger.info('***finalizeYPackage - Email notification has been sent');
				});  
             
		}
		else {
		//
		 logger.error('***ERROR*** finalizeYPackage --- pck_id not defined');
		 res.end('finalizeYPackage failed -- package id not defined');
		}
	
	}
}


function dofinalizeYPackage(req, res, cb) {

    console.log('finalizing YPackage ' + req.headers.pck_id);

    //generate archive path
    var archiveName = GetUserID(req) + Date.now().toString() + '.zip';
    console.log('archive name: ' + archiveName);

    var archiveFilePath = path.join(config.get('uploadDir'), archiveName);
    
    var archiveStream = fs.createWriteStream(archiveFilePath);
    var archive = archiver('zip');

    archiveStream.on('close', function () {
        console.log(archive.pointer() + ' total bytes');
        console.log('archiver has been finalized and the output file descriptor has been closed.');

		//Time to create new YPackage and save to DB
        savePackageToDB(archiveFilePath, req, res, function (err) {
            //remove uploads directory
            rimraf(pck_uploadDir, function (err) {
                console.log('directory deleted');
                if (err) return cb(err);
                arr_YPck_details = [];
                return cb(null, archiveFilePath);
            });     
        });   
    });

    archive.on('error', function(err){
        next(err);
    });

    archive.pipe(archiveStream);
    archive.bulk([
        { expand: true, cwd: pck_uploadDir, src: ['**']}
    ]);
    archive.finalize();

};


//use 3rd party functionality for file upload
function processUploadingFile(req, res, cb) {
    logger.info('***processUploadingFile pck_id = ' + req.headers.pck_id);
    // parse a file uploads
    var form = new formidable.IncomingForm();

    form.keepExtensions = true;
    form.encoding = 'utf-8';
    
    form.uploadDir = pck_uploadDir;

    logger.info('***processUploadingFile, uploading to ' + pck_uploadDir);
    form.on('file', function(field, file) {
        //Single file upload complete
        //rename file saved by formidable to the original file name
        fs.rename(file.path, form.uploadDir + path.sep + file.name);
        
        var curYPck_details = new YPck_details();
        
        curYPck_details.name = file.name;
        curYPck_details.size = file.size;
        //don't have id because package has not been created yet
        
        arr_YPck_details.push(curYPck_details);
    });

    form.on('progress', function(bytesReceived, bytesExpected) {
        console.log('Uploading progress' + (bytesReceived / bytesExpected) * 100 + '%' );
    });

    form.on('error', function(err) {
		logger.error('***processUploadingFile pck_id = ' + req.headers.pck_id + ' details of error occured - ' + err);
        return cb(err);
    });

    form.on('end', function() {
		logger.info('***processUploadingFile pck_id = ' + req.headers.pck_id + ' file uploaded');

        res.end(JSON.stringify({
            message: 'file_uploaded'
        }));
    });

    form.parse(req, function(err, fields, files) {
        if (err) return cb(err);
    });

};


//we already archived our package, now we store pck and its details to the DB
function savePackageToDB(archiveFilePath, req, res, cb) {
    
    var curPackage = new YPackage();

    //where it's stored on the drive
    curPackage.path = archiveFilePath;
    //set the uploading date
    curPackage.creationDate = new Date();
    //set the expiration date
	var now = new Date();
    var expirationPeriod = config.get('expirationPeriod');
    if (expirationPeriod <= 0) {
        logger.error('***savePackageToDB -- expirationPeriod is not valid (< 0)');
        return cb(new HttpError(500, 'expirationPeriod is not valid (< 0)'));
    }
	var expirationDate = now.setDate(now.getDate() + expirationPeriod);
    curPackage.expirationDate = expirationDate;

    //whom this package belongs to
    curPackage.yCustomerId = new ObjectID(req.session.user.toString());	
	
	if (req.headers.yform_id != null)
	{
		logger.info('***savePackageToDB -- yform_id = ' + req.headers.yform_id);
		curPackage.yFormId = new ObjectID (req.headers.yform_id);
	}	
	else
		logger.error('**ERROR**savePackageToDB -- yform_id is null');
	
	
	logger.info('***savePackageToDB -- checking yFormResponse...');
	if (req.headers.yform_response != null)
	{
		logger.info('***savePackageToDB -- yFormResponse = ' + JSON.stringify(req.headers.yform_response));
		
		var myFR = {};
		myFR = req.headers.yform_response;
		logger.info('***savePackageToDB -- myFR...' + JSON.stringify(req.headers.yform_response));
		
		curPackage.yFormResponse = req.headers.yform_response;
	}
	else
		logger.error('**ERROR**savePackageToDB -- yform_response is null');


    fs.stat(archiveFilePath, function(err, stats) {
        if (err) return cb(err);
       
        curPackage.size = stats["size"];

        //save entity to DB
        curPackage.save(function(err, YPackageEntry) {
            if (err) return cb(err);

            for (var i = 0; i < arr_YPck_details.length; i++) {
            
                //assign package id to each details entry and save to the DB
                arr_YPck_details[i].pck_id = new ObjectID(YPackageEntry.id.toString());          
                
                arr_YPck_details[i].save(function(err, YPck_details_Entry) {
                    if (err) return cb(err);
                    logger.info('YPck_details_Entry name: ' + YPck_details_Entry.name);
                });
            }
           
            return cb();
            
        });
    });
};


//return a list of YPackages that belong to this user
exports.getYPackages = function(req, res, next) {
    logger.info('***getYPackages for user '  + req.session.user);
    var response = {
        'status':'',
        'error_msg':'',
		'pck_count':'',
        'pck_arr':'',
		'per_page':''
    };
	

	var pageSize = config.get('pcklist_page_size');
	var curPage = 1;
	
	if (req.headers.page != null)
	{
		logger.info('***getYPackages -- page' + req.headers.page);
		curPage = req.headers.page;
	}	
	else
		logger.info('***getYPackages -- page not specified');


    YPackage.all({/*limit: pageSize, offset: (curPage - 1) * pageSize,*/ where: {yCustomerId: req.session.user}}, function(err, packages) {
        if (err) { return next(err); }
        response.status = 1;
		
		var outpckArr = [];
		
		 for (var i = 0; i < packages.length; i++)
		 {
			//return just the info required for the client (i.e. don't return form response)
			var curPck = {};
			 //logger.info("PCK_I = " + JSON.stringify(packages[i]));
			 
			curPck.id = packages[i].id;
			
			curPck.path = packages[i].path;
			curPck.size = packages[i].size;
			curPck.creationDate = packages[i].creationDate;
			curPck.expirationDate = packages[i].expirationDate;
			
			outpckArr.push(curPck);
        }
		
        response.pck_arr = outpckArr;
		response.pck_count = packages.length;
		response.per_page = pageSize;
		
        res.end(JSON.stringify(response));
    });
};

//return JSON of YPackage data
exports.getYPckContents = function(req, res, next) {
    var parsedUrl = url.parse(req.url, true);
    
    if (parsedUrl.query.ypckId != null && parsedUrl.query.ypckId != '') {
        var YPck_Id = parsedUrl.query.ypckId;
		
		logger.info("***getYPckContents -- Trying to get YPackage for id = " + YPck_Id);
		var pckContents = {};
		
		YPackage.find(YPck_Id, function(err, FoundYPackage) {
            if (err) return next(err);
			
			pckContents.size = FoundYPackage.size;
			pckContents.path = FoundYPackage.path;
			pckContents.expirationDate = FoundYPackage.expirationDate;
			pckContents.creationDate = FoundYPackage.creationDate;
			pckContents.yFormResponse = FoundYPackage.yFormResponse;
			
			logger.info("***getYPckContents -- pckContents = " + JSON.stringify(pckContents));
			
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(pckContents));
        });
    }
    else {
			logger.error("***getYPckContents -- Empty ypckId parameter");
            res.end('Empty ypckId parameter');
    }
};


//return JSON of files uploaded into YPackage
exports.getYPckFileDetails = function(req, res, next) {
    var parsedUrl = url.parse(req.url, true);
    
    if (parsedUrl.query.ypckId != null && parsedUrl.query.ypckId != '') {
        var YPck_Id = parsedUrl.query.ypckId;
		
		logger.info("***getYPckFileDetails -- Trying to get YPck_details for id = " + YPck_Id);
		
		YPck_details.all( {where: {pck_id: new ObjectID(YPck_Id)}}, function(err, arr_YPck_details) {
            if (err) return next(err);
			
			logger.info("***getYPckFileDetails -- arr_YPck_details = " + JSON.stringify(arr_YPck_details));
			
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(arr_YPck_details));
        });
    }
    else {
			logger.error("***getYPckFileDetails -- Empty ypckId parameter ");
            res.end('Empty ypckId parameter');
    }
};



//do not work for now
//delete YPackage request 
/*
exports.deleteYPackage = function(req, res, next) {
    var parsedUrl = url.parse(req.url, true);
		
    if (parsedUrl.query.ypckId != null && parsedUrl.query.ypckId != '') {
        var ypckId = parsedUrl.query.ypckId;
		console.log('***deleteYPackage -- ypckId is ' + ypckId);
		
        YPackage.findById(ypckId, function(err, result) {
            if (err) return next(err);

            var fileName = result.path;
            YPackage.findByIdAndRemove(ypckId, function(err) {
                if (err) return next(err);
				
                console.log('***deleteYPackage --YPackage info (id = ' + ypckId + ') has been removed from db');


                YPck_details.find({pck_id: ypckId}).remove(function(err) {
                    if (err) return next(err);
                    
                });

                deleteFileFromDisk(fileName, function(err, result) {
                    if (err) return next(err);
                    console.log('***deleteYPackage -- file ' + fileName + 'successfully deleted from disk');
                    res.redirect('/getYPackages');
                });

            });
        });

    }
    else {
        res.end('Error deleting YPackage. Empty ypckId parameter');
    }
};
*/


//download YPackage request 
exports.downloadYPackage = function(req, res, next) {
    var parsedUrl = url.parse(req.url, true);
    if (parsedUrl.query.ypckId != null && parsedUrl.query.ypckId != '') {
        var ypckId = parsedUrl.query.ypckId;
		
		logger.info('***downloadYPackage -- ypckId is ' + ypckId);
		
        YPackage.find(ypckId, function(err, curYPackage) {
            if (err) return next(err);
			
			logger.info('***downloadYPackage -- YPackage file is here ' + curYPackage.path);			
			res.download(curYPackage.path);
        });

    }
    else {
	   logger.error('***downloadYPackage -- ypckId is not set ');
       res.end('Error downloading YPackage. Empty ypckId parameter');
    }
};


exports.uploadFileToYPackageTestFailure = function(req, res, next) {
    if (req.method.toLowerCase() == 'post') {

            if (req.headers.failure1 != null) {

                res.write('failure1');
                return next(new HttpError(500, 'Upload failure'));

            }
            else {
                res.write('failure2');
                return next(new HttpError(500, 'Upload failure'));
            }
    }
};

function sendEmail(req, cb) {
    YCustomer.find(req.session.user.id, function(err, result) {
        if (err) return next(err);

        sendgrid.send({
            to:        result.email,
            from:     'team@yourbit.com',
            subject:  'Yourbit',
            text:     'Some text'
        }, cb);
    });
};


function deleteFileFromDisk(fileName, cb) {
    fs.unlink(fileName, cb);
};


function GetUserID(req) {
	return req.session.user.toString();
}
