var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var tabletop = require('Tabletop');
var deepEqual = require('fast-deep-equal');

// Grab the environment variables
// TODO: Add defaults or catches for if none are set
const sheetURL = process.env.GSHEET_URL;
const refreshInterval = Number(process.env.REFRESH_INTERVAL);

let oldData = {};

const getDataFromSheet = function getDataFromSheet(sheetURL) {
  // Add error handling here. The server should not crash if Google doesn't
  // respond or the URL is wrong
  tabletop.init({
    key: sheetURL,
    callback: cleanData,
    simpleSheet: false,
    debug: true
  });
};

const cleanData = function cleanData(data, tabletop) {
  // TODO: Check the sent structure iterate through each sheet and add them to the returned object
  //presData = data.pres.elements;
  return data;
};

const hasDataChanged = function hasDataChanged(oldData, newData) {
  if (deepEqual(oldData, newData)) {
    console.log('Checked data: it has changed.');
    return true;
  } else {
    console.log('Checked data: it did not change.');
    return false;
  }
};

// Push results to clients
const pushDataToClient = function pushDataToClient(data) {
  io.emit('data', data);
};

const init = function init(sheetURL, refreshInterval) {
  console.log('Initiated.');
  getDataFromSheet(sheetURL);
  setInterval((sheetURL) => {
    console.log('Before fetch' + sheetURL);
    //newData = getDataFromSheet(sheetURL);
    console.log('Got data from spreadsheet');
    if (hasDataChanged(oldData, newData)) {
      // TODO: Make oldData = newData;
      pushDataToClient();
      console.log('Pushed data to the client');
    }
  }, refreshInterval);

  io.on('connection', (socket) => {
    pushDataToClient();
  });
};

init(sheetURL, refreshInterval);

// Return 404 for all requests to the server
app.get('/', (req, res) => {
  res.sendStatus(404);
})

// Start the server
http.listen(3000, () => {
  console.log('listening on *:3000');
});
