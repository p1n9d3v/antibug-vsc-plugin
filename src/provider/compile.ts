import { WebviewProvider } from "./webview";
import * as vscode from "vscode";
import * as ejs from "ejs";
import * as fs from "fs";

export class CompileViewProvider extends WebviewProvider {
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
    throw new Error("Method not implemented.");
  }

  public getHtmlForWebview(webview: vscode.Webview): string {
    const htmlPath = vscode.Uri.joinPath(
      this.extensionUri,
      "src",
      "template",
      "compile.html"
    ).fsPath;

    const html = fs.readFileSync(htmlPath, "utf-8");
    const nonce = this.getNonce();
    return ejs.render(
      html,
      {
        resetCss: this.commonFiles.get("style")?.[0] ?? "",
        globalCss: this.commonFiles.get("style")?.[1] ?? "",
        cspSource: webview.cspSource,
        nonce,
      },
      {
        views: this.commonFiles.get("template"),
      }
    );
  }
}
