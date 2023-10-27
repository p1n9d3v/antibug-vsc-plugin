import * as vscode from "vscode";

export class WebviewProvider implements vscode.WebviewViewProvider {
  public extensionUri: vscode.Uri;
  public viewType: string;
  public commonFiles: Map<string, string[]> = new Map();
  constructor({
    extensionUri,
    viewType,
  }: {
    extensionUri: vscode.Uri;
    viewType: string;
  }) {
    this.extensionUri = extensionUri;
    this.viewType = viewType;

    this.commonFiles.set("style", [
      vscode.Uri.joinPath(
        this.extensionUri,
        "src",
        "style",
        "common",
        "reset.css"
      ).fsPath,
      vscode.Uri.joinPath(
        this.extensionUri,
        "src",
        "style",
        "common",
        "global.css"
      ).fsPath,
    ]);

    this.commonFiles.set("template", [
      vscode.Uri.joinPath(this.extensionUri, "src", "template").fsPath,
    ]);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext<unknown>,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    throw new Error("Method not implemented.");
  }

  protected getNonce() {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
