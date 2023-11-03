import * as vscode from "vscode";
import * as ejs from "ejs";
import * as fs from "fs";
import * as path from "path";
import WebviewProvider from "./webview";

import { exec } from "child_process";
import { makeABI } from "../util";
import { DEFAULT_ACCOUNTS } from "../util/config";
import { v4 as uuidv4 } from "uuid";

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

    const htmlPath = vscode.Uri.joinPath(
      this.extensionUri,
      "src",
      "template",
      "compile-and-interaction",
      "index.ejs"
    ).fsPath;
    const styles = {
      compile: this.getPath(
        webviewView.webview,
        "style",
        "compile-and-interaction.css"
      ),
    };
    const controllers = {
      compile: this.getPath(
        webviewView.webview,
        "controller",
        "compile-and-interaction",
        "compile.js"
      ),
    };

    const options = [
      this.getPath(webviewView.webview, "template", "compile-and-interaction")
        .fsPath,
    ];
    webviewView.webview.html = this.getHtmlForWebview(
      webviewView.webview,
      htmlPath,
      controllers,
      styles,
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

          const accounts = DEFAULT_ACCOUNTS.map((account) => ({
            address: account.address,
            privateKey: account.privateKey,
            balance: account.balance.toString(),
          }));

          this.view?.webview.postMessage({
            type: "init",
            payload: {
              accounts,
              solFiles,
            },
          });
          break;
        }
        case "compile": {
          const { file } = payload;

          try {
            const filePath = vscode.Uri.file(file);

            const fileData = await vscode.workspace.fs.readFile(filePath);
            const fileContent = Buffer.from(fileData).toString();

            const tempFile = path.join(path.dirname(file), `${uuidv4()}.sol`);
            fs.writeFileSync(tempFile, fileContent);

            exec(`antibug deploy ${tempFile}`, (error, stdout, stderr) => {
              if (error) {
                console.error(`exec error: ${error}`);
                fs.unlinkSync(tempFile);
                return;
              }
              if (stderr) {
                console.error(`stderr: ${stderr}`);
              }
              const directoryPath = stdout.split(":")[1].trim();
              const jsonFileName = tempFile
                .split("/")
                .pop()
                ?.split(".")[0]
                .concat(".json");

              if (jsonFileName) {
                const jsonFilePath = path.join(directoryPath, jsonFileName);
                const jsonFile = require(jsonFilePath);

                const contracts: any = {};
                for (const contractName in jsonFile) {
                  const { abis, bytecode } = jsonFile[contractName];
                  const newABI = makeABI(abis);
                  contracts[contractName] = {
                    abis: newABI,
                    bytecode,
                  };
                }

                this.view?.webview.postMessage({
                  type: "compileResult",
                  payload: {
                    contracts,
                  },
                });
              }
              fs.unlinkSync(tempFile);
            });
          } catch (e) {
            console.log(e);
          }
          break;
        }
      }
    });
  }
}
