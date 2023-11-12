const vscode = acquireVsCodeApi();
const oldState = vscode.getState();

(function () {
  $(window).ready(() => {
    vscode.postMessage({
      type: "init",
    });
  });

  $(".result__info-title").click(() => {
    $(".result__info-data").toggle("hidden");
    $(".result__info-title .fa-chevron-down").toggleClass("rotate");
  });
  // 솔직히 없어도 됌 ㅋㅋ 걍재미로 넣어봄

  window.addEventListener("message", ({ data: { type, payload } }) => {
    switch (type) {
      case "init": {
        const {
          contract: { name, address, balance },
          abis,
        } = payload;
        const functionsElement = $(".functions");
        functionsElement.empty();

        abis.forEach((abi) => {
          const functionElement = $(makeFunctionElement(abi));

          functionElement.find(".function__interaction input").change(() => {
            functionElement
              .find(".function__arguments input")
              .each((index, input) => {
                input.value = "";
              });
          });

          functionElement.find(".function__arguments input").change(() => {
            functionElement.find(".function__interaction input").val("");
          });

          functionElement.find("button").click(() => {
            const ineractionInput = functionElement
              .find(".function__interaction input")
              .val();
            const argumentsInput = functionElement
              .find(".function__arguments input")
              .map((index, input) => input.value)
              .toArray();

            const resultArguments = ineractionInput
              ? ineractionInput.split(",").map((input) => input.trim())
              : argumentsInput;

            const type =
              abi.stateMutability === "view" || abi.stateMutability === "pure"
                ? "call"
                : "send";
            vscode.postMessage({
              type,
              payload: {
                address,
                functionName: abi.name,
                arguments: resultArguments,
              },
            });
          });
          $(".contract__address").text(`Address: ${address}`);
          $(".contract__balance").text(`Balance: ${balance}`);

          functionsElement.append(functionElement);
        });

        // animation
        interactionButtonAnimation();

        break;
      }
      case "changeContractBalance": {
        const { balance } = payload;

        $(".contract__balance").text(balance);
        break;
      }

      case "transactionResult": {
        const {
          amountSpent,
          totalSpent,
          from,
          to,
          executedGasUsed,
          decodeInput,
        } = payload;
        break;
      }
    }
  });
})();

function interactionButtonAnimation() {
  const functionElements = $(".function");
  functionElements.each((index, element) => {
    element = $(element);
    element.find(".function__show-arguments").click(() => {
      element.find(".function__arguments").toggleClass("hidden");
      element
        .find(".function__show-arguments .fa-chevron-down")
        .toggleClass("rotate");
      const argumentsElement = element.find(".function__arguments");
      if (
        argumentsElement.length > 0 &&
        !element.find(".function__arguments").hasClass("hidden")
      ) {
        element.find(".function__interaction input").addClass("hidden");
        element.find(".function__interaction button").addClass("stretch");
      } else {
        element.find(".function__interaction input").removeClass("hidden");
        element.find(".function__interaction button").removeClass("stretch");
      }
    });
  });
}

function makeFunctionElement(abi) {
  const inputs = abi.inputs
    .map((input) => `${input.type} ${input.name}`)
    .join(", ");
  return `
    <div class="function">
      <div class="function__interaction">
        <button class=${abi.stateMutability}>${abi.name}</button>
        ${abi.inputs.length > 0 ? `<input  placeholder="${inputs}"/>` : ""}
          ${
            abi.inputs.length > 1
              ? `
          <div class="function__show-arguments">
            <i class="fa fa-chevron-down"></i>
          </div>`
              : ""
          }
      </div>
      ${
        abi.inputs.length > 0
          ? `<div class="function__arguments hidden">
        ${abi.inputs
          .map(
            (input) => `
                <div class="function__argument">
                  <div>${input.type} ${input.name}</div>
                  <input />
                </div>
              `
          )
          .join("")}
        </div>`
          : ""
      }
    </div>
  `;
}
