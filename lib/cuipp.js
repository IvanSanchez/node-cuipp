

var http    = require('http');
var util    = require('util');
var builder = require('xmlbuilder');
var parser  = require('node-xml-lite');


// Some bright minds at Cisco have thought that it's a good idea
//   to have an zero-valued error code. I wish a C book will find
//   its way to their heads.
const ERRORNAMES = {
	0:'ERROR_CUIPP_AUTH_FAIL',
	1:'ERROR_CUIPP_PARSE',
	2:'ERROR_CUIPP_FRAME',
	3:'ERROR_CUIPP_INTERNAL',
	4:'ERROR_CUIPP_AUTH',
	5:'ERROR_CUIPP_NETWORK',
	6:'ERROR_CUIPP_TIMEOUT',
	
	1001: 'ERROR_CUIPP_BADXML',	// Thrown from Node, when XML from phone is malformed or unrecognised.
	1002: 'ERROR_CUIPP_TIMEOUT'	// Thrown from Node, on a timeout at the HTTP level (not at the TCP level) after 20 seconds
};

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
//   specifying some softkeys and event URIs, and all commands allow for
//   a "appID" to keep track of cookies and whatnot. All this is
//   accomplished by specifying a "common options" object with the
//   following structure (all properties are optional):
/*
 { title: "Thing title",
   prompt: "Tell the user what to do",
   appid:  "my-super-application",	// Defaults to "node-cuipp"
   onappfocuslost:   "URI to be queried on blur",
   onappfocusgained: "URI to be queried on focus",
   onappclosed:      "URI to be queries on close",
   softkeys: [
	{name: "Something", url: "http://foo", urldown:"Display:default" ,position:1},
	{name: "Whatever",  url: "http://foo2", position:2},
	{name: "Huh.",      url: "http://foo4", position:4}
   ]
 }
*/

// All callbacks are expected to follow the form:
// function(error, result) {...}
// If there is an error, the callback will receive a short string. The error
//   might be from either the network layer (e.g. ECONNREFUSED) or from the cuipp
//   layer (e.g. ERROR_CUIPP_AUTH).



