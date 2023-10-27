import * as vscode from "vscode";
import * as ejs from "ejs";
import * as fs from "fs";
import * as path from "path";

import WebviewProvider from "./webview";

import { exec } from "child_process";
import { makeABI } from "../util";

export default class CompileAndInteractionViewProvider extends WebviewProvider {
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

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    // handle message
    webviewView.webview.onDidReceiveMessage(async (data) => {
      const { type, payload } = data;

      switch (type) {
        case "init": {
          const workspaceFolders = vscode.workspace.workspaceFolders;
          const solFiles: vscode.Uri[] = [];
          // how to get root folder

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
        case "compile": {
          const { file } = payload;
          try {
            exec(`antibug deploy ${file}`, (error, stdout, stderr) => {
              if (error) {
                console.error(`exec error: ${error}`);
                return;
              }
              if (stderr) {
                console.error(`stderr: ${stderr}`);
              }
              const directoryPath = stdout.split(":")[1].trim();
              const jsonFileName = file
                .split("/")
                .pop()
                ?.split(".")[0]
                .concat(".json");
              const jsonFilePath = path.join(directoryPath, jsonFileName);
              const jsonFile = require(jsonFilePath);
              const { abis, bytecodes } = jsonFile;
              const newABIs = makeABI(abis);

              this.view?.webview.postMessage({
                type: "compileResult",
                payload: {
                  abis: newABIs,
                  bytecodes,
                },
              });
            });
          } catch (e) {
            console.log(e);
          }
          break;
        }
      }
    });
  }

  public getHtmlForWebview(webview: vscode.Webview): string {
    const htmlPath = vscode.Uri.joinPath(
      this.extensionUri,
      "src",
      "template",
      "compile-and-interaction.ejs"
    ).fsPath;

    const html = fs.readFileSync(htmlPath, "utf-8");
    const nonce = this.getNonce();

    return ejs.render(
      html,
      {
        styles: {
          reset: webview.asWebviewUri(
            this.commonFiles.get("resetStyle") as vscode.Uri
          ),
          global: webview.asWebviewUri(
            this.commonFiles.get("globalStyle") as vscode.Uri
          ),
          compile: webview.asWebviewUri(
            vscode.Uri.joinPath(
              this.extensionUri,
              "src",
              "style",
              "compile-and-interaction.css"
            )
          ),
        },
        controllers: {
          compile: webview.asWebviewUri(
            vscode.Uri.joinPath(
              this.extensionUri,
              "src",
              "controller",
              "compile-and-interaction",
              "compile.js"
            )
          ),
          interaction: webview.asWebviewUri(
            vscode.Uri.joinPath(
              this.extensionUri,
              "src",
              "controller",
              "compile-and-interaction",
              "interaction.js"
            )
          ),
        },
        cspSource: webview.cspSource,
        nonce,
      },
      {
        views: [
          webview.asWebviewUri(
            this.commonFiles.get("commonTemplate") as vscode.Uri
          ).fsPath,
        ],
      }
    );
  }
}
