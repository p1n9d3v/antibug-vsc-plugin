const vscode = acquireVsCodeApi();
const oldState = vscode.getState();

$(window).ready(() => {
  vscode.postMessage({
    type: "init",
  });
});

const items = document.querySelectorAll(".content-container .item");

items.forEach((item) => {
  const button = item.querySelector(".view-button");
  const hiddenContent = item.querySelector(".hidden-content");

  button.addEventListener("click", () => {
    const currentHiddenContent = item.querySelector(".hidden-content");
    currentHiddenContent.style.display =
      currentHiddenContent.style.display === "block" ? "none" : "block";

    button.textContent =
      button.textContent === "+"
        ? button.textContent.replace("+", "-")
        : button.textContent.replace("-", "+");
  });

  if (item !== items[0]) {
    button.style.pointerEvents = "none";
  }
});

window.addEventListener("message", ({ data: { type, payload } }) => {
  switch (type) {
    case "init": {
      const {
        Filename,
        contractAnalysisContent,
        detectorContent,
        auditReportContent,
        callGraphResultPath,
      } = payload;
      break;
    }
  }
});
