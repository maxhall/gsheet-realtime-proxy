var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var tabletop = require('Tabletop');
var deepEqual = require('fast-deep-equal');
const sheetsy = require('sheetsy');
const { urlToKey, getWorkbook, getSheet } = sheetsy;

// Grab the environment variables
// TODO: Add defaults or catches for if none are set
const sheetURL = process.env.GSHEET_URL;
const refreshInterval = Number(process.env.REFRESH_INTERVAL);
const sheetKey = urlToKey(sheetURL);

// Returns a promise for all the data from the spreadsheet
const getSheetData = async function getSheetData(sheetKey) {
  try {
    const workbookObject = await getWorkbook(sheetKey);

    const sheetIds = workbookObject.sheets.map((sheetObject) => {
      return sheetObject.id;
    });

    // aggregatedData becomes an array of promises because it's async
    // which is necessary to call the async getSheet function within it
    const aggregatedData = sheetIds.map(async (sheetId) => {
      const sheetData = await getSheet(sheetKey, sheetId);
      return sheetData.name;
    })

    // Processes the array of promises
    return Promise.all(aggregatedData)
  } catch (e) {
    console.log(e);
  }
}

// Cleans up the data
// TODO: Actually clean it
const cleanSheetData = async function(data) {
  return data;
};

// Accepts two objects, compares them, returns true if they've changed
const hasDataChanged = function hasDataChanged(oldData, newData) {
  if (deepEqual(oldData, newData)) {
    console.log('Checked data: it has changed.');
    return true;
  } else {
    console.log('Checked data: it did not change.');
    return false;
  }
};

// TODO: Flesh  this out so that it runs the whole sequence
const runLoop = async function runLoop() {
  const newData = await getSheetData(sheetKey);
  console.log(newData);
}

// This effectively does it every refreshInterval
setInterval(() => {
  runLoop();
}, refreshInterval)

// Push results to clients
const pushDataToClient = function pushDataToClient(data) {
  io.emit('data', data);
};

// Return 404 for all requests to the server
app.get('/', (req, res) => {
  res.sendStatus(404);
})

// Start the server
http.listen(3000, () => {
  console.log('listening on *:3000');
});
