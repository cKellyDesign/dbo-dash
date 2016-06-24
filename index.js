var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var nodemailer = require('nodemailer');
var xoauth2 = require('xoauth2');
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

app.get('/', function (req, res){
	res.sendFile(path.join(__dirname, './index.html'));
});

app.use('/email-test', bodyParser.urlencoded({ extended: false }), function (req, res) {
	console.log('body :', req.body);

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

	// var text = JSON.stringify(req.body),
	var text = req.body.message,
			mailOptions = {
				from: 'conor.kidogo@gmail.com',
				to: req.body.email,
				subject: 'test email!!',
				text: text
	};

	// transporter.sendMail(mailOptions, function (err, info) {
	// 	if (err) {
	// 		console.log('sendMail Err -', err);
	// 	} else {
	// 		console.log('mail sent -', info.response);
	// 	}
	// });


	res.sendStatus(200);
});

app.get('/form/:formID', function(req, res){
	var formID = req.params.formID;
	request('https://api.ona.io/api/v1/data/' + formID, function (error, response, body){
		res.send(response);
	});
});

app.use('/formHook', function (req, res) {
	var transporter = nodemailer.createTransport({
		service: 'Gmail',
		auth: {
			user: 'conor.kidogo@gmail.com',
			pass: 'welovebabies'
		}
	});

	var text = req.body,
			mailOptions = {
				from: 'conor.kidogo@gmail.com',
				to: 'ckellydesign.net@gmail.com',
				subject: 'test email!!',
				text: text
	};

	transporter.sendMail(mailOptions, function (err, info) {
		if (err) {
			console.log('sendMail Err -', err);
			res.json({ yo: 'error' });
		} else {
			console.log('mail sent -', info.response);
			res.json({ yo: info.response });
		}
	});

});

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


app.listen(process.env.PORT || 9000, function(){
	console.log('App running on port 9000');
});