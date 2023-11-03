const vscode = acquireVsCodeApi();
const oldState = vscode.getState();

(function () {
  let selectedFromAddress = "";

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

  $(".interaction__from-list select").change((event) => {
    const privateKey = event.target.value;
    const option = $(event.target).find(`option[value="${privateKey}"]`);
    const address = option.text().split("(")[0];
    selectedFromAddress = address;
  });

  // from address copy
  $(".interaction__from .copy").click(() => {
    navigator.clipboard.writeText(selectedFromAddress);
  });

  window.addEventListener("message", ({ data: { type, payload } }) => {
    switch (type) {
      case "init": {
        const { accounts, solFiles } = payload;
        solFiles.forEach(({ path }) => {
          const option = $("<option></option>");
          option.val(path);
          option.text(path.split("/").pop());

          $(".compile__files").append(option);
        });

        accounts.forEach(({ address, balance, privateKey }) => {
          const option = $("<option></option>");
          option.val(privateKey);
          option.text(`${address}(${balance})`);

          $(".interaction__from select").append(option);
        });
        selectedFromAddress = accounts[0].address;
      }

      case "compileResult": {
        console.log(type, payload);
      }
    }
  });

  // window.addEventListener("message", ({ data }) => {
  //   const { type, payload } = data;

  //   switch (type) {

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
