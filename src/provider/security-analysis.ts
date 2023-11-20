import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

import WebviewProvider from "./webview";

import SecurityAnalysisWebviewPanelProvider from "./analysis-report";
import { exec } from "child_process";
import { v4 as uuidv4 } from "uuid";

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
}
