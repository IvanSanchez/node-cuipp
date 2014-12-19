

var http    = require('http');
var util    = require('util');
var builder = require('xmlbuilder');


// A "phone" parameter is a simple object with the following structure:
/*
 { host: '1.2.3.4',
   port: 80,
   username: 'johndoe',
   password: 's3cr3t'
 }
*/
//// TODO: Keep a cache of phones, check for capabilities and buffer them, etc etc.


// Most commands allow for a "title" and a "prompt". In most Cisco
//   phones, title is displayed at the top whereas prompt is displayed
//   at the bottom.
// Also, most commands (but CUIPPexecute and CUIPPstatus) allow for 
//   specifying some softkeys. All this is accomplished by specifying
//   a "common options" object with the following structure (all
//   properties are optional):
/*
 { title: "Thing title",
   prompt: "Tell the user what to do",
   softkeys: [
	{name: "Something", url: "http://foo", urldown:"Display:default" ,position:1},
	{name: "Whatever",  url: "http://foo2", position:2},
	{name: "Huh.",      url: "http://foo4", position:4}
   ]
 }
*/



// Builds a root XML object, given its name and the common options
//   for that command (title, prompt, softkeys)
function _commandSkeleton(name, options){
	var xml_root = builder.create(name);
	if (options.hasOwnProperty('title')) {
		xml_root.ele('Title',options.title);
	}
	if (options.hasOwnProperty('prompt')) {
		xml_root.ele('Prompt',options.prompt);
	}
	if (options.hasOwnProperty('softkeys')) {
		for (i in options.softkeys){
			var softkey = xml_root.ele('SoftKeyItem');
			softkey.ele('Name',options.softkeys[i].name);
			softkey.ele('URL',options.softkeys[i].url);
			if (options.softkeys[i].hasOwnProperty('urldown'))
				softkey.ele('URLDown',options.softkeys[i].urldown);
			softkey.ele('Position',options.softkeys[i].position);
		}
	}
	return (xml_root);
}


// Builds and sends a CiscoUIPPhoneMenu command to a phone
// This is used to display a menu of several options in the phone, each
//   one with a URL which will be visited on selection by the phone user.
// "options" is an object, with each key being the title of the option
//   and the value being the URL the phone will visit when that option is
//   activated.
function menu(phone,options,menuOptions){
	var xml_root = _commandSkeleton('CiscoIPPhoneMenu', options)
	for (name in menuOptions) {
		var item = xml_root.ele('MenuItem');
		item.ele('Name',name);
		item.ele('URL',menuOptions[name]);
	}
	_send(phone,xml_root.toString());
}


// Builds and sends a CiscoUIPPhoneText command to a phone
// This is used to display a text in the phone's screen. Text should be
// "8-bit ASCII" - but Cisco's docs don't specify if this is ISO-8859-1
// or some other text encoding.
function text(phone, options, text) {
	var xml_root = _commandSkeleton('CiscoIPPhoneText', options)
	xml_root.ele('Text',text);
	_send(phone,xml_root.toString());
}



// Builds and sends a CiscoIPPhoneInput command to a phone.
// This is used to ask the phone's user for a value, and send that
//   to an URL (as a GET query string parameter)

// URL: The URL the phone will visit when the user enters the value(s) asked for
// fields: An array of objects with the following properties:
//   name: The name of the field asked for
//   param: The name of the HTTP GET parameter passed to the URL when done
//   type: Field type - A for ascii text; T for a telephone number; 
//     N for a numeric value; E for a mathematical expression; 
//     U for uppercase text; L for lowercase text. Add a "P" to the type 
//     to make it a password (phone will obscure entry)
function input(phone, options, url, fields) {
	var xml_root = _commandSkeleton('CiscoIPPhoneInput', options)
	for (i in fields) {
		var fields = fields[i];
		var item = xml_root.ele('MenuItem');
		item.ele('DisplayName',field[name]);
		item.ele('QueryStringParam',field[param]);
		item.ele('InputFlags',field[type]);
	}
	_send(phone,xml_root.toString());
}


