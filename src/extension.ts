import * as vscode from "vscode";
import CompileViewProvider from "./provider/compile";
import DeployViewProvider from "./provider/deploy";

export function activate(context: vscode.ExtensionContext) {
  const compileViewProvider = new CompileViewProvider({
    extensionUri: context.extensionUri,
    viewType: "compile",
  });

  const deployViewProvider = new DeployViewProvider({
    extensionUri: context.extensionUri,
    viewType: "deploy",
  });

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "antiblock.compile",
      compileViewProvider
    ),
    vscode.window.registerWebviewViewProvider(
      "antiblock.deploy",
      deployViewProvider
    )
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
