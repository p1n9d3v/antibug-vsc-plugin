const vscode = acquireVsCodeApi();
const oldState = vscode.getState();
(function () {
  window.onload = () => {
    vscode.postMessage({
      type: "init",
    });
  };

  const compileButton = document.querySelector(".compile__compile button");
  compileButton.addEventListener("click", () => {
    const selectedSolFile = document.querySelector(
      ".compile__compile select"
    ).value;
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
        const { accounts, solFiles } = payload;
        const solFileOptions = solFiles.map(({ path }) => {
          const option = document.createElement("option");
          option.value = path;
          option.innerText = path.split("/").pop();
          return option;
        });

        const solFilesSelect = document.querySelector(
          ".compile__compile select"
        );

        const fromAddressOptions = accounts.map(
          ({ address, balance, privateKey }) => {
            const option = document.createElement("option");
            option.value = privateKey;
            option.innerText = `${address}(${balance})`;
            return option;
          }
        );

        solFilesSelect.replaceChildren(...solFileOptions);
        const fromAddressSelect = document.querySelector(
          ".from__select select"
        );
        fromAddressSelect.replaceChildren(...fromAddressOptions);

        break;
      }

      case "compileResult": {
        const { abis, bytecodes } = payload;
        const abiButton = document.querySelector(".compile-info__abi");
        const bytecodeButton = document.querySelector(
          ".compile-info__bytecodes"
        );

        const deployDiv = document.querySelector(".deploy");

        abiButton.addEventListener("click", () => {
          navigator.clipboard.writeText(JSON.stringify(abis, null, 2));
        });
        bytecodeButton.addEventListener("click", () => {
          navigator.clipboard.writeText(bytecodes);
        });

        const compile = {
          abis,
          bytecodes,
        };
        vscode.setState({
          compile,
        });

        break;
      }
    }
  });
})();
