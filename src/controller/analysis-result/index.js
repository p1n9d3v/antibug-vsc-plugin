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
        const { OutputDirectoryPath } = payload;
        const CallgraphElement = $(".Callgraph");
        const CallgraphPath =
          OutputDirectoryPath + "/call_graph_results/call-graph.png";
        console.log(CallgraphPath);
        CallgraphElement.append(`<img src="${CallgraphPath}" />`);
      }
      // case "AnalysisReport": {
      //   const { url } = payload;

      //   const iframe = document.querySelector(".ifram");
      //   iframe.src = url;
      //   break;
      // }
    }
  });
})();
