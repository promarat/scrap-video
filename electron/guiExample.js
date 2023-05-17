const { ipcRenderer } = require("electron");

ipcRenderer.send("run-command", "ls");
ipcRenderer.on("run-command-result", (event, result) => {
  if (result.error) {
    console.error("Error:", result.error);
  } else {
    console.log("Output:", result.output);
  }
});

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

function tableCreate(searchResults) {
  var resultWrap = document.querySelector('#result-wrap');
  var html = "";
  var tRes = searchResults.length > 30 ? searchResults.slice(0, 30) : searchResults;
  for (let eRes of tRes) {
    console.log(eRes);
    html += `<button class="item-list" value="${eRes.sourceUrl}">${eRes.fname}</button>`;
  }
  resultWrap.innerHTML = html;
}

const sendCodeFunction = () => {
  const stringToSend = document.getElementById("string_to_send").value;
  sendToProgram(stringToSend);
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
