var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
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

app.get('/form/:formID', function(req, res){
	var formID = req.params.formID;
	request('https://api.ona.io/api/v1/data/' + formID, function (error, response, body){
		res.send(response);
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


app.listen(9000, function(){
	console.log('App running on port 9000');
});