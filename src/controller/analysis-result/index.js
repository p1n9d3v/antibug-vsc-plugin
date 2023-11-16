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
        const { port } = payload;
        console.log(port);
        // const iframe = document.getElementsByClassName("ifram");
        // iframe.src = `http://localhost:${port}`;
        // break;
      }
    }
  });
})();
