import * as vscode from "vscode";

import WebviewPanelProvider from "./webview-panel";

export default class SecurityAnalysisWebviewPanelProvider extends WebviewPanelProvider {
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
      "analysis-report",
      "index.ejs"
    ).fsPath;
    const style = this.getPath(
      this.panel.webview,
      "style",
      "analysis-report",
      "index.css"
    );
    const controller = this.getPath(
      this.panel.webview,
      "controller",
      "analysis-report",
      "index.js"
    );

    const options = [
      this.getPath(this.panel.webview, "template", "analysis-report").fsPath,
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
