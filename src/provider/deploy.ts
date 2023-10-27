import * as vscode from "vscode";
import * as ejs from "ejs";
import * as fs from "fs";
import * as path from "path";

import WebviewProvider from "./webview";

export default class DeployViewProvider extends WebviewProvider {
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
      "deploy.ejs"
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
            vscode.Uri.joinPath(this.extensionUri, "src", "style", "deploy.css")
          ),
        },
        controllers: {
          index: webview.asWebviewUri(
            vscode.Uri.joinPath(
              this.extensionUri,
              "src",
              "controller",
              "deploy",
              "index.js"
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
