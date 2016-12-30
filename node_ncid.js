/*
Basic structure:
open tcp socket to ncidd
parse incoming data
  - for each line
    - toss "info" lines
    - javascript array of lines (similar to NCIDdisplay, but keeping lots)
   \*([^*]+)\*([^*]+) - regex for parsing ncid packet
leave tcp socket open & waiting for additional packets to arrive
**** current version of code DOES NOT VERIFY that TCP socket remains open
**** if ncidd process restarts, you will need to restart NCIDwebclient
**** until code is modified.

when new ncid packet arrives:
  parse packet
  update array of lines (push new line onto array)
  emit new json formatted packet to all connected clients

Upon client connection
  client is sent "messages" of all lines in json array
  emit all lines stored in array ONLY to newly connected client
  wait for event indicating new call/message/etc
  listen for a message packet from client (not implemented fully yet)

for client html,
  update phone call div (contains a table) as packets arrive
    sort in reverse order so newest packet is on top
    need to do: format phone numbers so that they are "click-to-dial"
      <a href="tel:xxx-xxx-xxxx">
  eventually add client jobs

*/


var app = require('express')();
var favicon = require('serve-favicon');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var net = require('net');
var carrier = require('carrier');
var config = require('config');
var pjson = require('./package.json')

var host = config.NCIDserver;  //NCIDD server address (ip or name)
var port = config.port;        //NCIDD server port (typically 3333)
var NCIDwebclientPort = config.NCIDwebclientPort; //port that NCIDwebclient http server listens on
var reconnectTime = config.reconnectTime;  // time to wait when attempting to reconnect to NCID server
var time12Hr = config.time12Hr;   // reformat time to am/pm format? true = reformat, false=24 hr times
var stream = net.createConnection(port,host); 
stream.setEncoding("utf8");
var callLog = []; //array to store log of info received from NCID server
var nciddVersion = "NCID server not connected."; //version of connected NCIDD server
var nciddLines = 0;
var nciddLinesProcessed = 0;

stream.on('close', function(){ //handle situation where tcp socket gets disconnected
  console.log("Not connected to ncidd server at " + host + ":" + port);
  callLog = []; //clear out callLog as we have no idea what we have missed
  var nciddLines = 0; //reset counters
  var nciddLinesProcessed = 0;
  console.log("Attempting to reconnect to ncidd.");
  //io.sockets.sockets.forEach(function(s) { // disconnect all socket.io connections from all active web browsers
  //  s.disconnect(true);
  //});
  io.emit('nciddVersion', "NCID server not connected.");
  setTimeout( function() {
    stream.connect(port, host); // attempt to reconnect to ncidd server
  }, reconnectTime);
});

stream.on('error', function(e) {
  console.log('ERROR received '+e.code);
  if (e.code === "ECONNREFUSED") console.log("Is ncidd server running at "+host+":"+port+"?");
});


