

// These examples imply the phone initiating the communication, pulling
//   the payloads from node (via express).
// Note how all payloads are wrapped in the express.js handlers.

var cuipp = require('./lib/cuipp');

var express = require('express');
var app = express();

var phoneIP = 'localhost';

var testPhone = { host:'localhost',port:3000,username:'user',password:'pass'};

// When the phone queries "/", display a menu to see the rest of examples
app.get('/', function (req, res) {
	// I don't trust the phones to handle relative URLs, so
	//   build it again, using the same hostname (in case
	//   our test server has several network interfaces)
	var self = 'http://' + req.headers.host + '/';
	

	var imageUrl = "http://" + testPhone.username + ':' + testPhone.password + '@' + testPhone.host + ':' + testPhone.port + "/CGI/Screenshot";
	
	var html = "<html><img id='screen' src='" + imageUrl + "'>"
	
	html += "<a target='void' href='" + self + "push?key=KeyPad0'>0</a>";
	html += "<a target='void' href='" + self + "push?key=KeyPad1'>1</a>";
	html += "<a target='void' href='" + self + "push?key=KeyPad2'>2</a>";
	html += "<a target='void' href='" + self + "push?key=KeyPad3'>3</a>";
	html += "<a target='void' href='" + self + "push?key=KeyPad4'>4</a>";
	html += "<a target='void' href='" + self + "push?key=KeyPad5'>5</a>";
	html += "<a target='void' href='" + self + "push?key=KeyPad6'>6</a>";
	html += "<a target='void' href='" + self + "push?key=KeyPad7'>7</a>";
	html += "<a target='void' href='" + self + "push?key=KeyPad8'>8</a>";
	html += "<a target='void' href='" + self + "push?key=KeyPad9'>9</a>";
	
	html += "<iframe name='void'></iframe>";
	html += "<script>window.setInterval(function(){document.getElementById('screen').src='" + imageUrl + "#' + Date.now(); console.log('tick');},1000)</script>";
	html += "</html>";

	res.send(html);
	
})



app.get('/push', function (req, res) {

	var key = req.query.key;
	var command = 'Key:' + key;
	var commandArray = {};
	commandArray[command] = 0;	// 0 = execute immediatly
	
	cuipp.send(testPhone, cuipp.execute( commandArray ),function(err,res2){
		res.send(err + res2);
	});
	
	
})



var server = app.listen(3002, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('node-cuipp pull examples listening at http://%s:%s', host, port)

})
