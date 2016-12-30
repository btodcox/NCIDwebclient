# Readme

## NEW STUFF in 0.0.9
- will continually try to reconnect to ncidd server -- no more need to restart NCIDwebclient node server every time you restart ncidd
- ability to send messages through web broswer
- version of NCIDwebclient shown in browser
- version of NCIDD server shown in browser
- notification in browser for NCIDwebclient server status and NCIDD server status
- 12/24 hour time support
- config file for setting configuration -- no more digging through source code to set ncidd IP address:port
- Line value shows for messages 

### Note 

- The steps below assume you have installed, or will be installing, into the directory `~/ncid-web-client`. It can be any directory you'd like.  
- It is recommended, but not required, that you perform the installation on the same computer that is running the `ncidd` server.

### Upgrade 

- ***copy all files (including config
  directory) over to the same directory (e.g., `~/ncid-web-client`)***
- ***`cd ~/ncid-web-client`***  
- ***`npm install`***  
- *** edit config/default.json to have IP address of your NCID server***  
- can set other config values as well in default.json  
- ***`node node_ncid.js`*** 

### Full Install

- Requirements:
    - must have node.js version of 0.12.6 or greater  

    - for Raspberry Pi running wheezy, use v0.12.6  
    > see https://learn.adafruit.com/node-embedded-development/installing-node-dot-js to add adafruit repository with a compatible version  

- install node.js from repository

- copy NCIDwebclient files into a directory, e.g., `~/ncid-web-client`
- ***`cd ~/ncid-web-client`***  
- ***`npm install`***  
- *** edit config/default.json to have IP address of your NCID server***  
- can set other config values as well in default.json  
- ***`node node_ncid.js`*** 
- ***browse to your NCIDwebclientIPaddr:3000 and enjoy!***

### Run as a background process

- If you want to have NCIDwebclient running all the time (even if you log out of the window you started `node_ncid.js` in), install node package `forever` globally. 

    - `npm install forever -g`  

    - `cd ~/ncid-web-client`  

    - `forever start node_ncid.js`  

- N.B.: The above steps should keep NCIDwebclient running as long as the machine is not rebooted.  
   
- To check if node_ncid.js is running:  

    - `forever list` 

### Autostart

- If you want NCIDwebclient to be started automatically on boot, install node package `forever-service` globally. These steps will provision a service 'NCIDwc' running the `node_ncid.js` script:

    - `sudo npm install forever-service -g`  
    
    - `cd ~/ncid-web-client`  

    - `sudo forever-service install NCIDwc --script node_ncid.js`  

- To check if node_ncid.js is running:  

    - `forever list` 
    
- To delete the service:  

    - `sudo forever service delete NCIDwc`


#License
NCIDwebclient is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation; either version 2 of the License, or (at your option) any later version.

NCIDwebclient is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program; if not, write to the Free Software Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA