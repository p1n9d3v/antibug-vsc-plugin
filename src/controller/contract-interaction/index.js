const vscode = acquireVsCodeApi();
const oldState = vscode.getState();

(function () {
  $(window).ready(() => {
    vscode.postMessage({
      type: "init",
    });
  });

  // 솔직히 없어도 됌 ㅋㅋ 걍재미로 넣어봄
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

  window.addEventListener("message", ({ data: { type, payload } }) => {
    switch (type) {
      case "init": {
        console.log(payload);
        break;
      }
    }
  });
})();
