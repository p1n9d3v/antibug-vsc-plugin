const vscode = acquireVsCodeApi();
const oldState = vscode.getState();
(function () {
  $(window).ready(() => {
    vscode.postMessage({
      type: "init",
    });
  });

  $(".compile__run").click(() => {
    const selectedSolFile = $(".compile__files select").val();
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
        solFiles.map(({ path }) => {
          const option = $("<option></option>");
          option.val(path);
          option.text(path.split("/").pop());

          $(".compile__files select").append(option);
        });
      }
    }
  });

  // window.addEventListener("message", ({ data }) => {
  //   const { type, payload } = data;

  //   switch (type) {
  //     case "init": {
  //       const { accounts, solFiles } = payload;
  //       const solFileOptions = solFiles.map(({ path }) => {
  //         const option = document.createElement("option");
  //         option.value = path;
  //         option.innerText = path.split("/").pop();
  //         return option;
  //       });

  //       const solFilesSelect = document.querySelector(".compile__files");
  //       console.log(solFileOptions);
  //       solFilesSelect.replaceChildren(...solFileOptions);

  //       const fromAddressOptions = accounts.map(
  //         ({ address, balance, privateKey }) => {
  //           const option = document.createElement("option");
  //           option.value = privateKey;
  //           option.innerText = `${address}(${balance})`;
  //           return option;
  //         }
  //       );

  //       const fromAddressSelect = document.querySelector(
  //         ".from__select select"
  //       );
  //       fromAddressSelect.replaceChildren(...fromAddressOptions);

  //       break;
  //     }

  //     case "compileResult": {
  //       const { abis, bytecodes } = payload;

  //       if (abis[0].type === "constructor") {
  //         const constructorStateMutability = abis[0].stateMutability;
  //         const deployButton = document.querySelector(".deploy__deploy");
  //         if (constructorStateMutability === "payable") {
  //           deployButton.classList.replace("button--primary", "button--third");
  //         } else {
  //           deployButton.classList.replace("button--third", "button--primary");
  //         }

  //         if (abis[0].inputs.length > 0) {
  //           const deployDiv = document.querySelector(".deploy");

  //           let argumentsDiv = document.querySelector(".arguments");
  //           argumentsDiv?.remove();
  //           argumentsDiv = document.createElement("div");
  //           argumentsDiv.classList.add("arguments", "hidden");

  //           const showArgumentsButton = document.querySelector(
  //             ".deploy__show-arguments"
  //           );
  //           showArgumentsButton.addEventListener("click", () => {
  //             argumentsDiv.classList.toggle("hidden");
  //           });

  //           abis[0].inputs.forEach((input) => {
  //             const [argumentDiv, argumentInput] = makeArgumentInput(input);
  //             argumentsDiv.appendChild(argumentDiv);
  //           });
  //           deployDiv.appendChild(argumentsDiv);
  //         }
  //       } else {
  //         const argumentsDiv = document.querySelector(".arguments");
  //         argumentsDiv?.remove();
  //         const deployButton = document.querySelector(".deploy__deploy");
  //         deployButton.classList.replace("button--third", "button--primary");
  //       }

  //       const abiButton = document.querySelector(".compile-info__abi");
  //       const bytecodeButton = document.querySelector(
  //         ".compile-info__bytecodes"
  //       );

  //       abiButton.addEventListener("click", () => {
  //         navigator.clipboard.writeText(JSON.stringify(abis, null, 2));
  //       });
  //       bytecodeButton.addEventListener("click", () => {
  //         navigator.clipboard.writeText(bytecodes);
  //       });

  //       const compile = {
  //         abis,
  //         bytecodes,
  //       };
  //       vscode.setState({
  //         compile,
  //       });

  //       break;
  //     }
  //   }
  // });
})();

function makeArgumentInput(input) {
  const { name, type } = input;
  const argumentDiv = document.createElement("div");
  argumentDiv.className = "argument";
  const argumentInfoDiv = document.createElement("div");
  argumentInfoDiv.className = "argument__info";

  const argumentInfoSpan = document.createElement("span");
  argumentInfoSpan.innerText = `${type} ${name}`;

  const argumentInput = document.createElement("input");

  argumentDiv.appendChild(argumentInfoDiv);
  argumentInfoDiv.appendChild(argumentInfoSpan);
  argumentDiv.appendChild(argumentInput);

  return [argumentDiv, argumentInput];
}
