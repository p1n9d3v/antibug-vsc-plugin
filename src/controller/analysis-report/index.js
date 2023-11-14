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
        break;
      }

      case "printResult": {
        const { result } = payload;
        const resultElement = document.getElementsByClassName("result");

        break;
      }
    }
  });
});
