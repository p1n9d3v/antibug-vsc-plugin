import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

import WebviewProvider from "./webview";
import AntiBlockNode from "../blockchain/node";

import ContractInteractionWebviewPanelProvider from "./contract-interaction";
import { exec } from "child_process";
import { DEFAULT_ACCOUNTS } from "../util/config";
import { v4 as uuidv4 } from "uuid";
import { bigIntToHex, bytesToHex, hexToBytes } from "@ethereumjs/util";
import { FeeMarketEIP1559Transaction } from "@ethereumjs/tx";
import { Interface, FormatTypes } from "ethers/lib/utils";

export default class CompileAndInteractionViewProvider extends WebviewProvider {
  private node!: AntiBlockNode;
  private currentAccount: {
    address: string;
    privateKey: string;
    balance: string;
  } = {
    address: DEFAULT_ACCOUNTS[0].address,
    privateKey: DEFAULT_ACCOUNTS[0].privateKey,
    balance: DEFAULT_ACCOUNTS[0].balance.toString(),
  };
  private value: string = "0";

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
    this.node = antibugNode;
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
        case "changeFile": {
          const { path } = payload;
          const file = await vscode.workspace.openTextDocument(path);
          await vscode.window.showTextDocument(file, {
            preview: false,
            viewColumn: vscode.ViewColumn.One,
          });
          break;
        }
        case "compile": {
          const { file } = payload;
          let contracts: any = {};

          const compileFilePath = await this.generateCompiledFile(file);

          const stdout = await this.compile(compileFilePath);

          const jsonFile = this.getJsonFileFromStdout(
            stdout.message,
            compileFilePath
          );

          for (const contractName in jsonFile) {
            const { abis, bytecodes } = jsonFile[contractName];

            contracts[contractName] = {
              abis,
              bytecodes,
            };
          }
          //  const newABI = makeABI(abis);

          //  const iface = new Interface(abis);
          //  console.log(iface.format(FormatTypes.full));
          // console.log(contracts);

          this.view?.webview.postMessage({
            type: "compileResult",
            payload: {
              contracts,
            },
          });
          break;
        }
        case "deploy": {
          const { value, gasLimit, fromPrivateKey, contract, deployArguments } =
            payload;

          const { abis, bytecodes } = contract;
          const iface = new Interface(abis);
          // const ifaceFormat = iface.format(FormatTypes.full);

          const latestBlock = this.node.getLatestBlock();
          const estimatedGasLimit = this.node.getEstimatedGasLimit(latestBlock); // 추후 필요할듯
          const baseFee = latestBlock.header.calcNextBaseFee();

          const data = iface.encodeDeploy(deployArguments).slice(2);
          const callData = bytecodes.concat(data);

          const txData = {
            to: undefined,
            value: bigIntToHex(BigInt(this.value)),
            maxFeePerGas: baseFee,
            gasLimit: bigIntToHex(BigInt(estimatedGasLimit)),
            nonce: await this.node.getNonce(this.currentAccount.privateKey),
            data: callData,
          };

          const tx = FeeMarketEIP1559Transaction.fromTxData(txData).sign(
            hexToBytes(this.currentAccount.privateKey)
          );
          const { receipt } = await this.node.mine(tx);

          await this.changeAccountState();

          if (receipt.createdAddress) {
            const contractAddress = receipt.createdAddress.toString();

            const panelProvider = new ContractInteractionWebviewPanelProvider({
              extensionUri: this.extensionUri,
              viewType: "antiblock.contract-interaction",
              title: contract.name,
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
                  const balance = (
                    await this.node.getBalance(contractAddress)
                  ).toString();
                  panelProvider.panel.webview.postMessage({
                    type: "init",
                    payload: {
                      contract: {
                        address: contractAddress,
                        name: contract.name,
                        balance,
                      },
                      abis: abisWithoutConstructor,
                    },
                  });
                  break;
                }
                case "send": {
                  const { functionName, arguments: args } = payload;

                  const latestBlock = this.node.getLatestBlock();
                  const estimatedGasLimit =
                    this.node.getEstimatedGasLimit(latestBlock);
                  const baseFee = latestBlock.header.calcNextBaseFee();

                  const callData = iface.encodeFunctionData(functionName, [
                    ...args,
                  ]);

                  const txData = {
                    to: contractAddress,
                    value: bigIntToHex(BigInt(this.value)),
                    maxFeePerGas: baseFee,
                    gasLimit: bigIntToHex(BigInt(estimatedGasLimit)),
                    nonce: await this.node.getNonce(
                      this.currentAccount.privateKey
                    ),
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

                  const amountSpent = receipt.amountSpent.toString();
                  const totalSpent = receipt.totalGasSpent.toString();
                  const from =
                    receipt.execResult.runState?.env.caller.toString();
                  const to =
                    receipt.execResult.runState?.env.address.toString();
                  const executedGasUsed =
                    receipt.execResult.executionGasUsed.toString();
                  const decodeInput = iface.decodeFunctionData(
                    functionName,
                    receipt.execResult.runState?.env.callData as any
                  );
                  const txHash = tx.hash().toString();

                  console.log("amountSpent", amountSpent);
                  console.log("totalSpent", totalSpent);
                  console.log("from", from);
                  console.log("to", to);
                  console.log("executedGasUsed", executedGasUsed);
                  console.log("decodeInput", decodeInput);

                  const balance = (
                    await this.node.getBalance(contractAddress)
                  ).toString();
                  panelProvider.panel.webview.postMessage({
                    type: "changeContractBalance",
                    payload: {
                      balance,
                    },
                  });

                  await this.changeAccountState();

                  panelProvider.panel.webview.postMessage({
                    type: "transactionResult",
                    payload: {
                      txHash,
                      amountSpent,
                      totalSpent,
                      from,
                      to,
                      executedGasUsed,
                      decodeInput,
                    },
                  });

                  console.log(receipt);

                  // get Text from result

                  break;
                }
                case "call": {
                  const { functionName, arguments: args } = payload;
                  const latestBlock = this.node.getLatestBlock();
                  const estimatedGasLimit =
                    this.node.getEstimatedGasLimit(latestBlock);
                  const baseFee = latestBlock.header.calcNextBaseFee();

                  const callData = iface.encodeFunctionData(functionName, args);
                  const txData = {
                    to: contractAddress,
                    value: bigIntToHex(0n),
                    maxFeePerGas: baseFee,
                    gasLimit: bigIntToHex(BigInt(estimatedGasLimit)),
                    nonce: await this.node.getNonce(
                      this.currentAccount.privateKey
                    ),
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

  private async compile(filePath: string): Promise<{
    status: string;
    message: string;
  }> {
    return new Promise((resolve, reject) => {
      exec(`antibug deploy ${filePath}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          vscode.window
            .showInformationMessage(error.message, "확인", "취소")
            .then((value) => {
              if (value === "확인") {
                vscode.commands.executeCommand(
                  "workbench.action.problems.focus"
                );
              }
            });

          this.view?.webview.postMessage({
            type: "compileResult",
            payload: {
              contracts: null,
            },
          });
        }
        if (stderr) {
          console.error(`stderr: ${stderr}`);
          vscode.window.showInformationMessage(stderr);

          this.view?.webview.postMessage({
            type: "compileResult",
            payload: {
              contracts: null,
            },
          });
        }
        fs.unlinkSync(filePath);
        return resolve({
          status: "success",
          message: stdout,
        });
      });
    });
  }

  private async changeAccountState() {
    const accounts = await Promise.all(
      DEFAULT_ACCOUNTS.map(async (account) => {
        return {
          address: account.address,
          privateKey: account.privateKey,
          balance: (await this.node.getBalance(account.address)).toString(),
        };
      })
    );

    this.view?.webview.postMessage({
      type: "changeAccountState",
      payload: {
        accounts,
      },
    });
  }
}
