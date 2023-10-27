import * as vscode from "vscode";
import CompileAndInteractionViewProvider from "./provider/compile-and-interaction";

export function activate(context: vscode.ExtensionContext) {
  const compileViewProvider = new CompileAndInteractionViewProvider({
    extensionUri: context.extensionUri,
    viewType: "antiblock.compile-and-interaction",
  });

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "antiblock.compile-and-interaction",
      compileViewProvider
    )
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
