import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

import WebviewProvider from "./webview";
import AntiBlockNode from "../blockchain/node";

import { exec } from "child_process";
import { encodeCallData, makeABI } from "../util";
import { DEFAULT_ACCOUNTS } from "../util/config";
import { v4 as uuidv4 } from "uuid";
import { bigIntToHex, bytesToHex, hexToBytes } from "@ethereumjs/util";
import { FeeMarketEIP1559Transaction } from "@ethereumjs/tx";
import ContractInteractionWebviewPanelProvider from "./contract-interaction";

export default class CompileAndInteractionViewProvider extends WebviewProvider {
  public node!: AntiBlockNode;
  public currentAccount: {
    address: string;
    privateKey: string;
    balance: string;
  } = {
    address: DEFAULT_ACCOUNTS[0].address,
    privateKey: DEFAULT_ACCOUNTS[0].privateKey,
    balance: DEFAULT_ACCOUNTS[0].balance.toString(),
  };
  public value: string = "0";

  constructor({
    extensionUri,
    viewType,
    antibugNode,
  }: {
    extensionUri: vscode.Uri;
    viewType: string;
    antibugNode: AntiBlockNode;
  }) {
    super({
      extensionUri,
      viewType,
    });
    (async () => {
      this.node = antibugNode;
    })();
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

    const htmlPath = this.getPath(
      webviewView.webview,
      "template",
      "compile-and-interaction",
      "index.ejs"
    ).fsPath;
    const style = this.getPath(
      webviewView.webview,
      "style",
      "compile-and-interaction",
      "index.css"
    );
    const controller = this.getPath(
      webviewView.webview,
      "controller",
      "compile-and-interaction",
      "index.js"
    );

    const options = [
      this.getPath(webviewView.webview, "template", "compile-and-interaction")
        .fsPath,
    ];
    webviewView.webview.html = this.getHtmlForWebview(
      webviewView.webview,
      htmlPath,
      controller,
      style,
      options
    );

    webviewView.webview.onDidReceiveMessage(async (data) => {
      const { type, payload } = data;

      switch (type) {
        case "init": {
          const workspaceFolders = vscode.workspace.workspaceFolders;
          const solFiles: vscode.Uri[] = [];

          if (workspaceFolders) {
            for (const folder of workspaceFolders) {
              const files = await vscode.workspace.findFiles(
                new vscode.RelativePattern(folder, "**/*.sol"),
                "**/node_modules/**"
              );
              solFiles.push(...files);
            }
          }

          const accounts = DEFAULT_ACCOUNTS.map((account) => ({
            address: account.address,
            privateKey: account.privateKey,
            balance: account.balance.toString(),
          }));

          this.view?.webview.postMessage({
            type: "init",
            payload: {
              accounts,
              solFiles,
            },
          });
          break;
        }
        case "changeAccount": {
          const { address, privateKey, balance } = payload;
          this.currentAccount = {
            address,
            privateKey,
            balance,
          };

          break;
        }
        case "changeValue": {
          const { value } = payload;
          this.value = value;
          break;
        }
        case "compile": {
          const { file } = payload;
          let compileFilePath = "";
          try {
            compileFilePath = await this.generateCompiledFile(file);

            const stdout = await this.compile(compileFilePath);

            const jsonFile = this.getJsonFileFromStdout(
              stdout,
              compileFilePath
            );

            const contracts: any = {};
            for (const contractName in jsonFile) {
              const { abis, bytecodes } = jsonFile[contractName];
              const newABI = makeABI(abis);
              contracts[contractName] = {
                abis: newABI,
                bytecodes,
              };
            }
            this.view?.webview.postMessage({
              type: "compileResult",
              payload: {
                contracts,
              },
            });
          } catch (e) {
            fs.unlinkSync(compileFilePath);
          } finally {
            fs.unlinkSync(compileFilePath);
          }
          break;
        }
        case "deploy": {
          const { gasLimit, fromPrivateKey, contract, deployArguments } =
            payload;
          const latestBlock = this.node.getLatestBlock();
          const estimatedGasLimit = this.node.getEstimatedGasLimit(latestBlock); // 추후 필요할듯
          const baseFee = latestBlock.header.calcNextBaseFee();

          const { abis, bytecodes } = contract;
          const data = encodeCallData(
            abis.map((abi: any) => abi.signature),
            "constructor",
            deployArguments
          ).slice(2);

          const callData = bytecodes.concat(data);

          const txData = {
            to: undefined,
            value: bigIntToHex(BigInt(this.value)),
            maxFeePerGas: baseFee,
            gasLimit: bigIntToHex(BigInt(gasLimit)),
            nonce: await this.node.getNonce(fromPrivateKey),
            data: callData,
          };

          const tx = FeeMarketEIP1559Transaction.fromTxData(txData).sign(
            hexToBytes(fromPrivateKey)
          );
          const { receipt } = await this.node.mine(tx);
          if (receipt.createdAddress) {
            const contractAddress = receipt.createdAddress.toString();

            const panelProvider = new ContractInteractionWebviewPanelProvider({
              extensionUri: this.extensionUri,
              viewType: "antiblock.contract-interaction",
              title: contractAddress,
              column: vscode.ViewColumn.Beside,
            });
            panelProvider.render();
            panelProvider.onDidReceiveMessage(async (data) => {
              const { type, payload } = data;
              switch (type) {
                case "init": {
                  const abisWithoutConstructor = abis.filter(
                    (abi: any) => abi.type !== "constructor"
                  );
                  panelProvider.panel.webview.postMessage({
                    type: "init",
                    payload: {
                      contractAddress,
                      abis: abisWithoutConstructor,
                    },
                  });
                  break;
                }
                case "send": {
                  const { functionName, arguments: args, value } = payload;
                  const latestBlock = this.node.getLatestBlock();
                  const estimatedGasLimit =
                    this.node.getEstimatedGasLimit(latestBlock);
                  const baseFee = latestBlock.header.calcNextBaseFee();

                  const callData = encodeCallData(
                    abis.map((abi: any) => abi.signature),
                    functionName,
                    args
                  );

                  const txData = {
                    to: contractAddress,
                    value: bigIntToHex(BigInt(value)),
                    maxFeePerGas: baseFee,
                    gasLimit: bigIntToHex(BigInt(estimatedGasLimit)),
                    nonce: await this.node.getNonce(fromPrivateKey),
                    data: callData,
                  };

                  const tx = FeeMarketEIP1559Transaction.fromTxData(
                    txData
                  ).sign(hexToBytes(this.currentAccount.privateKey));

                  const { receipt } = await this.node.mine(tx);
                  console.log(
                    "result",
                    bytesToHex(receipt.execResult.returnValue).toString()
                  );
                  break;
                }
                case "call": {
                  const { functionName, arguments: args } = payload;
                  const latestBlock = this.node.getLatestBlock();
                  const estimatedGasLimit =
                    this.node.getEstimatedGasLimit(latestBlock);
                  const baseFee = latestBlock.header.calcNextBaseFee();

                  const callData = encodeCallData(
                    abis.map((abi: any) => abi.signature),
                    functionName,
                    args
                  );

                  const txData = {
                    to: contractAddress,
                    value: bigIntToHex(0n),
                    maxFeePerGas: baseFee,
                    gasLimit: bigIntToHex(BigInt(estimatedGasLimit)),
                    nonce: await this.node.getNonce(fromPrivateKey),
                    data: callData,
                  };

                  const tx = FeeMarketEIP1559Transaction.fromTxData(
                    txData
                  ).sign(hexToBytes(this.currentAccount.privateKey));

                  const result = await this.node.runTx({ tx });
                  console.log(
                    "result",
                    bytesToHex(result.execResult.returnValue).toString()
                  );
                  break;
                }
              }
            });
          }

          const balance = await this.node.getBalance(
            this.currentAccount.address
          );
          this.currentAccount.balance = balance.toString();
          this.view?.webview.postMessage({
            type: "changeAccountState",
            payload: {
              balance: this.currentAccount.balance,
            },
          });

          break;
        }
      }
    });
  }

  private async generateCompiledFile(filePath: string) {
    const fileData = await vscode.workspace.fs.readFile(
      vscode.Uri.file(filePath)
    );
    const fileContent = Buffer.from(fileData).toString();

    const compiledFilePath = path.join(
      path.dirname(filePath),
      `${uuidv4()}.sol`
    );
    fs.writeFileSync(compiledFilePath, fileContent);

    return compiledFilePath;
  }

  private getJsonFileFromStdout(stdout: string, fileName: string) {
    const directoryPath = stdout.split(":")[1].trim();
    const jsonFileName = fileName
      .split("/")
      .pop()
      ?.split(".")[0]
      .concat(".json");

    if (!jsonFileName) {
      throw new Error("Invalid file name");
    }

    const jsonFilePath = path.join(directoryPath, jsonFileName);

    return require(jsonFilePath);
  }

  private async compile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(`antibug deploy ${filePath}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          throw new Error("Compile error");
        }
        if (stderr) {
          console.error(`stderr: ${stderr}`);
          throw new Error("Compile std error");
        }
        return resolve(stdout);
      });
    });
  }
}
