

// A fake stub CUIPP web server.

//// TODO: Actually parse the commands as a Cisco phone would.
//// TODO: Actually implement a graphical web interface to display
////   whatever should be being displayed in the phone


var express = require('express')
var app = express()

app.get('/', function (req, res) {
  res.send('Hello World!')
})

app.post('/CGI/Execute', function (req, res) {
  console.log('Replying to /CGI/Execute!')
  
//   console.log(req);
  
  req.on('data',function(data){
	console.log('Server received body data: ', data.toString());
  })
  
  req.on('end',function(){
// 	setTimeout(function(){
// 		res.send('<CiscoIPPhoneResponse>' +
// 	// 		'<ResponseItem Status="OK"' +
// 	// 		'Data="Stub response (this is a fake CUIPP server)"' +
// 	// 		'URL="the URL or URI specified in the Execute object"/>' +
// 			'</CiscoIPPhoneResponse> ')
// 	},10000);
	
	// An error message looks like:
	res.send("<CiscoIPPhoneError Number=\"3\"/>");
	
// 	Error 0 = Authentication Failure error
// 	Error 1 = Error parsing CiscoIPPhoneExecute object
// 	Error 2 = Error framing CiscoIPPhoneResponse object
// 	Error 3 = Internal file error
// 	Error 4 = Authentication error
// 	Error 5 = network error
// 	Error 6 = timeout error
  });
})



app.get('/DeviceInformationX',function(req,res){
	
	console.log('Requested device info');
	
	res.send("<?xml version=\"1.0\" encoding=\"iso-8859-1\"?>\
	<DeviceInformation>\
		<MACAddress>0003E369A125</MACAddress>\
		<HostName>SEP0003E369A125</HostName>\
		<phoneDN>5920</phoneDN>\
		<appLoadID>P00308010200</appLoadID>\
		<bootLoadID>PC03A300</bootLoadID>\
		<versionID>8.1(2.0)</versionID>\
		<DSPLoadID>4.0(5.0)[A0]</DSPLoadID>\
		<addonModule1></addonModule1>\
		<addonModule2></addonModule2>\
		<hardwareRevision>1.0</hardwareRevision>\
		<serialNumber>INMXXXXXXX</serialNumber>\
		<modelNumber>CP-7940</modelNumber>\
		<Codec>ADLCodec</Codec>\
		<Amps>3V Amp</Amps>\
		<C3PORevision>2</C3PORevision>\
		<MessageWaiting>no</MessageWaiting>\
	</DeviceInformation>");
	
	
// <DeviceInformation>
// <MACAddress>2323CA58E460</MACAddress>
// <HostName>SEP44ER3CA58E460</HostName>
// <phoneDN>11962323</phoneDN>
// <appLoadID>SCCP 1.2.2.6</appLoadID>
// <bootLoadID>0.0.0.24</bootLoadID>
// <versionID>= V02</versionID>
// <addonModule1/>
// <addonModule2/>
// <hardwareRevision>5</hardwareRevision>
// <serialNumber>PXN232327VCNX</serialNumber>
// <modelNumber>CP-6941</modelNumber>
// <MessageWaiting>No</MessageWaiting>
// <udi>phone Cisco Unified IP Phone CP-6941, Global CP-6941 PXN15271212X</udi>
// <time>11:03</time>
// <timezone>W. Europe Standard/Daylight Time</timezone>
// <date>16.12.13</date>
// </DeviceInformation>
});

var server = app.listen(3000, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port)

})
