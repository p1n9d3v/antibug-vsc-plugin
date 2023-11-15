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
        const { detectResultPath } = payload;
        jsonData = fs.readFileSync(detectResultPath, "utf8");
        const resultElement = $(".analysis__result");

        const parseData = JSON.parse(jsonData);
        parseData.array.forEach((element) => {
          resultElement.append(`<p>${element}</p>`);
        });
        break;
      }
    }
  });
});
