

// These examples imply node.js initiating the communication, pushing
//   the payloads to the phone.
// Note how all payloads are wrapped in a cuipp.send() call.

var cuipp = require('./lib/cuipp');

var testPhone = { host:'localhost',port:3000,username:'user',password:'pass'};


// Generic callback
function errorHandler(err,result) {
// 	if (err !== undefined) {
		console.log('Error was: ', err);
// 	}
}


// Unlock the phone (0, immediatly) and play a file (file must be
//   at phone's TFTP server) (2, only if the phone is idle).
// This is the only command that can expect a return value from
//   the phone (success or failure of each URI)
cuipp.send(testPhone, 
	cuipp.execute({'Device:Unlock':0,'Play:alert.wav':2 }),
	errorHandler
);


// Display a menu with two options
cuipp.send(testPhone, 
	cuipp.menu(
		{title:'Menu title', prompt:'Prompt'},
		{'Option 1':'URL1','Option 2':'URL2'}
	),
	errorHandler
);



// Ask the phone's user for some data
cuipp.send(testPhone, 
	cuipp.input(
		{title:'Login information', prompt:'Enter user credentials'},
		'http://foo/login',
		[ {name: 'Username', param: 'user',   type: 'A'},
		{name: 'Password', param: 'passwd', type: 'AP'} ]
	),
	errorHandler
);



// Show a functional directory in the phone screen
cuipp.send(testPhone, 
	cuipp.directory(
		{title:'Contacts list', prompt:'Lots of people here'},
		{'John Doe': '+1 2345678' , 'Nobody': '54783290'}
	),
	errorHandler
);




// Display some text
cuipp.send(testPhone, 
	cuipp.text({title:'Alert!'},'Something is wrong!'),
	errorHandler
);





// Show some text with custom softkeys - any other commands can also use softkeys
cuipp.send(testPhone,
	cuipp.text(
		{title:'Backlight control',
		softkeys: [
			{name:'On',  url:'Display:On:0' , position:1},
			{name:'Off', url:'Display:Off:0', position:2},
			{name:'Default', url:'Display:Default', position:3},
			{name:'Back',url:'Softkey:Back',  position:4}
			],
		prompt: 'Use softkeys to turn backlight on/off'
		}
	),
	errorHandler
);





// Get device info (mac addr, phone model, etc)
cuipp.getDeviceInfo(testPhone, function(err,res){
	
	if (err !== undefined) {
		console.log('Error was: ', err);
		return;
	}
	
	console.log("Phone model is:", res.modelNumber);
	console.log("Hostname is:", res.HostName);
	console.log("Serial number is:", res.serialNumber);
	
});


