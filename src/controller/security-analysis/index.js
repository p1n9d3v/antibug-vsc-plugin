const vscode = acquireVsCodeApi();
const oldState = vscode.getState();

(function () {
  $(window).ready(() => {
    vscode.postMessage({
      type: "init",
    });
  });

  $(".analysis__run").click(() => {
    const selectedLanguages = [];
    $(".language__list input[name=language]:checked").each(function () {
      const value = $(this).siblings(".language__text").text();
      selectedLanguages.push(value);
    });

    const selectedSolFile = $(".analysis__files select").val();
    const selectedRules = [];
    $(".rule__list input[name=checkbox]:checked").each(function () {
      const value = $(this).siblings(".rule__text").text();
      selectedRules.push(value);
    });

    if (selectedLanguages.length === 0) {
      vscode.postMessage({
        type: "error",
        payload: {
          errMsg: "Please select a language type.",
        },
      });
    } else if (selectedRules.length === 0) {
      vscode.postMessage({
        type: "error",
        payload: {
          errMsg: "Please select one or more rules.",
        },
      });
    } else {
      const languagesString = selectedLanguages.join(" ");
      const rulesString = selectedRules.join(" ");

      vscode.postMessage({
        type: "analysis",
        payload: {
          selectedLanguages: languagesString,
          selectedRules: rulesString,
          selectedSolFile,
        },
      });
    }
  });

  $(".audit-report").click(() => {
    vscode.postMessage({
      type: "auditReport",
      payload: {},
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

      case "": {
        const { result } = payload;
        break;
      }
    }
  });
})();