//carrier module does the heavy lifting of parsing out complete lines of ncid packets
carrier.carry(stream, function(ncidpacket){
	console.log("line: " + ncidpacket);
var ncidPacketRegex = /[\*]+([^*]+)[\*]+([^*]+)/g; //regex for getting NCID packet "pairs"
var msgPacketRegex = /\s([^*]+)($|[\*]+)/g; //regex for getting message part of MSG, MSGLOG, NOT & NOTLOG packets (handles older versions of NCID packets)
var ncidServerRegex = /\s(.+)$/g; //

var result,
	matches;
var jsonline;
var packet = ncidpacket.toString();

jsonline = {};

nciddLines++;


jsonline["ncidtype"] = packet.substring(0, 3);	 //get packet type

function getPacketType(){
//	console.log("line type :" + jsonline["type"]);
	switch (packet.substring(0,4)) {
		case "CID:":
    case "CIDL" :
		case "PID:":
    case "PIDL" :
		case "OUT:":
    case "OUTL" :
		case "BLK:":
    case "BLKL" :
		case "HUP:":
    case "HUPL" :
		case "WID:":
    case "WIDL" :
		 //   console.log("cid packet");
      nciddLinesProcessed++;
			return 1;  //"call" type information in packet
			break; 
	    case "MSG:":
      case "MSGL" :
	    case "NOT:":
      case "NOTL" :
        nciddLinesProcessed++;
	     return 2; //"message" type information in packet
	        break;
      case "200 ": // ncidd server version packet
        nciddLinesProcessed++;
        return 3;
        break;
	    default:
	        console.log("ignored packet");
	    	return 0; // packet type that we don't care about for now, packet headed for bit-bucket
	}
}

function parsePacket() { //parse ncid packet put results in JSON object
	while (matches = ncidPacketRegex.exec(packet)) {
	//	console.log(matches);
		jsonline[matches[1].toLowerCase()] = matches[2];
	}
}

switch (getPacketType()){
	case 2: // "message" type packet, so need to handle message portion of packet differently
    //console.log('Message packet');
    //console.log(packet);
    //console.log(jsonline);

		jsonline["mesg"] = msgPacketRegex.exec(packet)[1];
	case 1: 
		parsePacket(); //get rest of data from packet (if other data exists)
    //console.log(jsonline);
    if (!jsonline.hasOwnProperty('line')) {
    //  console.log('no line property');
      jsonline['line']="n/a";
    } 
    var nmbrparse = "";
    if (jsonline.hasOwnProperty('nmbr')){
      nmbrparse = jsonline["nmbr"].toString();
    }
    var dateparse = "";
    if (jsonline.hasOwnProperty('date')){
      dateparse = jsonline["date"].toString();
      jsonline["date"] = dateparse.substring(0,2) + "-" + dateparse.substring(2,4) + "-" + dateparse.substring(6);
    } else {
      jsonline["date"] = "n/a";
    }

    var timeparse = "";
    if(jsonline.hasOwnProperty('time')){
    //  console.log('has time')
      timeparse = jsonline["time"].toString();
      if (time12Hr){ // format to am/pm?
          var tmchk = parseInt(timeparse.substring(0,2),10);
          console.log(tmchk);
          if (tmchk <= 12){
            jsonline["time"] = tmchk + ":" + timeparse.substring(2);
          } else {
            jsonline["time"] = (tmchk-12) + ":"+ timeparse.substring(2);
          }
          if (tmchk <= 11) {
            jsonline["time"] += " am";
          } else {
            jsonline["time"] += " pm";
          }
          if (tmchk == 0) { //00:xx is Midnight...
            jsonline["time"] = "12:"+ timeparse.substring(2) + " am";
          }
//          console.log('Time: ' + timeparse + ' ==> ' + jsonline["time"]);
      } else {
        jsonline["time"] = timeparse.substring(0,2) + ":" + timeparse.substring(2);
      }
    } else {
      jsonline["time"] = "n/a";
    }

    if (nmbrparse.match(/^\d+$/)){ //check is phone number is all digits before formatting; code currently only formats US 7, 10, & 11 digit numbers
      if (nmbrparse.length == 11 ){
        jsonline["nmbr"] =  nmbrparse.substring(1,4) + "-" + nmbrparse.substring(4,7) + "-" + nmbrparse.substring(7);
      }
      if (nmbrparse.length == 10){
        jsonline["nmbr"] =  nmbrparse.substring(0,3) + "-" + nmbrparse.substring(3,6) + "-" + nmbrparse.substring(6);

      }
      if (nmbrparse.length == 7){
        jsonline["nmbr"] = nmbrparse.substring(0,3) + "-" + nmbrparse.substring(3);
      }
    } 

		break;
  case 3:
    nciddVersion = ncidServerRegex.exec(packet)[1];
    nciddVersion += '<br> NCIDD server @ ' + host + ':' + port + '</br>';
    io.emit('nciddVersion', nciddVersion); //update displayed ncidd server version for any connected web clients
    io.emit('ncidCMD',"clear");  // new server connection--clear out all data on clients so do not end up with strange duplicates or info from another ncidd server
    console.log(nciddVersion);
    break;
	case 0:
		return 0; // toss info, we are done with the current packet
}

jsonline["nciddLines"] = nciddLines;
jsonline["nciddLinesProcessed"] = nciddLinesProcessed;

console.log(JSON.stringify(jsonline));
callLog.push(jsonline); //store jsonified info into callLog

  var jsonLineToSend = JSON.parse(JSON.stringify(jsonline)); //clone jsonified ncidd packet since we have no idea when callLog.push(...) will complete

  if (ncidpacket[3] === ":"){ //check 4th char to see if we have a log item or not
      jsonLineToSend["newpkt"]=true; // if not a logged item, notify attached clients
  }
	io.emit('ncidInfo', JSON.stringify(jsonLineToSend) );
//}

});

app.use(favicon(__dirname + '/favicon.ico'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.get('/index_taa', function(req, res){
  res.sendFile(__dirname + '/index_taa.html');
});

app.get('/index_jlc', function(req, res){
  res.sendFile(__dirname + '/index_jlc.html');
});

io.on('connection', function(socket){
 // console.log("new connection");
  var val;
  var arrayLength;
//io.listen(io);
  socket.emit('nciddVersion', nciddVersion);
  socket.emit('ncidWCVersion', pjson.version);
  socket.emit('ncidCMD', "clear"); // may have client reconnecting after unknown disconnect time
  									// if so, clear client's info and send callLog
  
  arrayLength = callLog.length;
  for (var i = 0; i < arrayLength; i++){
    console.log(callLog[i]);
  	socket.emit('ncidInfo', JSON.stringify(callLog[i]));
  }

  var address = socket.request.connection.remoteAddress;
  var port = socket.request.connection.remotePort;
  console.log("New web client connection from " + address + ":" + port);
  socket.on('user message', function(msg){
    console.log(msg);
    stream.write(msg);
  });
});


http.listen(NCIDwebclientPort, function(){
  console.log('listening on *:' + NCIDwebclientPort);
});


