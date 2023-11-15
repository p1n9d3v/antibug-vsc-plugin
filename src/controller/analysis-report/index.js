const vscode = acquireVsCodeApi();
const oldState = vscode.getState();

(function () {
  $(window).ready(() => {
    vscode.postMessage({
      type: "init",
    });
  });

  window.addEventListener("message", ({ data: { type, payload } }) => {
    switch (type) {
      case "init": {
        const { jsonData, mdData } = payload;
        console.log(jsonData);
        break;
      }
    }
  });
});
