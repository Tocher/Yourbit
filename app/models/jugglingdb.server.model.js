'use strict';

/*
 * https://github.com/1602/jugglingdb
 * */
var config = require('../../config/config').getConfig();
var Schema = require('jugglingdb').Schema;
var schema = new Schema('mongodb', {port: config.get('jugglingdbPort'), database: config.get('jugglingdbDatabase')});
var crypto = require('crypto');
var ObjectID = require('mongodb').ObjectID;


// define YUser model
//Serge David -- this should be renamed to YUser
var YCustomer = schema.define('ycustomers', {
    username: {
        type: String
    },
    password: {
        type: String
    },
    email:    {
        type: String
    },
    firstName: {
        type: String
    },
    lastName: {
        type: String
    },
	//user's type (i.e. customer)
    type: {
        type: String
    },
	//when user was created
	creation_dt: {
		type: Date,
		default: function () { return new Date(); }
	},
	//when user was updated
	update_dt: {
		type: Date,
		default: function () { return new Date(); }
	}
	
});

// define YPackage model
var YPackage = schema.define('ypackages', {
    //when it was created
    creationDate: {
        type: Date,
        default: function () { return new Date(); }
    },
    expirationDate: {
        type: Date,
        default: function () { return new Date(); }
    },
    //Path on the harddrive where the package is stored
    path: {
        type: String
    },
    //package size in bytes
    size: {
        type: Number
    },
    //whom this package belongs to (user who uploaded this data)
    yCustomerId: {
        type: ObjectID
    },
	//YForm that resulted in YPackage creation
    yFormId: {
        type: ObjectID
    },
	//form fields values in JSON format
    yFormResponse: {
        type: String
    }
});

// define YPck_details model
//Serge David -- this should be renamed to YPck_File_details
var YPck_details = schema.define('ypck_details', {
    //file name
    name: {
        type: String
    },
    //file size
    size: {
        type: Number
    },
    //package file belongs to
    pck_id: {
        type: ObjectID
    }
});

//define YForm model
var YForm = schema.define('yforms', {
	//form definition
    formJson: {
        type: Object
    },
	//form definition
    formSchema: {
        type: Object
    },
    createdBy: {
        type: ObjectID
    },
    creationDate: {
        type: Date,
		default: function () { return new Date(); }
    },
    updateDate: {
        type: Date,
		default: function () { return new Date(); }
    }
});

//set up relationships between models
YCustomer.hasMany(YPackage, {as: 'ypackages',  foreignKey: 'yCustomerId'});
YPackage.belongsTo(YCustomer, {as: 'ycustomer', foreignKey: 'yCustomerId'});

YPackage.hasMany(YPck_details, {as: 'ypck_details',  foreignKey: 'pck_id'});
YPck_details.belongsTo(YPackage, {as: 'ypackage', foreignKey: 'pck_id'});

YCustomer.hasMany(YForm, {as: 'yforms',  foreignKey: 'created_by'});
YForm.belongsTo(YCustomer, {as: 'ycustomer', foreignKey: 'created_by'});

YForm.hasMany(YPackage, {as: 'ypackages',  foreignKey: 'yFormId'});
YPackage.belongsTo(YForm, {as: 'yform', foreignKey: 'yFormId'});


YCustomer.authenticate = function(username, password, done) {

	console.log('*****YCustomer.authenticate (user, pwd)***** ' + username + ', ' + password);

    YCustomer.findOne({where: {username: username}}, function(err, user) {
        if (err) 
			return done(err);
		
		if (!user) {
			console.log('*****Incorrect username***** ' + username);
			return done(null, false, { message: 'Incorrect username.' });
		}
		
		//get PWD hash -- 
		
		var iterations = config.get('pbkdf2_iterations');
		var keylen = config.get('pbkdf2_keylen');
		var salt = config.get('pbkdf2_salt');
		
		var resultKey = crypto.pbkdf2Sync(password, salt, iterations, keylen);
		console.log('*****Got HashKey *****' + resultKey);
		console.log('*****user.password *****' + user.password);
		
		if (user.password != resultKey)
		{
			console.log('*****Incorrect password for user ' + username);
			return done(null, false, { message: 'Incorrect password.' });
		}		
        return done(null, user);
    });
}


exports.YCustomer = YCustomer;
exports.YPackage = YPackage;
exports.YPck_details = YPck_details;
exports.YForm = YForm;