

// These examples imply the phone initiating the communication, pulling
//   the payloads from node (via express).
// Note how all payloads are wrapped in the express.js handlers.

var cuipp = require('./lib/cuipp');

var express = require('express');
var app = express();


// When the phone queries "/", display a menu to see the rest of examples
app.get('/', function (req, res) {
	// I don't trust the phones to handle relative URLs, so
	//   build it again, using the same hostname (in case
	//   our test server has several network interfaces)
	var self = 'http://' + req.headers.host + '/';
	
	// If the Content-type HTTP header is not set, phones will not parse the payload.
	res.setHeader('Content-type', 'text/xml');
	
	res.send(cuipp.menu(
		{title:'node-cuipp pull examples', prompt:'Choose something to do'},
		{
			'Text':      self+'text',
			'Directory': self+'directory',
			'Play a sound': 'Play:alert.wav',
			'Ask for user/password': self+'input'
		}
	));
})


// When the phone queries "/input", ask for a fake username/password, which will be sent
//   to /login
app.get('/input', function (req, res) {
	var self = 'http://' + req.headers.host + '/';
	res.setHeader('Content-type', 'text/xml');
	res.send(cuipp.input(
		{title:'node-cuipp login example', prompt:'Enter user credentials'},
		self+'login',
		[ {name: 'Username', param: 'user',   type: 'A'},
		  {name: 'Password', param: 'passwd', type: 'AP'} ]
	));
})


// When the user has entered something in /input, then /login will display just that.
app.get('/login', function (req, res) {
	res.setHeader('Content-type', 'text/xml');
	res.send(cuipp.text(
		{title:'node-cuipp login example', prompt:'Confirmation'},
		'You entered the username "' + req.query.user + '" and the password is ' + req.query.passwd.length + ' characters long.'
	));
})



// When the phone queries "/directory", display a few fake contacts.
app.get('/directory', function (req, res) {
	res.setHeader('Content-type', 'text/xml');
	res.send(cuipp.directory(
		{title:'node-cuipp directory example', prompt:'Lots of people here'},
		{'John Doe': '+1 2345678' , 'Nobody': '54783290'}
	));
});



// When the phone queries "/text", display some simple text.
app.get('/text', function (req, res) {
	res.setHeader('Content-type', 'text/xml');
	res.send(cuipp.text({title:'node-cuipp text example'},'Lorem ipsum dolor sit amet.'));
});





var server = app.listen(3001, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('node-cuipp pull examples listening at http://%s:%s', host, port)
  console.log('Now use your Cisco IP Phone to browse that.')
  console.log('If that shows "0.0.0.0", use the IP or hostname of the computer you\'re running these examples at.')

})
