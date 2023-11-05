import * as vscode from "vscode";

import WebviewPanelProvider from "./webview-panel";

export default class ContractInteractionWebviewPanelProvider extends WebviewPanelProvider {
  constructor({
    extensionUri,
    viewType,
    title,
    column = vscode.ViewColumn.Beside,
  }: {
    extensionUri: vscode.Uri;
    viewType: string;
    title: string;
    column: vscode.ViewColumn;
  }) {
    super({
      extensionUri,
      viewType,
      title,
      column,
    });
  }

  public render() {
    const htmlPath = this.getPath(
      this.panel.webview,
      "template",
      "compile-and-interaction",
      "index.ejs"
    ).fsPath;
    const style = this.getPath(
      this.panel.webview,
      "style",
      "compile-and-interaction",
      "index.css"
    );
    const controller = this.getPath(
      this.panel.webview,
      "controller",
      "compile-and-interaction",
      "index.js"
    );

    const options = [
      this.getPath(this.panel.webview, "template", "compile-and-interaction")
        .fsPath,
    ];

    this.panel.webview.html = this.getHtmlForWebview(
      this.panel.webview,
      htmlPath,
      controller,
      style,
      options
    );
  }
}
