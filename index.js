var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var deepEqual = require('fast-deep-equal');
const sheetsy = require('sheetsy');
const { urlToKey, getWorkbook, getSheet } = sheetsy;

// TODO: Add defaults or catches for if none are set
const sheetURL = process.env.GSHEET_URL;
// Will refresh data from the spreadsheet every 30 seconds if not told otherwise
const defaultRefreshInterval = 30000;
const refreshInterval = Number(process.env.REFRESH_INTERVAL) || defaultRefreshInterval;

var oldData = {};

const getSheetData = async function getSheetData(sheetKey) {
  try {
    const workbookObject = await getWorkbook(sheetKey);

    const sheetIds = workbookObject.sheets.map((sheetObject) => {
      return sheetObject.id;
    });

    // aggregatedData becomes an array of promises because it's async
    // which is necessary to call the async getSheet function within it
    const aggregatedData = sheetIds.map(async (sheetId) => {
      console.log(sheetKey);
      const sheetData = await getSheet(sheetKey, sheetId);
      return sheetData;
    })

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

const getAndPushData = async function getAndPushData(sheetKey) {
  try {
    const newData = await getSheetData(sheetKey);
    const cleanData = await cleanSheetData(newData);

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
    throw (e);
  }
}

setInterval(() => {
  try {
    const sheetKey = urlToKey(sheetURL);
    getAndPushData(sheetKey);
  } catch (e) {
    throw (e);
  };
}, refreshInterval)

// TODO: check whether this pushes to all connections or just the new one
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
