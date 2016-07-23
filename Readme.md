# Introduction
NCIDwebclient is a simple [NCID client](ncid.sourceforge.net) (Network Caller ID) in node.js.  You must have an NCID server running on your local network to use this software.  NCIDwebclient establishes a connection (TCP socket) to an NCID server and uses socket.io from node.js to a webpage to update a webpage in real-time as calls/messages/etc. arrive.  Multiple browsers on the same/different computers may simultaneously connect to the node.js webserver.

#To install/run:

- Install node.js from repository (i.e. apt-get, yum, etc. as appropriate for your OS)
- Place a copy the NCIDwebclient files into an empty directory named NCIDwebclient
- Run npm install from within the NCIDwebclient directory to install all node.js dependecies.  Notes:
    - Must have node.js version of 0.12.6 or greater
    - For Raspberry Pi running Wheezy, have only tested with v0.12.6
    - See https://learn.adafruit.com/node-embedded-development/installing-node-dot-js to add an Adafruit repository with a compatible version
- edit index.js to have IP address of your NCID server (repository assumes NCIDwebclient is running on same system as NCID server and, therefore, has the IP set as localhost; change if needed)
- Start NCIDwebclient
    - node index.js
- Browse to your NCIDserverIPaddress:3000 and enjoy!

If you want to have NCIDwebclient running all the time (even if you log out of the terminal window you started index.js in), install node package forever:

- npm install forever -g

Command line use from the NCIDwebclient main directory:

- forever start index.js

#License
NCIDwebclient is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation; either version 2 of the License, or (at your option) any later version.

NCIDwebclient is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program; if not, write to the Free Software Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA
