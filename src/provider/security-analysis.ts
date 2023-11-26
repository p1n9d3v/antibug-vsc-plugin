import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

import WebviewProvider from "./webview";
import AnalysisResultWebviewPanelProvider from "./analysis-result";

import { exec, ChildProcess } from "child_process";

export default class SecurityAnalysisViewProvider extends WebviewProvider {
  private auditReportKR?: string;
  private auditReportEN?: string;

  constructor({
    extensionUri,
    viewType,
  }: {
    extensionUri: vscode.Uri;
    viewType: string;
  }) {
    super({
      extensionUri,
      viewType,
    });
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext<unknown>,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    const htmlPath = this.getPath(
      webviewView.webview,
      "template",
      "security-analysis",
      "index.ejs"
    ).fsPath;
    const style = this.getPath(
      webviewView.webview,
      "style",
      "security-analysis",
      "index.css"
    );
    const controller = this.getPath(
      webviewView.webview,
      "controller",
      "security-analysis",
      "index.js"
    );

    const options = [
      this.getPath(webviewView.webview, "template", "security-analysis").fsPath,
    ];
    webviewView.webview.html = this.getHtmlForWebview(
      webviewView.webview,
      htmlPath,
      controller,
      style,
      options
    );

    webviewView.webview.onDidReceiveMessage(async (data) => {
      const { type, payload } = data;

      switch (type) {
        case "init": {
          const workspaceFolders = vscode.workspace.workspaceFolders;
          const solFiles: vscode.Uri[] = [];

          if (workspaceFolders) {
            for (const folder of workspaceFolders) {
              const files = await vscode.workspace.findFiles(
                new vscode.RelativePattern(folder, "**/*.sol"),
                "**/node_modules/**"
              );
              solFiles.push(...files);
            }
          }

          this.view?.webview.postMessage({
            type: "init",
            payload: {
              solFiles,
            },
          });
          break;
        }

        case "changeFile": {
          const { path } = payload;
          const file = await vscode.workspace.openTextDocument(path);
          await vscode.window.showTextDocument(file, {
            preview: false,
            viewColumn: vscode.ViewColumn.One,
          });
          break;
        }

        case "analysis": {
          const { selectedLanguages, selectedRules, selectedSolFile } = payload;
          console.log(selectedSolFile, selectedRules, selectedLanguages);

          // const stdout = await this.analysis(language, rule, path);
          // const { message } = stdout;

          // const regex = /Not a directory: '(.*)'/;
          // const match = message.match(regex);

          // if (match) {
          //   const pathValue = match[1];
          //   console.log(pathValue);
          // } else {
          //   console.log("No match found.");
          // }

          // const panelProvider = new SecurityAnalysisWebviewPanelProvider({
          //   extensionUri: this.extensionUri,
          //   viewType: "antiblock.analysis-report",
          //   title: path,
          //   column: vscode.ViewColumn.Beside,
          // });

          // panelProvider.render();
          // panelProvider.panel.webview.postMessage({
          //   type: "printResult",
          //   payload: {
          //     stdout,
          //   },
          // });
          break;
        }

        case "RunAnalysis": {
          const { rules, files } = payload;
          if (files === "Select a file to analyze") {
            vscode.window
              .showInformationMessage(
                "Please select a file to analyze.",
                "확인",
                "취소"
              )
              .then((value) => {
                if (value === "확인") {
                  vscode.commands.executeCommand(
                    "workbench.action.problems.focus"
                  );
                }
              });
            break;
          } else {
            const stdout = await this.analysis(rules, files);

            const result = stdout.message;

            if (result.match(/Detecting specific vulnerabilities/)) {
              const filename = path.basename(files, path.extname(files));
              const OutputDirectoryRegex = /Output Directory: (.+)/;
              const OutputDirectoryMatch = result.match(OutputDirectoryRegex);

              if (OutputDirectoryMatch && OutputDirectoryMatch.length > 1) {
                const outputDirectoryPath = OutputDirectoryMatch[1].trim();

                this.auditReportEN = path.join(
                  outputDirectoryPath,
                  "/audit_report",
                  filename + "_en.md"
                );
                this.auditReportKR = path.join(
                  outputDirectoryPath,
                  "/audit_report",
                  filename + "_kr.md"
                );

                // Path 값 설정
                const contractAnalysisResultPath =
                  outputDirectoryPath +
                  "/contract_analysis_json_results/" +
                  filename +
                  ".json";

                const detectorResultPath =
                  outputDirectoryPath +
                  "/detector_json_results/" +
                  filename +
                  "_kr.json";

                const callGraphResultPath =
                  outputDirectoryPath +
                  "/call_graph_json_results/" +
                  filename +
                  ".json";

                const auditReportPath =
                  outputDirectoryPath +
                  "/call_graph_results/" +
                  "call-graph.png";

                const panelProvider = new AnalysisResultWebviewPanelProvider({
                  extensionUri: this.extensionUri,
                  viewType: "antiblock.analysis-result",
                  title: " Analysis Result",
                  column: vscode.ViewColumn.Two,
                });
                panelProvider.render();
                panelProvider.onDidReceiveMessage(async (data) => {
                  const { type, payload } = data;
                  switch (type) {
                    case "init": {
                      panelProvider.panel.webview.postMessage({
                        type: "init",
                        payload: { filename },
                      });
                    }

                    case "ExtractAuditReport": {
                      console.log("===============");
                      if (this.auditReportKR && this.auditReportEN) {
                        await this.ExtractAuditReport(
                          this.auditReportKR,
                          false
                        );
                        await this.ExtractAuditReport(
                          this.auditReportEN,
                          false
                        );
                      } else {
                        vscode.window
                          .showInformationMessage("", "확인", "취소")
                          .then((value) => {
                            if (value === "확인") {
                              vscode.commands.executeCommand(
                                "workbench.action.problems.focus"
                              );
                            }
                          });
                      }
                      break;
                    }

                    case "codeLine": {
                      const { codeLine, impact } = payload;
                      const lineParts = codeLine.split(" ");
                      const lineNumber = parseInt(
                        lineParts[lineParts.length - 1]
                      );

                      let decorationType;
                      let defaultDecorationType;

                      const highSeverityDecorationType =
                        vscode.window.createTextEditorDecorationType({
                          backgroundColor: "#ef6666",
                        });

                      const mediumSeverityDecorationType =
                        vscode.window.createTextEditorDecorationType({
                          backgroundColor: "#fac858",
                        });

                      const lowSeverityDecorationType =
                        vscode.window.createTextEditorDecorationType({
                          backgroundColor: "#92cc76",
                        });

                      const infoDecorationType =
                        vscode.window.createTextEditorDecorationType({
                          backgroundColor: "#5470c6",
                        });

                      switch (impact) {
                        case "high":
                          decorationType = highSeverityDecorationType;
                          break;
                        case "medium":
                          decorationType = mediumSeverityDecorationType;
                          break;
                        case "low":
                          decorationType = lowSeverityDecorationType;
                          break;
                        case "info":
                          decorationType = infoDecorationType;
                          break;
                        default:
                          defaultDecorationType =
                            vscode.window.createTextEditorDecorationType({
                              backgroundColor: "#ffffff",
                            });
                          decorationType = defaultDecorationType;
                          break;
                      }

                      const activeEditor = vscode.window.activeTextEditor;

                      if (activeEditor) {
                        const range = activeEditor.document.lineAt(
                          lineNumber - 1
                        ).range;

                        activeEditor.setDecorations(decorationType, [range]);
                      }
                      break;
                    }
                  }
                });
              } else {
                vscode.window
                  .showInformationMessage(
                    "Vulnerabilities have not been detected.",
                    "확인",
                    "취소"
                  )
                  .then((value) => {
                    if (value === "확인") {
                      vscode.commands.executeCommand(
                        "workbench.action.problems.focus"
                      );
                    }
                  });
              }
              break;
            }
          }
        }
      }
    });
  }

