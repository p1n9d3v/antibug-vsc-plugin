import * as vscode from "vscode";
import CompileViewProvider from "./provider/compile";

export function activate(context: vscode.ExtensionContext) {
  const compileViewProvider = new CompileViewProvider({
    extensionUri: context.extensionUri,
    viewType: "compile",
  });

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "antiblock.compile",
      compileViewProvider
    )
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
