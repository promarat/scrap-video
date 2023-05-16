// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, Notification } = require("electron");
const exec = require("child_process").exec;
const path = require("path");
const { google } = require('googleapis');
const customsearch = google.customsearch('v1');

const axios = require('axios');
const cheerio = require('cheerio');

const API_KEY = 'AIzaSyAGU8VlGdfd4h6R99scoD8ph0UoIugETH0';
const CX = '54ede4d7347744cb6';
const numResults = 30;

const nodeConsole = require("console");
const myConsole = new nodeConsole.Console(process.stdout, process.stderr);
let child;

function printBoth(str) {
  console.log("main.js:    " + str);
  myConsole.log("main.js:    " + str);
}

// Create the browser window.
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, "guiExample.js"),
      contextIsolation: true,
      nodeIntegration: true,
    },
  });

  // Load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, "guiExample.html"));

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
ipcMain.on("execute", (command) => {
  console.log("executing ls");
  child = exec("ls", function (error, stdout, stderr) {
    if (error !== null) {
      console.log("exec error: " + error);
    }
  });
});

ipcMain.on("open_json_file_sync", () => {
  const fs = require("fs");

  fs.readFile("config.json", function (err, data) {
    if (err) {
      return console.error(err);
    }
    printBoth("Called through ipc.send from guiExample.js");
    printBoth("Asynchronous read: " + data.toString());
  });
});

const getMovieFileFromWebsiteUrl = async (wUrl, title) => {
  console.log(wUrl);
  // const testUrl = "https://www.vdocipher.com/blog/2020/09/encrypted-video-streaming-vdocipher-technology-details/";
  try {
    const response = await axios.get(wUrl);
    const $ = cheerio.load(response.data);
  
    const videoTags = $('video');
    
    videoSources = [];
    videoTags.each((index, element) => {
      let sourceUrl = $(element).attr('src');
      if (!sourceUrl) {
        if ($(element).find("source").attr('src')) sourceUrl = $(element).find("source").attr('src');
        else sourceUrl = "";
      }
      videoSources.push({
        sourceUrl,
        title,
        wUrl
      });
    })

    return videoSources;
  } catch (err) {
    console.error(err);
    return [];
  }
}

ipcMain.handle("send_search_query_test", async (event, movie_name) => { //Test

  console.log(`Received from frontend: ${movie_name}`);
  let stackRes = [];
  try {
    const mlists = await getMovieFileFromWebsiteUrl("https://www.vdocipher.com/blog/2020/09/encrypted-video-streaming-vdocipher-technology-details/", "Secure Your Videos with Vdocipher Video Streaming Solution");
    if (mlists.length) {
      mlists.map((mlist) => {
        let fres = stackRes.filter((ers) => ers.sourceUrl == mlist.sourceUrl);
        if (!fres.length) {
          stackRes.push(mlist);
        }
      })
    }
    console.log(stackRes);
    return {
      status: "success",
      data: stackRes
    }

  } catch (error) {
    console.error(error);
    return {
      status: "failed",
      data: stackRes,
      message: error
    }
  }
})

ipcMain.handle("send_search_query", async (event, movie_name) => {

  console.log(`Received from frontend: ${movie_name}`);

  
  let stackRes = [];
  try {
    for (let startIndex = 0; ; startIndex++) {
      const res = await customsearch.cse.list({
        auth: API_KEY,
        cx: CX,
        q: `intitle:${movie_name}? mkv|mp4 ${movie_name} -html -htm -php -asp -jsp`,
        start: startIndex,
        num: 10
      });
      console.log("total", res.data.searchInformation.totalResults);
      let tenItems = res.data.items;
      for (let item of tenItems) {
        const mlists = await getMovieFileFromWebsiteUrl(item.link, item.title);
        if (mlists.length) {
          // stackRes = [...stackRes, ...mlists];
          mlists.map((mlist) => {
            let fres = stackRes.filter((ers) => ers.sourceUrl == mlist.sourceUrl);
            if (!fres.length) {
              stackRes.push(mlist);
            }
          })
        } 
      }
      console.log("===========================================");
      console.log(stackRes.length);
      console.log("===========================================");
      if (res.data.searchInformation.totalResults < (startIndex + 1) * 10 || stackRes.length >= numResults) break;
      console.log(res);
    }

    // console.log(res.data.searchInformation, res.data.items.length);
    console.log(stackRes);
    return {
      status: "success",
      data: stackRes
    }

  } catch (error) {
    console.error(error);
    return {
      status: "failed",
      data: stackRes,
      message: error
    }
  }
})

ipcMain.on("open_json_file_async", () => {
  const fs = require("fs");

  const fileName = "./config.json";
  const data = fs.readFileSync(fileName);
  const json = JSON.parse(data);

  printBoth("Called through ipc.send from guiExample.js");
  printBoth(
    `Data from config.json:\nA_MODE = ${json.A_MODE}\nB_MODE = ${json.B_MODE}\nC_MODE = ${json.C_MODE}\nD_MODE = ${json.D_MODE}`
  );
});
