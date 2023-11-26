const vscode = acquireVsCodeApi();
const oldState = vscode.getState();

$(document).ready(() => {
  vscode.postMessage({
    type: "init",
  });

  window.addEventListener("message", ({ data: { type, payload } }) => {
    switch (type) {
      case "init": {
        initializeUI();
        viewHiddenContent();
        initializePieChart();
        initializeContract();

        $(".result__item").on("click", ".result__tr", (event) => {
          const clickedElement = $(event.currentTarget);
          const codeLine = clickedElement.find(".codeline").text().trim();
          const impact = clickedElement.find(".impact").text().trim();

          vscode.postMessage({
            type: "codeLine",
            payload: {
              codeLine,
              impact,
            },
          });
        });
        break;
      }
    }
  });
});

function initializeUI() {
  const underline = $(".underline");
  const koreanButton = $(".korean button");
  const englishButton = $(".english button");

  function select(event) {
    underline.css("left", `${event.target.offsetLeft}px`);
    underline.css("width", `${event.target.offsetWidth}px`);
  }

  koreanButton.click((event) => {
    select(event);
    $(".korean-content").show();
    $(".english-content").hide();
  });

  englishButton.click((event) => {
    select(event);
    $(".english-content").show();
    $(".korean-content").hide();
  });

  koreanButton.trigger("click");
}

function viewHiddenContent() {
  const headerElement = $(".header");
  headerElement.find("button").click(() => {
    vscode.postMessage({
      type: "ExtractAuditReport",
      payload: {},
    });
  });

  $(".result__item").each((index, item) => {
    const button = $(item).find(".result__td-button");
    const hiddenContent = $(item).find(".result__hidden");

    button.on("click", () => {
      if (index !== 0) {
        $(item).toggleClass("show");
        button.text(button.text() === "+" ? "-" : "+");
      }

      hiddenContent.css("display", $(item).hasClass("show") ? "block" : "none");
    });

    if (index === 0) {
      button.css("pointer-events", "none");
    }
  });
}

function initializePieChart() {
  const dom = document.querySelector(".piechart");
  const myChart_piechart = echarts.init(dom, null, {
    renderer: "canvas",
    useDirtyRect: false,
  });

  const option = {
    tooltip: {
      trigger: "item",
    },
    series: [
      {
        type: "pie",
        radius: ["50%", "80%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: "#fff",
          borderWidth: 2,
        },
        label: {
          show: false,
          position: "center",
        },
        emphasis: {
          scale: 1,
          label: {
            show: true,
            textStyle: {
              fontSize: 20,
            },
          },
        },
        labelLine: {
          show: false,
        },
        data: [
          { value: 4, name: "High", itemStyle: { color: "#EF6666" } },
          { value: 12, name: "Medium", itemStyle: { color: "#FAC858" } },
          { value: 9, name: "Low", itemStyle: { color: "#92CC76" } },
          { value: 10, name: "Info", itemStyle: { color: "#5470C6" } },
        ],
      },
    ],
  };

  if (option && typeof option === "object") {
    myChart_piechart.setOption(option);
  }

  window.addEventListener("resize", myChart.resize);
}

function initializeContract() {
  var callGraphElement = document.getElementById("contract");
  var myChart_contract = echarts.init(callGraphElement);

  var option = {
    title: {
      text: "",
      left: "center",
    },
    series: [
      {
        type: "graph",
        layout: "force",
        roam: true,
        force: {
          repulsion: 1000,
        },
        data: [
          { name: "solidity", symbolSize: 80 },
          { name: "GuessTheRandomNumber", symbolSize: 60 },
          { name: "constructor", symbolSize: 40 },
          { name: "require(bool,string)", symbolSize: 30 },
          { name: "blockhash(uint256)", symbolSize: 30 },
          { name: "abi.encodePacked()", symbolSize: 30 },
          { name: "keccak256(bytes)", symbolSize: 30 },
          { name: "guess", symbolSize: 30 },
        ],
        links: [
          {
            source: "solidity",
            target: "GuessTheRandomNumber",
            lineStyle: { curveness: 0.2 },
          },
          {
            source: "GuessTheRandomNumber",
            target: "constructor",
            lineStyle: { curveness: 0.2 },
          },
          {
            source: "solidity",
            target: "require(bool,string)",
            lineStyle: { curveness: 0.2 },
          },
          {
            source: "solidity",
            target: "blockhash(uint256)",
            lineStyle: { curveness: 0.2 },
          },
          {
            source: "solidity",
            target: "abi.encodePacked()",
            lineStyle: { curveness: 0.2 },
          },
          {
            source: "solidity",
            target: "keccak256(bytes)",
            lineStyle: { curveness: 0.2 },
          },
          {
            source: "GuessTheRandomNumber",
            target: "guess",
            lineStyle: { curveness: 0.2 },
          },
        ],
        label: {
          show: true,
          position: "inside",
          formatter: "{b}",
        },
        emphasis: {
          label: {
            show: true,
          },
        },
      },
    ],
  };

  myChart_contract.setOption(option);
}
