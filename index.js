var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var deepEqual = require('fast-deep-equal');
const sheetsy = require('sheetsy');
const { urlToKey, getWorkbook, getSheet } = sheetsy;

// Grab the environment variables
// TODO: Add defaults or catches for if none are set
const sheetURL = process.env.GSHEET_URL;
const refreshInterval = Number(process.env.REFRESH_INTERVAL);
const sheetKey = urlToKey(sheetURL);

var oldData = {};

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
      return sheetData;
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

// Push results to clients
const pushDataToClient = function pushDataToClient(data) {
  io.emit('data', data);
  console.log('Pushed to client.');
};

// TODO: Flesh  this out so that it runs the whole sequence
const getAndPushData = async function getAndPushData() {
  try {
    const newData = await getSheetData(sheetKey);
    const cleanData = await cleanSheetData(newData);
    // Everything works up until this point
    // TODO: Fix the weird double negative here
    const dataUnchanged = deepEqual(oldData, cleanData);
    if (!dataUnchanged) {
      console.log('Data changed.');
      pushDataToClient(cleanData);
      oldData = cleanData;
    } else {
      console.log('Data unchanged.');
      return;
    }
  } catch (e) {
    console.log('helllll yea');
  }
}

// This effectively does it every refreshInterval
setInterval(() => {
  getAndPushData();
}, refreshInterval)

// Push data to any newly connected users
// TODO: check whether this pushes to all connections or just the newly
// connected one
io.on('connection', function(socket){
  pushDataToClient();
});

// Return 404 for all requests to the server
app.get('/', (req, res) => {
  res.sendStatus(404);
})

// Start the server
http.listen(3000, () => {
  console.log('listening on *:3000');
});