// Builds and sends a CiscoIPPhoneDirectory command to a phone.
// This is used to display a phone directory, each entry with a
//   display name and a functional phone number.
// FIXME: In case there are more than 32 entries, there should be
//   several commands sent.
// entries: an object, each key being a display name and each value being
//   the telephone number.
function directory(phone, options, entries) {
	var xml_root = _commandSkeleton('CiscoIPPhoneDirectory', options)
	for (name in entries) {
		var item = xml_root.ele('DirectoryEntry');
		item.ele('Name',name);
		item.ele('Telephone',entries[name]);
	}
	_send(phone,xml_root.toString());
}



//// NOTE: These are left as an exercise to the reader ;-)
//// TODO: Build a CiscoUIPPhoneImage command
/*
<CiscoIPPhoneImage WindowMode="XSI window width mode">
	<Title>Image title goes here</Title>
	<Prompt>Prompt text goes here</Prompt>
	<LocationX>Position information of graphic</LocationX>
	<LocationY>Position information of graphic</LocationY>
	<Width>Size information for the graphic</Width>
	<Height>Size information for the graphic</Height>
	<Depth>Number of bits per pixel</Depth>
	<Data>Packed Pixel Data</Data>
</CiscoIPPhoneImage>
*/


//// TODO: Build a CiscoUIPPhoneImageFile command
/*
<CiscoIPPhoneImageFile WindowMode="Width Mode of XSI window">
	<Title>Image Title goes here</Title>
	<Prompt>Prompt text goes here</Prompt>
	<LocationX>Horizontal position of graphic</LocationX>
	<LocationY>Vertical position of graphic</LocationY>
	<URL>Points to the PNG image</URL>
</CiscoIPPhoneImageFile>
*/


//// TODO: Build  a CiscoIPPhoneImageMenu command
/*
<CiscoIPPhoneGraphicMenu WindowMode="Width Mode of XSI window">
	<Title>Menu title goes here</Title>
	<Prompt>Prompt text goes here</Prompt>
	<LocationX>Position information of graphic</LocationX>
	<LocationY>Position information of graphic</LocationY>
	<Width>Size information for the graphic</Width>
	<Height>Size information for the graphic</Height>
	<Depth>Number of bits per pixel</Depth>
	<Data>Packed Pixel Data</Data>
	<MenuItem>
		<Name>The name of each menu item</Name>
		<URL>The URL associated with the menu item</URL>
	</MenuItem>
</CiscoIPPhoneGraphicMenu>
*/

//// TODO: Build a CiscoIPPhoneGraphicFileMenu
/*
<CiscoIPPhoneGraphicFileMenu WindowMode="Width Mode of XSI window">
	<Title>Image Title goes here</Title>
	<Prompt>Prompt text goes here</Prompt>
	<LocationX>Horizontal position of graphic</LocationX>
	<LocationY>Vertical position of graphic</LocationY>
	<URL>Points to the PNG background image</URL>
	<MenuItem>
		<Name>Same as CiscoIPPhoneGraphicMenu</Name>
		<URL>Invoked when the TouchArea is touched</URL>
		<TouchArea X1="left edge" Y1="top edge" X2="right edge" Y2="bottom edge"/>
	</MenuItem>
</CiscoIPPhoneGraphicFileMenu>
*/



//// TODO: Build a CiscoIPPhoneIconMenu
/*
<CiscoIPPhoneIconMenu>
	<Title>Title text goes here</Title>
	<Prompt>Prompt text goes here</Prompt>
	<MenuItem>
		<IconIndex>Indicates what IconItem to display</IconIndex>
		<Name>The name of each menu item</Name>
		<URL>The URL associated with the menu item</URL>
	</MenuItem>
	<IconItem>
		<Index>A unique index from 0 to 9</Index>
		<Height>Size information for the icon</Height>
		<Width>Size information for the icon</Width>
		<Depth>Number of bits per pixel</Depth>
		<Data>Packed Pixel Data</Data>
	</IconItem>
</CiscoIPPhoneIconMenu>
*/



