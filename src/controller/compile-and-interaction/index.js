const vscode = acquireVsCodeApi();
const oldState = vscode.getState();

(function () {
  let selectedFromAddress = "";
  let selectedContract = {};

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
    const optionElement = $(event.target).find(`option[value="${privateKey}"]`);
    const address = optionElement.text().split("(")[0];
    selectedFromAddress = address;
  });

  $(".interaction__from .copy").click(() => {
    navigator.clipboard.writeText(selectedFromAddress);
  });

  $(".deploy__run-show-arguments").click(() => {
    $(".deploy__arguments").toggleClass("hidden");

    $(".deploy__run-show-arguments").toggleClass("rotate");

    const deployArgumentsElement = $(".deploy__arguments");
    if (deployArgumentsElement.hasClass("hidden")) {
      $("html, body").animate({ scrollTop: 0 }, "fast");
    } else {
      $("html, body").animate(
        { scrollTop: $(document).height() },
        "fast",
        "swing"
      );
    }
  });

  $(".deploy__contracts select").change((event) => {
    const contract = JSON.parse(event.target.value);

    selectedContract = contract;
    changeDeployButtonColor(selectedContract);
    makeContractArgumentsView(selectedContract);
  });

  $(".deploy__run-deploy").click(() => {
    console.log(selectedContract);
  });

  $(".deploy__info-abi").click(() => {
    navigator.clipboard.writeText(JSON.stringify(selectedContract.abis));
  });
  $(".deploy__info-bytecodes").click(() => {
    navigator.clipboard.writeText(selectedContract.bytecodes);
  });

  window.addEventListener("message", ({ data: { type, payload } }) => {
    switch (type) {
      case "init": {
        const { accounts, solFiles } = payload;

        solFiles.forEach(({ path }) => {
          const optionElement = $("<option></option>");
          optionElement.val(path);
          optionElement.text(path.split("/").pop());

          $(".compile__files select").append(optionElement);
        });

        accounts.forEach(({ address, balance, privateKey }) => {
          const optionElement = $("<option></option>");
          optionElement.val(privateKey);
          optionElement.text(`${address}(${balance})`);

          $(".interaction__from select").append(optionElement);
        });

        selectedFromAddress = accounts[0].address;

        break;
      }

      case "compileResult": {
        const { contracts } = payload;

        const contractNames = Object.keys(contracts);
        const contractsSelectElement = $(".deploy__contracts select");
        contractsSelectElement.empty();

        contractNames.forEach((contractName) => {
          const optionElement = $("<option></option>");
          optionElement.val(JSON.stringify(contracts[contractName]));
          optionElement.text(contractName);

          contractsSelectElement.append(optionElement);
        });

        selectedContract = contracts[contractNames[0]];

        changeDeployButtonColor(selectedContract);
        makeContractArgumentsView(selectedContract);
        break;
      }
    }
  });

  function changeDeployButtonColor(selectedContract) {
    const { abis } = selectedContract;
    const constructorInputs = abis[0];

    if (
      constructorInputs.type === "constructor" &&
      constructorInputs.stateMutability === "payable"
    ) {
      $(".deploy__run-deploy").css({
        background: "var(--button-background-tertiary)",
      });
    } else {
      $(".deploy__run-deploy").css({
        background: "var(--button-background-primary)",
      });
    }
  }

  function makeContractArgumentsView(selectedContract) {
    const { abis } = selectedContract;
    const constructorInputs = abis[0];

    const deployArgumentsDivElement = $(".deploy__arguments");
    deployArgumentsDivElement.empty();

    if (
      constructorInputs.type === "constructor" &&
      constructorInputs.inputs.length > 0
    ) {
      $(".deploy__run-show-arguments svg")
        .removeClass("fa-minus")
        .addClass("fa-chevron-down");
      constructorInputs.inputs.forEach((input) => {
        const { name, type } = input;
        deployArgumentsDivElement.append(`
        <div class="deploy__argument">
          <div class="deploy__argument-info">
            <div class="type">${type}</div> <div class="name">${name}</div>
          </div>
          <input type="text" />
        </div
      `);
      });
    } else {
      $(".deploy__run-show-arguments svg")
        .removeClass("fa-chevron-down")
        .addClass("fa-minus");
    }
  }

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
