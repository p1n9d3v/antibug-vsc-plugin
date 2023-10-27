(function () {
  const vscode = acquireVsCodeApi();

  window.onload = () => {
    vscode.postMessage({
      type: "init",
    });
  };

  const compileButton = document.querySelector(".compile button");
  compileButton.addEventListener("click", () => {
    const selectedSolFile = document.querySelector(".compile__sol-files").value;
    vscode.postMessage({
      type: "compile",
      payload: {
        file: selectedSolFile,
      },
    });
  });

  window.addEventListener("message", ({ data }) => {
    const { type, payload } = data;

    switch (type) {
      case "init": {
        const { solFiles } = payload;
        const solFileOptions = solFiles.map(({ path }) => {
          const option = document.createElement("option");
          option.value = path;
          option.innerText = path.split("/").pop();
          return option;
        });

        const selectElement = document.querySelector(".compile__sol-files");
        selectElement.replaceChildren(...solFileOptions);
        break;
      }

      case "compileResult": {
        const { abis, bytecodes } = payload;
        const abiButton = document.querySelector(".compile-info__abi");
        const bytecodeButton = document.querySelector(
          ".compile-info__bytecodes"
        );

        abiButton.addEventListener("click", () => {
          navigator.clipboard.writeText(JSON.stringify(abis, null, 2));
        });
        bytecodeButton.addEventListener("click", () => {
          navigator.clipboard.writeText(bytecodes);
        });
        break;
      }
    }
  });
})();