//// TODO: Build a CiscoIPPhoneIconFileMenu command
/*
<CiscoIPPhoneIconFileMenu>
	<Title>Title text goes here</Title>
	<Prompt>Prompt text goes here</Prompt>
	<MenuItem>
		<IconIndex>Indicates what IconItem to display</IconIndex>
		<Name>The name of each menu item</Name>
		<URL>The URL associated with the menu item</URL>
	</MenuItem>
	<IconItem>
		<Index>A unique index from 0 to 9</Index>
		<URL>location of the PNG icon image</URL>
	</IconItem>
</CiscoIPPhoneIconFileMenu>
*/


//// TODO: Build a CiscoIPPhoneStatus command
/*
<CiscoIPPhoneStatus>
	<Text>This is the text area</Text>
	<Timer>Timer seed value in seconds</Timer>
	<LocationX>Horizontal alignment</LocationX>
	<LocationY>Vertical alignment</LocationY>
	<Width>Pixel width of graphic</Width>
	<Height>Pixel height of graphic</Height>
	<Depth>Color depth in bits</Depth>
	<Data>Hex binary image data</Data>
</CiscoIPPhoneStatus>
*/


//// TODO: Build a CiscoIPPhoneStatusFile command
/*
<CiscoIPPhoneStatusFile>
	<Text>This is the text area</Text>
	<Timer>Timer seed value in seconds</Timer>
	<LocationX>Horizontal alignment</LocationX>
	<LocationY>Vertical alignment</LocationY>
	<URL>location of the PNG image</URL>
</CiscoIPPhoneStatusFile>
*/




// Builds and sends a CiscoUIPPhoneExecute command to a phone
// This is used to execute arbitrary commands on the phone
// commands: an object, each property being a command (URL), and each key
//   being the "priority" of the command, as follows:
//     0: Execute immediatly
//     1: Queue - delay execution until phone is idle
//     2: Execute only if phone is idle
function execute( phone, commands ) {
	
	var xml_root = builder.create('CiscoIPPhoneExecute');
	
	for (command in commands) {
		xml_root.ele('ExecuteItem',{URL:command, Priority: commands[command]});
	}
// 	console.log(xml_root.toString());
	_send(phone,xml_root.toString());
	
}


// Sends a XML payload to a phone
function _send( phone, xml ){
	
	var options = {
		hostname: phone.host,
		port: phone.port,
		path: '/CGI/Execute',
		method: 'POST',
		headers: {'content-type': 'text/xml'},
		auth: phone.user + ':' + phone.password
	};

	var req = http.request(options, function(res) {
		console.log('STATUS: ' + res.statusCode);
// 		console.log('HEADERS: ' + JSON.stringify(res.headers));
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			console.log('BODY: ' + chunk);
		});	
		res.on('end', function (chunk) {
			console.log('Phone has processed our command.');
		});
	});

	req.on('error', function(e) {
		console.log('problem with request: ' + e.message);
	});

	console.log('Sending payload to ', phone.host, ': ', xml);
	
	
	// Write POST data to request body
	// According to the docs, «The form that is posted should have a 
	//   case-sensitive form field name called "XML" that contains the 
	//   desired XML object», so let's hope URL-encoding is not needed.
	// FIXME: Check if we need a content-disposition:x-form-urlencoded
	//   HTTP header.
	req.write("XML=" + xml + "\n");
// 	req.write("xml + "\n");
	req.end();
	
}




module.exports = {
	menu:      menu,
	text:      text,
	input:     input,
	directory: directory,
	execute:   execute
};

