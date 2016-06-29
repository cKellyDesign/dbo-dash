var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var nodemailer = require('nodemailer');
var xoauth2 = require('xoauth2');
var _ = require('underscore');
// var csv = require('csv-stream');
var path = require('path');
// var multer = require('multer');

// var upload = multer({
// 	dest: './uploads'
// });

var app = express();

app.use('/uploads', express.static(path.join(__dirname, './uploads')));
app.use('/css', express.static(path.join(__dirname, './css')));
app.use('/js', express.static(path.join(__dirname, './js')));
app.use('/gfx', express.static(path.join(__dirname, './gfx')));

var onaAPIbase = 'https://' + process.env.ONAUSER + ':' + process.env.ONAPASS + '@api.ona.io/api/v1';


// ROUTES

app.get('/', function (req, res){
	res.sendFile(path.join(__dirname, './index.html'));
});

app.get('/listforms', function (req, res) {
	var urlStr = onaAPIbase + '/projects?owner=kidogo_early_years';
	request(urlStr, function (error, response, body) {
		if (error) {
			res.send(error);
			return;
		}

		var data = JSON.parse(body);
		var project = _.findWhere(data, {name: "Kidogo Forms"});

		var htmlStr = '<ul id="form-list">';
		for (var i=0; i<project.forms.length; i++) {
			htmlStr += '<li><a class="load-submissions" href="/form/' + project.forms[i].formid + '">' + project.forms[i].name + '</a>' +
								 ' <a href="https://ona.io/kidogo_early_years/16634/' + project.forms[i].formid + '#/saved-charts" target="_blank"><small>(dashboard)</small></li>';
		}
		htmlStr += '</ul>';

		res.send(htmlStr);
	});
});

app.get('/stats/:formID', function (req, res) {
	var url = onaAPIbase + '/stats/' + req.params.formID;
	request(url, function (error, response, body) {
		res.send(body);
	});
});

app.get('/submission/:formID/:subID', function (req, res) {
	var formID = req.params.formID,
			subID = req.params.subID;
	request(onaAPIbase + '/data/' + formID + '/' + subID, function (error, response, body){
		res.send(body);
	});
});


app.post('/update/:formID/:subID', bodyParser.urlencoded({ extended: false }), function (req, res) {
	var formID = req.params.formID,
			subID = req.params.subID,
			data = req.body,
			body = {'id': formID, 'submission': data };
	// console.log(body);
	// res.send(data)
	// request(onaAPIbase + '/data/' + formID + '/' + subID, function (error, response, body){

	// });
	request({
		url: onaAPIbase + '/submissions',
		method: "POST",
		body: body,
		json: true,
		headers: { 'content-type': 'application/json' }
	}, function (error, response, body) {
		console.log(body);
		res.send(response);
	});
});

app.get('/form/:formID', function (req, res){
	var formID = req.params.formID;
	request(onaAPIbase + '/data/' + formID , function (error, response, body) {
		var htmlStr = parseFormData(body, formID);
		var respData = {
			'count': JSON.parse(body).length,
			'html' : htmlStr,
			'data' : JSON.parse(body)
		};
		res.send(respData);
	});
});

app.get('/edit-submission/:formID/:subID', function (req, res) {
	var formID = req.params.formID,
			subID = req.params.subID;
			reqURL = onaAPIbase + '/data/' + formID + '/' + subID + '/enketo?return_url=url';
		
	request(reqURL, function (error, response, body) {
		var url = JSON.parse(body).url;

		var returnStr = '<html><head></head><body><script>window.location.href="' + url + '"</script></body></html>';
		res.send(returnStr);
	});
});

