/*
Basic structure of code:
open tcp socket to ncidd server
parse incoming data
  - for each line
    - toss "info" lines
    - javascript array of lines (similar to NCIDdisplay, but keeping all packets)
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
  client is sent "messages" of all lines in json array (aka call log)
  emit all lines stored in array ONLY to newly connected client
  wait for event indicating new call/message/etc
  listen for a message packet from client (not implemented fully yet)

for client html,
  update phone call div (contains a table) as packets arrive
    sort in reverse order so newest packet is on top
    need to do: format phone numbers so that they are "click-to-dial"
      <a href="tel:xxx-xxx-xxxx">
  eventually add client jobs

 * Copyright (c) 2016 by B. Tod Cox
*/


var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var net = require('net');
var carrier = require('carrier');

var host = 'localhost';
var port = '3333';
var stream = net.createConnection(port,host); 
stream.setEncoding("utf8");
var callLog = []; //array to store log of info received from NCID server

stream.on('close', function(){ //handle situation where tcp socket gets disconnected
  console.log("disconnected from ncidd server at " + host + ":" + port);
  stream.destroy(); //ensure no more i/o activity occurs
  callLog = []; //clear out callLog as we have no idea what we have missed
  console.log("attempting to reconnect to ncidd");
  stream = net.createConnection(port, host); // attempt to reconnect to ncidd server
})
//open tcp socket and process incoming ncid packets
//carrier module does the heavy lifting of parsing out complete lines of ncid packets
carrier.carry(stream, function(ncidpacket){
	console.log("line: " + ncidpacket);
var ncidPacketRegex = /[\*]+([^*]+)[\*]+([^*]+)/g; //regex for getting NCID packet "pairs"
var msgPacketRegex = /\s([^*]+)[\*]+/g; //regex for getting message part of MSG, MSGLOG, NOT & NOTLOG packets

var result,
	matches;
var jsonline = {};
var packet = ncidpacket.toString();


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
			return 1;  //"call" type information in packet
			break;  
	    case "MSG:":
      case "MSGL" :
	    case "NOT:":
      case "NOTL" :
	        return 2; //"message" type information in packet
	        break;
	    default:
	        console.log("ingored packet");
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
		jsonline["mesg"] = msgPacketRegex.exec(packet)[1];
	case 1: 
		parsePacket(); //get rest of data from packet (if other data exists)
    var nmbrparse = jsonline["nmbr"].toString();
    var dateparse = jsonline["date"].toString();
    var timeparse = jsonline["time"].toString();
    if (nmbrparse.length == 11){
      jsonline["nmbr"] =  nmbrparse.substring(1,4) + "-" + nmbrparse.substring(4,7) + "-" + nmbrparse.substring(7);
    }
    jsonline["date"] = dateparse.substring(0,2) + "-" + dateparse.substring(2,4) + "-" + dateparse.substring(6);
    jsonline["time"] = timeparse.substring(0,2) + ":" + timeparse.substring(2);

		break;
	case 0:
		return 0; // toss info, we are done with the current packet
}

console.log(JSON.stringify(jsonline));
callLog.push(jsonline); //store jsonified info into callLog

if (ncidpacket[3] === ":"){ //check 4th char to see if we have a log item (store it)
							// or a new arrival (send it to all connected clients)
	io.emit('ncidInfo', JSON.stringify(jsonline) );
}

});

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  console.log("new connection");
  var val;
  var arrayLength;
//io.listen(io);
  socket.emit('ncidCMD', "clear"); // may have client reconnecting after unknown disconnect time
  									// if so, clear client's info and send callLog
  
  arrayLength = callLog.length;
  for (var i = 0; i < arrayLength; i++){
   // console.log(val);
  	socket.emit('ncidInfo', JSON.stringify(callLog[i]));
  }

  var address = socket.request.connection.remoteAddress;
  var port = socket.request.connection.remotePort;
  console.log("NEW CONNECTION FROM " + address + ":" + port);
  socket.on('user message', function(msg){
    io.emit('user message', msg);
  });
});


http.listen(3000, function(){
  console.log('listening on *:3000');
});


