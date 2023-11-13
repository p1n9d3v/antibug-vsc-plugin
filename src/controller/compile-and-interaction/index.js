const vscode = acquireVsCodeApi();
const oldState = vscode.getState();

(function () {
  let currentAccount = {};
  let selectedContract = {};

  $(window).ready(() => {
    vscode.postMessage({
      type: "init",
    });
  });

  $(".compile__run").click(() => {
    $(".compile__run").addClass("loading");
    const selectedSolFile = $(".compile__files select").val();
    vscode.postMessage({
      type: "compile",
      payload: {
        file: selectedSolFile,
      },
    });
  });

  $(".compile__files select").change((event) => {
    const path = event.target.value;
    vscode.postMessage({
      type: "changeFile",
      payload: {
        path,
      },
    });
  });

  $(".interaction__from-list select").change((event) => {
    const privateKey = event.target.value;
    const optionElement = $(event.target).find(`option[value="${privateKey}"]`);
    const address = optionElement.text().split("(")[0];
    const balance = optionElement.text().split("(")[1].split(")")[0];

    currentAccount = {
      address,
      privateKey,
      balance,
    };

    vscode.postMessage({
      type: "changeAccount",
      payload: {
        address,
        privateKey,
        balance,
      },
    });
  });

  $(".interaction__from .copy").click(() => {
    console.log(currentAccount.address);
    navigator.clipboard.writeText(currentAccount.address);
  });

  $(".interaction__value-amount").change(() => {
    let value = $(".interaction__value-amount input").val();
    const regex = /^[0-9]*$/;
    if (!regex.test(value)) {
      value = "0";
      $(".interaction__value-amount input").val("0");
      return;
    }
    if (Number(value) > Number(currentAccount.balance)) {
      return;
    }
    const type = $(".interaction__value-amount select").val();
    switch (type) {
      case "eth": {
        value = String(Number(value) * 10 ** 18);
        break;
      }
      case "gwei": {
        value = String(Number(value) * 10 ** 9);
        break;
      }
    }

    vscode.postMessage({
      type: "changeValue",
      payload: {
        value,
      },
    });
  });

  $(".deploy__run-show-arguments").click(() => {
    $(".deploy__arguments").toggleClass("hidden");

    $(".deploy__run-show-arguments").toggleClass("rotate");

    const deployArgumentsElement = $(".deploy__arguments");
    if (!deployArgumentsElement.hasClass("hidden")) {
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
    const value = $(".interaction__value-amount input").val();
    const gasLimit = $(".interaction__gas input").val();
    const fromPrivateKey = $(".interaction__from-list select").val();

    const deployArgumentsElement = $(".deploy__arguments");
    const deployArguments = [];
    deployArgumentsElement
      .find(".deploy__argument input")
      .each((index, input) => {
        deployArguments.push(input.value);
      });

    vscode.postMessage({
      type: "deploy",
      payload: {
        value,
        gasLimit,
        fromPrivateKey,
        contract: selectedContract,
        deployArguments,
      },
    });

    $(".interaction__value-amount input").val("0");
    vscode.postMessage({
      type: "changeValue",
      payload: {
        value: "0",
      },
    });
  });

  $(".deploy__info-abi").click(() => {
    if (Object.keys(selectedContract).length === 0) return;
    navigator.clipboard.writeText(JSON.stringify(selectedContract.abis));
  });

  $(".deploy__info-bytecodes").click(() => {
    if (Object.keys(selectedContract).length === 0) return;
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

        setAccounts(accounts);

        break;
      }
      case "changeAccountState": {
        const { accounts } = payload;
        setAccounts(accounts);
        break;
      }
      case "compileResult": {
        const { contracts } = payload;
        if (contracts) {
          const contractNames = Object.keys(contracts);
          const contractsSelectElement = $(".deploy__contracts select");
          contractsSelectElement.empty();

          contractNames.forEach((contractName) => {
            const optionElement = $("<option></option>");
            optionElement.val(
              JSON.stringify({
                name: contractName,
                ...contracts[contractName],
              })
            );
            optionElement.text(contractName);

            contractsSelectElement.append(optionElement);
          });

          selectedContract = {
            name: contractNames[0],
            ...contracts[contractNames[0]],
          };

          changeDeployButtonColor(selectedContract);
          makeContractArgumentsView(selectedContract);
        }

        $(".compile__run").removeClass("loading");
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
          <input  type="text" />
        </div
      `);
      });
    } else {
      $(".deploy__run-show-arguments svg")
        .removeClass("fa-chevron-down")
        .addClass("fa-minus");
    }
  }

  function setAccounts(accounts) {
    const fromSelectElement = $(".interaction__from-list select");

    fromSelectElement.empty();
    accounts.forEach(({ address, balance, privateKey }) => {
      const optionElement = $("<option></option>");
      optionElement.val(privateKey);
      optionElement.text(`${address}(${balance})`);

      fromSelectElement.append(optionElement);
    });
    if (Object.keys(currentAccount).length === 0) {
      currentAccount = {
        address: accounts[0].address,
        privateKey: accounts[0].privateKey,
        balance: accounts[0].balance,
      };
    }
    fromSelectElement.val(currentAccount.privateKey);
  }
})();