app.use('/formHook', bodyParser.json(), function (req, res) {
	var transporter = nodemailer.createTransport({
		service: 'gmail',
		auth: {
			xoauth2: xoauth2.createXOAuth2Generator({
				user: process.env.USER,
				clientId: process.env.CLIENTID,
				clientSecret: process.env.CLIENTSECRET,
				refreshToken: process.env.REFRESHTOKEN,
				accessToken: process.env.ACCESSTOKEN
			})
		}
	});
	var toStr = 'conor.kidogo@gmail.com' + (req.body._xform_id_string === 'pilot_feedback' ? '' : ',sheela@kidogo.co');
	
	var htmlStr = parseFormSubmission(req.body),
			mailOptions = {
				from: 'conor.kidogo@gmail.com',
				to: toStr,
				subject: '[Form Submission] ' + req.body._xform_id_string.replace(/_/g, ' ').toTitleCase(),
				html: htmlStr
	};

	transporter.sendMail(mailOptions, function (err, info) {
		if (err) {
			console.log('sendMail Err -', err);
			// res.json({ yo: 'error' });
		} else {
			console.log('mail sent -', info.response);
			// res.json({ yo: info.response });
		}
	});

});




// UTILS

app.use(allowCrossDomain);
function allowCrossDomain (req, res, next) {
		req.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Origin', '*');
    req.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    req.header('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Allow-Origin, Access-Control-Allow-Headers');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Allow-Origin, Access-Control-Allow-Headers');
    // res.header('')
    next();
}

function parseFormSubmission (data) {
	var formName = data._xform_id_string.replace(/_/g, " ").toTitleCase();
	var str = '<h2 style="text-transform:capitalize;">' + formName + ' submission </h2><br><ul style="list-style:none;">';
	var thisProp = '';

	for (var prop in data) {
		if (prop[0] !== "_" && prop !== "meta/instanceID" && prop !== "formhub/uuid") {

			thisProp = prop.replace(/\//g, ' / ').replace(/_/g, ' ').toTitleCase();

			str = str + '<li><p><span style="font-weight:bold">' + thisProp + "</span><br>" + data[prop] + "<br></p></li>";
		}
	}

	str = str + '</ul>';
	return str;
}

function parseFormData (dataStr, formID) {
	// var formName = data._xform_id_string.replace(/_/g, " ").toTitleCase();
	var formData = JSON.parse(dataStr);
	var str = '<ul style="list-style:none;">';
	var thisProp = '';
	var data = null;
	for (var i = 0; i < formData.length; i++) {
		data = formData[i];
		str = str + '<h2>' + data._submitted_by + ' <small>(' + data._submission_time + ') - ' + 
					'<a href="/edit-submission/' + formID + '/' + data._id + '" target="_blank">edit</a></small></h2>';
		for (var prop in data) {
			if (prop[0] !== "_" && prop !== "meta/instanceID" && prop !== "formhub/uuid") {

				thisProp = prop.replace(/\//g, ' / ').replace(/_/g, ' ').toTitleCase();

				str = str + '<li style="margin-left:25px;"><p><span style="font-weight:bold">' + thisProp + "</span><br>" + data[prop] + "<br></p></li>";
			}
		}
	}

	str = str + '</ul>';
	return str;
}

String.prototype.toTitleCase = function () {
	return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

app.listen(process.env.PORT || 9000, function(){
	console.log('App running on port 9000');
});

// app.use('/email-test', bodyParser.urlencoded({ extended: false }), function (req, res) {
// 	console.log('body :', req.body);

// 	var transporter = nodemailer.createTransport({
// 		service: 'gmail',
// 		auth: {
// 			xoauth2: xoauth2.createXOAuth2Generator({
// 				user: process.env.USER,
// 				clientId: process.env.CLIENTID,
// 				clientSecret: process.env.CLIENTSECRET,
// 				refreshToken: process.env.REFRESHTOKEN,
// 				accessToken: process.env.ACCESSTOKEN
// 			})
// 		}
// 	});

// 	// var text = JSON.stringify(req.body),
// 	var text = req.body.message,
// 			mailOptions = {
// 				from: 'conor.kidogo@gmail.com',
// 				to: req.body.email,
// 				subject: 'test email!!',
// 				text: text
// 	};

// 	transporter.sendMail(mailOptions, function (err, info) {
// 		if (err) {
// 			console.log('sendMail Err -', err);
// 		} else {
// 			console.log('mail sent -', info.response);
// 		}
// 	});


// 	res.sendStatus(200);
// });