import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

import WebviewProvider from "./webview";

import SecurityAnalysisWebviewPanelProvider from "./analysis-report";
import { exec } from "child_process";
import { v4 as uuidv4 } from "uuid";
import { error } from "console";

export default class SecurityAnalysisViewProvider extends WebviewProvider {
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

        case "error": {
          const { errMsg } = payload;
          console.log(errMsg);
          await vscode.window.showInformationMessage(errMsg);
        }

        case "analysis": {
          const { selectedLanguages, selectedRules, selectedSolFile } = payload;

          const stdout = await this.analysis(
            selectedLanguages,
            selectedRules,
            selectedSolFile
          );

          const result = stdout.message;
          const Filename = path.basename(
            selectedSolFile,
            path.extname(selectedSolFile)
          );

          const detectResultRegex = /Detect Result Output directory: (.+)/;
          const auditReportRegex = /Audit Report Output directory: (.+)/;

          const detectResultMatch = result.match(detectResultRegex);
          const auditReportMatch = result.match(auditReportRegex);

          if (detectResultMatch && auditReportMatch) {
            const detectResultPath = path.join(
              detectResultMatch[1],
              Filename + ".json"
            );
            const auditReportPath = path.join(
              auditReportMatch[1],
              Filename + ".md"
            );

            const jsonData = fs.readFileSync(detectResultPath, "utf8");

            // const panelProvider = new SecurityAnalysisWebviewPanelProvider({
            //   extensionUri: this.extensionUri,
            //   viewType: "antiblock.analysis-report",
            //   title: result,
            //   column: vscode.ViewColumn.Beside,
            // });

            // panelProvider.render();
            // panelProvider.onDidReceiveMessage(async (data) => {
            //   const { type, payload } = data;
            //   switch (type) {
            //     case "init": {
            //       panelProvider.panel.webview.postMessage({
            //         type: "init",
            //         payload: {
            //           jsonData,
            //         },
            //       });
            //       break;
            //     }
            //   }
            // });
          }
        }
      }
    });
  }

  private async analysis(
    language: string,
    rule: string,
    filePath: string
  ): Promise<{
    status: string;
    message: string;
  }> {
    return new Promise((resolve, reject) => {
      exec(
        `antibug detect ${language} ${rule} ${filePath}`,
        (error, stdout, stderr) => {
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
        }
      );
    });
  }

  private getJsonFileFromStdout(stdout: string, fileName: string) {
    const directoryPath = stdout.split(":")[1];
    const jsonFileName = fileName
      .split("/")
      .pop()
      ?.split(".")[0]
      .concat(".json");

    if (!jsonFileName) {
      throw new Error("Invalid file name");
    }

    const jsonFilePath = path.join(directoryPath, jsonFileName);

    return require(jsonFilePath);
  }
}
