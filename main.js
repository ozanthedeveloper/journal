const {app, BrowserWindow, ipcMain} = require('electron');
const path = require("path");
const url = require("url");
const fs = require('fs');

const sqlite3 = require('sqlite3').verbose();

//Connect database
let db = new sqlite3.Database('./db/journal.db', sqlite3.OPEN_READWRITE, (err) => {});

//Create Table
db.run("CREATE TABLE IF NOT EXISTS journal (dailytext,dailydate)");

function startApp() {
    mainWindow = new BrowserWindow({
        minWidth:875,
        minHeight:625,
        maxWidth:875,
        maxHeight:625,
        /* The reason of why I didn't use resizable:false instead of 
        adding maxWidth and maxHeight attributes is, there is a issue.
        When I move the window, window height changes without a reason. */
        backgroundColor: '#0e1123',
        icon: __dirname + '/icon.ico',
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true
        }
    });

    mainWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, "dist/index.html"),
            protocol: "file",
            slashes: true
        })
    );
    mainWindow.setMenu(null);
}

app.on("ready", () => {
    startApp();
});

app.on('window-all-closed', () => {
    //Close Database
    db.close();

    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

//Add data to database
ipcMain.on("add", (err, data) => {
    //First Data => Journal text
    //Second Data => Date
    db.run("INSERT INTO journal VALUES (?,?)", [data[0], data[1]]);
});

let journalWindow;
function createShowWindow() {
    //Create a new window for show database records
    journalWindow = new BrowserWindow({
        minWidth:875,
        minHeight:600,
        icon: __dirname + '/icon.ico',
        backgroundColor: '#0e1123',
        webPreferences: {
            nodeIntegration: true
        }
    });
    journalWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, "dist/journal-records.html"),
            protocol: "file",
            slashes: true
        })
    );
    journalWindow.setMenu(null);
}

function showRecords(willDelete) {
    let journalTexts = [],
        journalDates = [];
    let openJournalWindow;
    let readCompleted = false;

    //Read all the records in database and add them into an array
    db.all("SELECT dailytext, dailydate FROM journal", [], (err, rows) => {
        rows.forEach((row) => {
            journalTexts.push(row.dailytext);
            journalDates.push(row.dailydate);
        });
        readCompleted = true;
    });
    openJournalWindow = setInterval(() => {
        if (readCompleted) {
            //Send array to new window
            createShowWindow();
            journalWindow.webContents.on('did-finish-load', ()=>{
                journalWindow.webContents.send("journal-datas", [journalTexts, journalDates, willDelete]);
            });
            clearInterval(openJournalWindow);
        }
    }, 10);
}

//Read journals
ipcMain.on("show", (event) => {
    showRecords("");
});

//Open Delete Window
ipcMain.on("delete", (event) => {
    showRecords("delete");
});

//Delete records from database
ipcMain.on("delete-clicked", (err, data) => {
    console.log(data);
    db.run("DELETE FROM journal WHERE dailytext = (?)", data);
});