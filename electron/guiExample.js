const { exec } = require("child_process");
const nodeConsole = require("console");
const { ipcRenderer } = require("electron");

const terminalConsole = new nodeConsole.Console(process.stdout, process.stderr);
let child;

ipcRenderer.send("run-command", "ls");
ipcRenderer.on("run-command-result", (event, result) => {
  if (result.error) {
    console.error("Error:", result.error);
  } else {
    console.log("Output:", result.output);
  }
});

const printBoth = (str) => {
  console.log(`Javascript: ${str}`);
  terminalConsole.log(`Javascript: ${str}`);
};

const sendToProgram = (str) => {
  ipcRenderer.invoke("send_search_query", str).then((result) => {
    if (result.status == "success") {
      movieArray = result.data;
      tableCreate(movieArray);
      console.log(result, "result");
    } else {
      movieArray = result.data;
      tableCreate(movieArray);
      console.error(result.message);
    }
  });
};

const sendToProgramTest = (str) => { //Test
  ipcRenderer.invoke("send_search_query_test", str).then((result) => {
    if (result.status == "success") {
      movieArray = result.data;
      tableCreate(movieArray);
      console.log(result, "result");
    } else {
      movieArray = result.data;
      tableCreate(movieArray);
      console.error(result.message);
    }
  });
};

function tableTest(searchResults) {
  var resultWrap = document.getElementById('result-wrap');
  resultWrap.innerHTML = searchResults;
}

function tableCreate(searchResults) {
  var resultWrap = document.getElementById('result-wrap');
  var html = "";
  for (let eRes of searchResults) {
    console.log(eRes);
    html += `<button class="item-list" value="${eRes.sourceUrl}>${eRes.fname}</button>`;
  }
  console.log(html);
  resultWrap.innerHTML = html;
}

const startCodeFunction = () => {
  printBoth("Initiating program");

  child = exec("python -i ./python/pythonExample.py", (error) => {
    if (error) {
      printBoth(`exec error: ${error}`);
    }
  });

  child.stdout.on("data", (data) => {
    printBoth(
      `Following data has been piped from python program: ${data.toString(
        "utf8"
      )}`
    );
  });
};

const sendCodeFunction = () => {
  const stringToSend = document.getElementById("string_to_send").value;
  printBoth(`Sending "${stringToSend}" to program`);
  // sendToProgram(stringToSend); // Real
  sendToProgramTest(stringToSend); //Test
};

const sendDownloadRequest = (event) => {
  if (event.target.tagName === 'BUTTON') {
    const sUrl = event.target.value;
    ipcRenderer.send('download_request', sUrl);
  }
}


document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("send_code")
    .addEventListener("click", sendCodeFunction);

  document.getElementById("result-wrap")
    .addEventListener("click", sendDownloadRequest)
});
