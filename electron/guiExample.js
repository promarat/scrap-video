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
  // child.stdin.write(str);
  // child.stdout.on("data", (data) => {
  //   printBoth(
  //     `Following data has been piped from python program: ${data.toString(
  //       "utf8"
  //     )}`
  //   );
  // });
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

function tableCreate(searchResults) {
  var resultWrap = document.getElementById('result-wrap');
  var html = "";
  for (let eRes of searchResults) {
    html += `
    <div class="card-list">
      <a href="${eRes.wUrl}">
      <div class="card-content">
        <div class="thumbnail">
          <video src="${eRes.sourceUrl}"></video>
        </div>
      </div>
      <h5 class="movie-title">
        ${eRes.title}
      </h5>
      </a>
      <button class="download-btn">Download</button>
    </div>`;
  }
  var tmpObj=document.createElement("div");
  tmpObj.innerHTML = html;
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
  sendToProgram(stringToSend);
};

const sendDownloadRequest = (e) => {
  console.log(e);
}


document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("send_code")
    .addEventListener("click", sendCodeFunction);

  document
    .querySelectorAll(".download-btn")
    .addEventListener("click", sendDownloadRequest)
});
