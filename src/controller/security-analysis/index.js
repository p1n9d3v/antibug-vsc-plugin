const vscode = acquireVsCodeApi();
const oldState = vscode.getState();

(function () {
  $(window).ready(() => {
    vscode.postMessage({
      type: "init",
    });
  });

  $(".analysis__run").click(() => {
    // $(".analysis__run").addClass("loading");
    const selectedLanguage = $(".language input:checked").val();
    const selectedSolFile = $(".analysis__files select").val();
    const selectedRule = $(".rule input:checked").val();

    vscode.postMessage({
      type: "analysis",
      payload: {
        selectedLanguage,
        selectedRule,
        selectedSolFile,
      },
    });
  });

  $(".analysis__files select").change((event) => {
    const path = event.target.value;
    vscode.postMessage({
      type: "changeFile",
      payload: {
        path,
      },
    });
  });

  window.addEventListener("message", ({ data: { type, payload } }) => {
    switch (type) {
      case "init": {
        const { solFiles } = payload;

        solFiles.forEach(({ path }) => {
          const optionElement = $("<option></option>");
          optionElement.val(path);
          optionElement.text(path.split("/").pop());

          $(".analysis__files select").append(optionElement);
        });
        break;
      }

      case "analysisResult": {
        const { result } = payload;
        break;
      }
    }
  });
})();
