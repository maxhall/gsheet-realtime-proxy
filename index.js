var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var tabletop = require('Tabletop');

// Grab the environment variables
let sheetURL = process.env.GSHEET_URL;
let refreshInterval = process.env.REFRESH_INTERVAL;

console.log(sheetURL);
console.log(refreshInterval);

// General route
app.get('/', function(req, res) {
  res.sendStatus(404);
})

// Pull data from a google sheet every X seconds

var presData = {}

function getDataFromSheet() {
  tabletop.init({
    key: sheetURL,
    callback: processData,
    simpleSheet: false
  });
};

// Process the data
function processData(data, tabletop) {
  // Remove cruft and create usable object
  presData = data.pres.elements;
  // Compare new data with existing object

  // Push to clients if it's changed
  pushDataToClients( presData );
};

// Every X seconds...
getDataFromSheet();

// Push results to clients
function pushDataToClients() {
  io.emit('update', presData);
};

io.on('connection', function(socket){
  // Send the newly connected user the data
  pushDataToClients();
});

setInterval(function () {
  pushDataToClients();
}, refreshInterval);

// Start the server
http.listen(3000, function(){
  console.log('listening on *:3000');
});
