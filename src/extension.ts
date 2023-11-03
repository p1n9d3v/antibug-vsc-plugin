import * as vscode from "vscode";
import CompileAndInteractionViewProvider from "./provider/compile-and-interaction";
import SecurityAnalysisViewProvider from "./provider/security-analysis";

export function activate(context: vscode.ExtensionContext) {
  const compileAndInteractionView = new CompileAndInteractionViewProvider({
    extensionUri: context.extensionUri,
    viewType: "antiblock.compile-and-interaction",
  });

  const securityAnalysisView = new SecurityAnalysisViewProvider({
    extensionUri: context.extensionUri,
    viewType: "antiblock.security-analysis",
  });

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "antiblock.compile-and-interaction",
      compileAndInteractionView
    ),
    vscode.window.registerWebviewViewProvider(
      "antiblock.security-analysis",
      securityAnalysisView
    )
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
