(function () {
  const vscode = acquireVsCodeApi();

  window.onload = () => {
    vscode.postMessage({
      type: "init",
    });
  };
  window.addEventListener("message", ({ data }) => {
    const { type, payload } = data;

    switch (type) {
      case "init": {
        const { solFiles } = payload;
        const solFileOptions = solFiles.map(({ path }) => {
          const option = document.createElement("option");
          console.log(path);
          option.value = path;
          option.innerText = path.split("/").pop();
          return option;
        });

        const selectElement = document.querySelector(".compile__sol-files");
        selectElement.replaceChildren(...solFileOptions);
      }
    }
  });
})();
