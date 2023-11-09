const vscode = acquireVsCodeApi();
const oldState = vscode.getState();

(function () {
  $(window).ready(() => {
    vscode.postMessage({
      type: "init",
    });
  });

  // 솔직히 없어도 됌 ㅋㅋ 걍재미로 넣어봄

  window.addEventListener("message", ({ data: { type, payload } }) => {
    switch (type) {
      case "init": {
        const { contractAddress, abis } = payload;
        const functionsElement = $(".functions");
        functionsElement.empty();

        abis.forEach((abi) => {
          const functionElement = $(makeFunctionElement(abi));

          functionElement.find("button").click(() => {
            const ineractionInput = functionElement
              .find(".function__interaction input")
              .val();
            const argumentsInput = functionElement
              .find(".function__arguments input")
              .map((index, input) => input.value)
              .toArray();

            const resultArguments =
              argumentsInput.length > 0 ? argumentsInput : ineractionInput;

            const type = abi.stateMutability === "view" ? "call" : "send";
            vscode.postMessage({
              type,
              payload: {
                contractAddress,
                functionName: abi.name,
                arguments: resultArguments,
              },
            });
          });

          functionsElement.append(functionElement);
        });

        // animation
        interactionButtonAnimation();

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
  console.log(inputs);
  return `
    <div class="function">
      <div class="function__interaction">
        <button class=${abi.stateMutability}>${abi.name}</button>
        ${abi.inputs.length > 0 ? `<input  placeholder="${inputs}"/>` : ""}
        <div class="function__show-arguments">
          ${abi.inputs.length > 1 ? `<i class="fa fa-chevron-down"></i>` : ""}
        </div>
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