// Builds a root XML object, given its name and the common options
//   for that command (title, prompt, softkeys, appid, event URIs)
function _payloadSkeleton(name, options){
	
	// One would expect xmlbuilder to re-encode all text to the 
	//   encoding given in the declaration. But, alas, no luck. 
	//   This means converting all strings and all object 
	//   keys/values passed to xmlbuilder.
	var xml_root = builder.create(name)
		.declaration('1.0','ISO-8859-1',true);
	
	xml_root.att('appId',options.appid || 'node-cuipp');

	if (options.hasOwnProperty('title')) {
		xml_root.ele('Title',options.title);
	}
	if (options.hasOwnProperty('prompt')) {
		xml_root.ele('Prompt',options.prompt);
	}
	if (options.hasOwnProperty('onappfocuslost')) {
		xml_root.ele('onAppFocusLost',options.onappfocuslost);
	}
	if (options.hasOwnProperty('onappfocusgained')) {
		xml_root.ele('onAppFocusGained',options.onappfocusgained);
	}
	if (options.hasOwnProperty('onappclosed')) {
		xml_root.ele('onAppClosed',options.onappclosed);
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


// Builds a CiscoUIPPhoneMenu payload
// This is used to display a menu of several options in the phone, each
//   one with a URL which will be visited on selection by the phone user.
// "options" is an object, with each key being the title of the option
//   and the value being the URL the phone will visit when that option is
//   activated.
//// TODO: Throw some warning if there are more than 100 menu options;
////   apparently the phones have that as a hard limit.
function menu(options,menuOptions, callback){
	var xml_root = _payloadSkeleton('CiscoIPPhoneMenu', options)
	for (name in menuOptions) {
		var item = xml_root.ele('MenuItem');
		item.ele('Name',name);
		item.ele('URL',menuOptions[name]);
	}
	return xml_root.documentObject.toString();
}


// Builds a CiscoUIPPhoneText payload
// This is used to display a text in the phone's screen. Text should be
// "8-bit ASCII" - but Cisco's docs don't really specify if this is 
// ISO-8859-1 or some other text encoding.
function text(options, text, callback) {
	var xml_root = _payloadSkeleton('CiscoIPPhoneText', options)
	xml_root.ele('Text',text);
	return xml_root.documentObject.toString('ascii');
}



// Builds a CiscoIPPhoneInput payload.
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
function input(options, url, fields, callback) {
	var xml_root = _payloadSkeleton('CiscoIPPhoneInput', options)
	for (i in fields) {
		var field = fields[i];
		var item = xml_root.ele('MenuItem');
		item.ele('DisplayName',field.name);
		item.ele('QueryStringParam',field.param);
		item.ele('InputFlags',field.type);
	}
	xml_root.ele('URL',url);
	return xml_root.documentObject.toString();
}


// Builds a CiscoIPPhoneDirectory payload.
// This is used to display a phone directory, each entry with a
//   display name and a functional phone number.
// FIXME: In case there are more than 32 entries, there should be
//   several commands sent.
// entries: an object, each key being a display name and each value being
//   the telephone number.
function directory(options, entries, callback) {
	var xml_root = _payloadSkeleton('CiscoIPPhoneDirectory', options)
	for (name in entries) {
		var item = xml_root.ele('DirectoryEntry');
		item.ele('Name',name);
		item.ele('Telephone',entries[name]);
	}
	return xml_root.documentObject.toString();
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




// Builds a CiscoUIPPhoneExecute payload
// This is used to execute arbitrary commands on the phone
// commands: an object, each property being a command (URL), and each key
//   being the "priority" of the command, as follows:
//     0: Execute immediatly
//     1: Queue - delay execution until phone is idle
//     2: Execute only if phone is idle
function execute(commands) {
	
	var xml_root = builder.create('CiscoIPPhoneExecute');
	
	for (command in commands) {
		xml_root.ele('ExecuteItem',{URL:command, Priority: commands[command]});
	}
// 	console.log(xml_root.toString());
	return xml_root.documentObject.toString();
	
}


// Sends a XML payload to a phone
//// TODO: Limit payloads to 512 bytes (as per spec). Consider embedding
////   a webserver in all this (with random port and grabbing IP addr) to
////   allow phones to fetch larger stuff.
function send( phone, xml, callback ){
	
	var options = {
		hostname: phone.host,
		port: phone.port,
		path: '/CGI/Execute',
		method: 'POST',
		//agent: 'node-cuipp',
		headers: {
			'content-type': 'text/xml; charset:ISO-8859-1',
			'MessageType': 'CALL',  // WTF????
			'Accept': '*/*',
			'Man': 'POST http://' + phone.host + ':' + phone.port + '/CGI/Execute HTTP/1.1',  // WTF????
			/// Content length is needed; embedded web server will return 404 
			///   if content is sent with Transfer-encoding: chunked.
			'Content-length': xml.length + 4	
			},
	};
	if (phone.username && phone.password) {
		options.auth = phone.username + ':' + phone.password;
	}

	if (!callback) { callback = function(){}; }
	
	var req = http.request(options, function(res) {
// 		res.setEncoding('ISO-8859-1');
		var buffer = '';
		res.on('data', function (chunk) {
			buffer += chunk;
		});
		res.on('end', function (chunk) {
			var data;
			try {
				data = parser.parseString(buffer);
			} catch (e) {
				var err = new Error(ERRORNAMES[1001],{errno: 1001});
				callback(err);
				return;
			}
			if (data && data.hasOwnProperty('name') && data.name == 'CiscoIPPhoneError') {
				var errno = data.attrib.Number;
				var err = new Error(ERRORNAMES[errno],{errno: errno});
				callback(err);
			} else {
				callback();
				/// FIXME!!! Return the parsed return values from the phone!!
			}
		});
	}).on('error', callback);
	req.setTimeout(20000,function(){
		req.removeListener('error',callback);	// Prevent duplicated calls to callback, because aborting the request will generate ECONNRESET.
		req.on('error',function(){});
		callback(new Error(ERRORNAMES[1002],{errno: 1002}));
		req.abort();
	});

	// Write POST data to request body
	// According to the docs, «The form that is posted should have a 
	//   case-sensitive form field name called "XML" that contains the 
	//   desired XML object», so let's hope URL-encoding is not needed.
	//   HTTP header.
	// FIXME: Make sure all the xml payload is converted into ISO-8859-1
	req.write("XML=" + xml + "\n");
	req.end();
}


// Get device info via HTTP request to /DeviceInformationX
function getDeviceInfo( phone, callback ){
	
	var options = {
		hostname: phone.host,
		port: phone.port,
		path: '/DeviceInformationX',
		method: 'GET',
	};
	if (phone.username && phone.password) {
		options.auth = phone.username + ':' + phone.password;
	}
	if (!callback) { callback = function(){}; }

	var req = http.request(options, function(res) {
		var buffer = '';
		res.on('data', function (chunk) {
			buffer += chunk;
		});
		res.on('end', function (chunk) {
			var data;
			try {
				data = parser.parseString(buffer);
			} catch (e) {
				var err = new Error(ERRORNAMES[1001],{errno: 1001});
				callback(err);
				return;
			}
			if (data && data.hasOwnProperty('name') && data.name == 'CiscoIPPhoneError') {
				var errno = data.attrib.Number;
				var err = new Error(ERRORNAMES[errno],{errno: errno});
				callback(err);
			} else if (data && data.hasOwnProperty('name') && data.name == 'DeviceInformation') {
				
				// On successful response, massage the XML response so 
				//   it becomes a flat javascript object.
				var result = {};
				for (var i in data.childs) {
					if (data.childs[i].childs) {
						result[data.childs[i].name] = data.childs[i].childs[0];
					} else {
						result[data.childs[i].name] = undefined;
					}
				}
				
				callback(undefined,result);
			} else {
				var err = new Error(ERRORNAMES[1001],{errno: 1001});
				callback(err);
			}
		});
	});
	req.on('error', callback);
	req.setTimeout(20000,function(){
		req.removeListener('error',callback);	// Prevent duplicated calls to callback, because aborting the request will generate ECONNRESET.
		req.on('error',function(){});
		callback(new Error(ERRORNAMES[1002],{errno: 1002}));
		req.abort();
	});
	req.end();
}




module.exports = {
	menu:      menu,
	text:      text,
	input:     input,
	directory: directory,
	execute:   execute,
	send:      send,
	getDeviceInfo: getDeviceInfo
};

