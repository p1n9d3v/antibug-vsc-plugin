import WebviewProvider from "./webview";
import * as vscode from "vscode";
import * as ejs from "ejs";
import * as fs from "fs";

export default class CompileViewProvider extends WebviewProvider {
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
    webviewView.webview.onDidReceiveMessage((data) => {});
  }

  public getHtmlForWebview(webview: vscode.Webview): string {
    const htmlPath = vscode.Uri.joinPath(
      this.extensionUri,
      "src",
      "template",
      "compile.ejs"
    ).fsPath;

    const html = fs.readFileSync(htmlPath, "utf-8");
    const nonce = this.getNonce();

    return ejs.render(
      html,
      {
        resetStyle: webview.asWebviewUri(
          this.commonFiles.get("resetStyle") as vscode.Uri
        ),
        globalStyle: webview.asWebviewUri(
          this.commonFiles.get("globalStyle") as vscode.Uri
        ),
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
