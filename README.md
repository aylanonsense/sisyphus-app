sisyphus-app
============

A node app that's doomed to fail. (Just a test environment to learn Node.js)

Setup
-----
1. Download and install Node.js (http://nodejs.org/download/)
	- Add Node.js location to PATH variable if not done by installer (done be default)
2. Restart bash
3. Call the following in bash (more setup/use instructions at https://github.com/remy/nodemon):
$ npm install -g nodemon

Running the app
---------------
1. Navigate into your top level sisyphus-app folder.
2. Run app.js with using Node:
$ node app.js
   You should see the message "Game server is running..."
3. Navigate in browser to http://127.0.0.1:3000/
4. Highlight the rectangular game area and press ENTER, this will spawn your square movable with WASD
5. Repeat steps 3 and 4 in a new browser for multiplayer square moving


Production status
-----------------
Check it out [here](http://bridgs-sisyphus-app.jit.su/)

[![Nodejitsu Deploy Status Badges](https://webhooks.nodejitsu.com/bridgs/sisyphus-app.png)](https://webops.nodejitsu.com#bridgs/sisyphus-app)
