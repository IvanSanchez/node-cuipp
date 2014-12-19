

var cuipp = require('./lib/cuipp');

var testPhone = { host:'localhost',port:3000,username:'user',password:'pass'};



// Unlock the phone and play a file (file must be at phone's TFTP server)
cuipp.execute (testPhone, {'Device:Unlock':0,'Play:alert.wav':2 });


// Display a menu with two options
cuipp.menu(
	  testPhone
	, {title:'Menu title', prompt:'Prompt'}
	, {'Option 1':'URL1','Option 2':'URL2'}
);



// Ask the phone's user for some data
cuipp.input(
	  testPhone
	, {title:'Login information', prompt:'Enter user credentials'}
	, 'http://foo/login'
	[ {name: 'Username', param: 'user',   type: 'A'},
	  {name: 'Password', param: 'passwd', type: 'AP'} ]
);



// Show a functional directory in the phone screen
cuipp.directory(
	  testPhone
	, {title:'Contacts list', prompt:'Lots of people here'}
	, {'John Doe': '+1 2345678' , 'Nobody': '54783290'}
);


// Show some text
cuipp.text(testPhone,{title:'Alert!'},'Something is wrong!');



// Show some text with custom softkeys - other commands can also use softkeys
cuipp.text(
	  testPhone
	, {title:'Backlight control',
	   softkeys: [
	     {name:'On',  url:'Display:On:0' , position:1},
	     {name:'Off', url:'Display:Off:0', position:2},
	     {name:'Default', url:'Display:Default', position:3},
	     {name:'Back',url:'Softkey:Back',  position:4}
	   ]
	  }
	, 'Use softkeys to turn backlight on/off'
);


