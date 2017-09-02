const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const deepEqual = require('fast-deep-equal');
const winston = require('winston')
const sheetsy = require('sheetsy');
const { urlToKey, getWorkbook, getSheet } = sheetsy;

const sheetURL = process.env.GSHEET_URL;
const defaultRefreshInterval = 30000;
const refreshInterval = Number(process.env.REFRESH_INTERVAL) || defaultRefreshInterval;

var oldData = {};

app.set('port', (process.env.PORT || 3000));

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

    // We then use Promise.all to return when all the child promises have resolved
    return Promise.all(aggregatedData)
  } catch (e) {
    winston.log('error', e);
  }
}

const cleanSheetData = async function(data) {
  //Return an object with individual sheet data keyed to their name
  const cleanData = data.reduce((object, sheet) => {

    const headerRow = sheet.rows[0];
    // This array should include only the gSheet column names...
    const sheetColumnNames = Object.keys(headerRow);
    // ...but, for reasons I don't understand there's twice the number of keys
    // needed so we find the length of the array and shave the first half off
    const relevantLength = sheetColumnNames.length / 2;
    const trueColumnNames = sheetColumnNames.slice(relevantLength);

    // Now reduce through the rows to create an array of row objects
    const rowArray = sheet.rows;
    const restructuredRows = rowArray.reduce((object, row, index) => {

      // Create an object for each row where the
      // values are keyed to column headers
      const keyedRow = row.reduce((object, cell, index) => {
        const columnNameFromIndex = trueColumnNames[index];
        object[columnNameFromIndex] = cell;
        return object;
      }, {});

      object.push(keyedRow);
      return object;
    }, []);

    object[sheet.name] = restructuredRows;
    return object;
  }, {});

  return cleanData;
};

// Push results to clients
const pushDataToClient = function pushDataToClient(data) {
  io.emit('data', data);
  winston.log('info', 'Pushed to client');
};

const getAndPushData = async function getAndPushData(sheetKey) {
  try {
    const newData = await getSheetData(sheetKey);
    const cleanData = await cleanSheetData(newData);

    // TODO: Fix the weird double negative here
    const dataUnchanged = deepEqual(oldData, cleanData);
    if (!dataUnchanged) {
      winston.log('info', 'Data changed');
      pushDataToClient(cleanData);
      oldData = cleanData;
    } else {
      winston.log('info', 'Data unchanged');
      return;
    }
  } catch (e) {
    winston.log('error', e);
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
  winston.log('info', 'client connected')
  pushDataToClient(oldData);
});

// Return 404 for all requests to the server
app.get('/', (req, res) => {
  res.sendStatus(404);
})

// Start the server
http.listen(app.get('port'), () => {
  winston.log('info', 'App started.')
});
