import * as vscode from "vscode";
import * as ejs from "ejs";
import * as fs from "fs";

export default class WebviewProvider implements vscode.WebviewViewProvider {
  public view?: vscode.WebviewView;
  public extensionUri: vscode.Uri;
  public viewType: string;
  public commonFiles: Map<string, vscode.Uri> = new Map();
  constructor({
    extensionUri,
    viewType,
  }: {
    extensionUri: vscode.Uri;
    viewType: string;
  }) {
    this.extensionUri = extensionUri;
    this.viewType = viewType;

    this.commonFiles.set(
      "resetStyle",
      vscode.Uri.joinPath(
        this.extensionUri,
        "src",
        "style",
        "common",
        "reset.css"
      )
    );
    this.commonFiles.set(
      "globalStyle",
      vscode.Uri.joinPath(
        this.extensionUri,
        "src",
        "style",
        "common",
        "global.css"
      )
    );

    this.commonFiles.set(
      "commonTemplate",
      vscode.Uri.joinPath(this.extensionUri, "src", "template", "common")
    );
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext<unknown>,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    throw new Error("Method not implemented.");
  }

  public getHtmlForWebview(
    webview: vscode.Webview,
    htmlPath: string,
    controllers: {},
    styles: {},
    options?: string[]
  ) {
    const ejsData = {
      common: {
        reset: this.getPath(webview, "style", "common", "reset.css"),
        global: this.getPath(webview, "style", "common", "global.css"),
      },
      controllers,
      styles,
      cspSource: webview.cspSource,
      nonce: this.getNonce(),
    };

    const ejsOption = {
      views: [
        this.getPath(webview, "template", "common").fsPath,
        ...(options ?? []),
      ],
    };

    const html = fs.readFileSync(htmlPath, "utf-8");
    return ejs.render(html, ejsData, ejsOption);
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

  protected getPath(webview: vscode.Webview, ...path: string[]) {
    return webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "src", ...path)
    );
  }
}