  private async analysis(
    rule: string,
    filePath: string
  ): Promise<{
    status: string;
    message: string;
  }> {
    return new Promise((resolve, reject) => {
      exec(`antibug detect ${rule} ${filePath}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          vscode.window
            .showInformationMessage(error.message, "확인", "취소")
            .then((value) => {
              if (value === "확인") {
                vscode.commands.executeCommand(
                  "workbench.action.problems.focus"
                );
              }
            });
        }
        if (stderr) {
          console.error(`stderr: ${stderr}`);
          vscode.window.showInformationMessage(stderr);
        }
        return resolve({
          status: "success",
          message: stdout,
        });
      });
    });
  }

  private async ExtractAuditReport(filePath: string, view: boolean) {
    const fileContent = fs.readFileSync(filePath, "utf8");
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (workspaceFolders && workspaceFolders.length > 0) {
      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      const resultDir = path.join(workspaceRoot, "result");

      if (!fs.existsSync(resultDir)) {
        fs.mkdirSync(resultDir);
      }

      const fileNameWithoutExtension = path.basename(
        filePath,
        path.extname(filePath)
      );
      const newFileName = `${fileNameWithoutExtension}.md`;

      const newFilePath = path.join(resultDir, newFileName);

      fs.writeFileSync(newFilePath, fileContent, "utf8");

      if (view) {
        vscode.commands.executeCommand(
          "markdown.showPreviewToSide",
          vscode.Uri.file(newFilePath)
        );
      }
    }
  }
}
