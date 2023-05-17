// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, Notification } = require("electron");
const DownloadManager = require("electron-download-manager");
const exec = require("child_process").exec;
const path = require("path");
const { google } = require('googleapis');
const customsearch = google.customsearch('v1');

const axios = require('axios');
const cheerio = require('cheerio');

const {Builder, Browser, By, Key, until} = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

const API_KEY = 'AIzaSyAGU8VlGdfd4h6R99scoD8ph0UoIugETH0';
const CX = '54ede4d7347744cb6';
// const CX = 'f1983f55b40a34a01';

const numResults = 5;

const nodeConsole = require("console");
const myConsole = new nodeConsole.Console(process.stdout, process.stderr);
let child;

let driver;

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
app.whenReady().then(async() => {
  createWindow();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  let options = new chrome.Options();
  options.addArguments('--headless');
  driver = await new Builder()
    .forBrowser(Browser.CHROME)
    // .setChromeOptions(options)
    .build();

  await driver.get('https://www.google.com/ncr');
  driver.findElement(By.id("L2AGLb"))
    .then(acceptButton => {
      acceptButton.click();
    })
    .catch(error => {
      console.log("no accept button");
    })
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
  const extensions = [".mp4", ".mkv"];
  try {
    const response = await axios.get(wUrl);
    const $ = cheerio.load(response.data);
  
    const videoTags = $('video');
    const aTags = $('a');
    
    videoSources = [];

    aTags.each((index, element) => {
      let sourceUrl = $(element).attr("href");
      if (sourceUrl){
        if (sourceUrl.indexOf(".mp4") != - 1 || sourceUrl.indexOf(".mkv") != -1) {
          if (sourceUrl.charAt(0) == "/") sourceUrl = sourceUrl.substring(1);
          if (getDomainName(sourceUrl) == "") sourceUrl = wUrl + sourceUrl;
          let fname = "";
          let splitLink = sourceUrl.split("/");
          if (splitLink.length) {
            fname = splitLink[splitLink.length - 1];
          }
          videoSources.push({
            sourceUrl,
            fname
          })
        }
      }
    })

    videoTags.each((index, element) => {
      let sourceUrl = $(element).attr('src');
      if (!sourceUrl) {
        if ($(element).find("source").attr('src')) sourceUrl = $(element).find("source").attr('src');
        else sourceUrl = "";
      }
      let fname = "";
      let splitLink = sourceUrl.split("/");
      if (splitLink.length) {
        fname = splitLink[splitLink.length - 1];
      }
      videoSources.push({
        sourceUrl,
        fname
      });
    })

    return videoSources;
  } catch (err) {
    console.error(err);
    return [];
  }
}

function getDomainName(url) {

  var domain = '';
  
  if (url.indexOf("http") != -1 || url.indexOf("https") != -1 || url.indexOf("ftp") != -1) {
    // find & remove protocol (http, ftp, etc.) and get domain
    if (url.indexOf("://") > -1) {
      domain = url.split('/')[2];
    }
    else {
      domain = url.split('/')[0];
    }
    // remove port number if there is one
    domain = domain.split(':')[0];

  } 
  return domain;
}

ipcMain.handle("send_search_query_test", async (event, movie_name) => { //Test

  console.log(`Received from frontend: ${movie_name}`);
  
    try {
      await driver.findElement(By.name('q')).sendKeys(`-inurl:htm -inurl:html intitle:"index of" (avi|mp4|mkv) "${movie_name}"`, Key.RETURN);
      await driver.wait(until.titleIs(`-inurl:htm -inurl:html intitle:"index of" (avi|mp4|mkv) "${movie_name}" - Google Search`), 4000);

      let stackRes = [];
      let pageSource = await driver.getPageSource();
      let $ = cheerio.load(pageSource);
      let urlLists = [];
      console.log($("a").length);
      $("#rso").find("a").each(async (index, aTag) => {
        let wUrl = $(aTag).attr("href");
        let domain = getDomainName(wUrl);
        if (domain && domain.indexOf("google.com") == -1) {
          if (wUrl.charAt(wUrl.length - 1) != "/") wUrl += "/";
          urlLists.push(wUrl);
        }
      })

      for(let eUrl of urlLists) {
        console.log(eUrl);
        const mlists = await getMovieFileFromWebsiteUrl(eUrl, eUrl);
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

      return {
        status: "success",
        data: stackRes
      }
    } finally {
      // await driver.quit();
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


ipcMain.on("download_request", (event, url) => {
  // const options = {
  //   url: url,
  //   onProgress: (percent) => {
  //     console.log(`Download progress: ${percent}%`);
  //   }
  // };

  DownloadManager.register({
    downloadFolder: app.getPath("downloads")
  });

  DownloadManager.download({
    url: url,
    onProgress: ((progress, item) => {
      console.log(progress);
      console.log(item);
    })
  }, function (error, info) {
    if (error) {
        console.log(error);
        return;
    }

    console.log("DONE: " + info.url);
});
});

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
