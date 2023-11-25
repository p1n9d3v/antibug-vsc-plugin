import * as vscode from "vscode";

import WebviewPanelProvider from "./webview-panel";
import AntiBlockNode from "../blockchain/node";

import { changeAccountState, convertBalanceByType, postMessage } from "../util";
import { Interface } from "ethers/lib/utils";
import { RunTxResult } from "@ethereumjs/vm";
import { bigIntToHex, bytesToHex } from "@ethereumjs/util";

type State = {
  account: {
    address: string;
    balance: string;
    privateKey: string;
  };
  contract: {
    name: string;
    bytecodes: string;
    address: string;
    abis: string;
    balance: string;
  };
  value: string;
};

export default class ContractInteractionWebviewPanelProvider extends WebviewPanelProvider {
  public node!: AntiBlockNode;
  public primarySidebarWebview!: vscode.WebviewView;
  public state!: State;
  constructor({
    extensionUri,
    node,
    viewType,
    title,
    column = vscode.ViewColumn.Beside,
  }: {
    extensionUri: vscode.Uri;
    node: AntiBlockNode;
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
    this.node = node;
  }

  public render() {
    const htmlPath = this.getPath(
      this.panel.webview,
      "template",
      "contract-interaction",
      "index.ejs"
    ).fsPath;
    const style = this.getPath(
      this.panel.webview,
      "style",
      "contract-interaction",
      "index.css"
    );
    const controller = this.getPath(
      this.panel.webview,
      "controller",
      "contract-interaction",
      "index.js"
    );

    const options = [
      this.getPath(this.panel.webview, "template", "contract-interaction")
        .fsPath,
    ];

    this.panel.webview.html = this.getHtmlForWebview(
      this.panel.webview,
      htmlPath,
      controller,
      style,
      options
    );

    postMessage(this.panel.webview, "init", {
      contract: this.state.contract,
    });

    this.onDidReceiveMessage(async (data) => {
      const { type, payload } = data;

      switch (type) {
        case "call": {
          const { functionName, args } = payload;
          const contract = this.state.contract;
          const currentAccount = this.state.account;
          const iface = new Interface(contract.abis);

          const callData = iface.encodeFunctionData(functionName, args);
          const tx = await this.node.makeFeeMarketEIP1559Transaction({
            to: contract.address,
            value: "0x0",
            callData,
            privateKey: currentAccount.privateKey,
          });

          try {
            const receipt = await this.node.runTx({ tx });

            const {
              amountSpent,
              totalSpent,
              from,
              to,
              executedGasUsed,
              input,
              output,
            } = this.parseReceipt(receipt, iface, functionName);

            const txHash = bytesToHex(tx.hash());

            const balance = (
              await this.node.getBalance(contract.address)
            ).toString();
            postMessage(this.panel.webview, "changeContractBalance", {
              balance,
            });

            const accounts = await changeAccountState(this.node);
            postMessage(this.panel.webview, "changeAccountState", {
              accounts,
            });

            // how to show data bottom panel

            postMessage(this.panel.webview, "transactionResult", {
              txHash,
              amountSpent,
              totalSpent,
              from,
              to,
              executedGasUsed,
              input,
              output,
            });
          } catch (e: any) {
            postMessage(this.panel.webview, "transactionResult", {
              txHash: "Error",
              error: e.message,
            });
          }
          break;
        }
        // case "call": {
        //   // const { functionName, arguments: args } = payload;
        //   const { contract, args } = payload;
        //   const iface = new Interface(contract.abi);

        //   const callData = iface.encodeFunctionData(functionName, args);
        //   const tx = this.node.makeFeeMarketEIP1559Transaction({
        //     to: contract.address,
        //     value: "0x0",
        //     data: callData,
        //   });

        //   const tx = FeeMarketEIP1559Transaction.fromTxData(txData).sign(
        //     hexToBytes(this.currentAccount.privateKey)
        //   );

        //   try {
        //     const receipt = await this.node.runTx({ tx });

        //     const {
        //       amountSpent,
        //       totalSpent,
        //       from,
        //       to,
        //       executedGasUsed,
        //       input,
        //       output,
        //     } = this.parseReceipt(receipt, iface, functionName);

        //     const txHash = bytesToHex(tx.hash());

        //     const balance = (
        //       await this.node.getBalance(contractAddress)
        //     ).toString();
        //     panelProvider.panel.webview.postMessage({
        //       type: "changeContractBalance",
        //       payload: {
        //         balance,
        //       },
        //     });

        //     await this.changeAccountState();

        //     panelProvider.panel.webview.postMessage({
        //       type: "transactionResult",
        //       payload: {
        //         txHash,
        //         amountSpent,
        //         totalSpent,
        //         from,
        //         to,
        //         executedGasUsed,
        //         input,
        //         output,
        //       },
        //     });
        //   } catch (e: any) {
        //     panelProvider.panel.webview.postMessage({
        //       type: "transactionResult",
        //       payload: {
        //         txHash: "Error",
        //         error: e.message,
        //       },
        //     });
        //   }
        //   break;
        // }
      }
    });
  }

  public setState(state: any) {
    console.log(state);
    this.state = {
      ...this.state,
      ...state,
    };
  }

  private parseReceipt(
    receipt: RunTxResult,
    iface: Interface,
    functionName: string
  ) {
    const amountSpent = receipt.amountSpent.toString();
    const totalSpent = receipt.totalGasSpent.toString();
    const from = receipt.execResult.runState?.env.caller.toString();
    const to = receipt.execResult.runState?.env.address.toString();
    const executedGasUsed = receipt.execResult.executionGasUsed.toString();
    const input = iface
      .decodeFunctionData(
        functionName,
        receipt.execResult.runState?.env.callData as any
      )
      .map((arg: any) => arg.toString());
    const output = iface
      .decodeFunctionResult(functionName, receipt.execResult.returnValue as any)
      .map((arg: any) => arg.toString());

    return {
      amountSpent,
      totalSpent,
      from,
      to,
      executedGasUsed,
      input,
      output,
    };
  }
  //       case "send": {
  //         //     const { functionName, arguments: args } = payload;
  //         //     const latestBlock = this.node.getLatestBlock();
  //         //     const estimatedGasLimit = this.node.getEstimatedGasLimit(latestBlock);
  //         //     const baseFee = latestBlock.header.calcNextBaseFee();
  //         //     const callData = iface.encodeFunctionData(functionName, [...args]);
  //         //     const txData = {
  //         //       to: contractAddress,
  //         //       value: bigIntToHex(BigInt(this.value)),
  //         //       maxFeePerGas: baseFee,
  //         //       gasLimit: bigIntToHex(BigInt(estimatedGasLimit)),
  //         //       nonce: await this.node.getNonce(this.currentAccount.privateKey),
  //         //       data: callData,
  //         //     };
  //         //     const tx = FeeMarketEIP1559Transaction.fromTxData(txData).sign(
  //         //       hexToBytes(this.currentAccount.privateKey)
  //         //     );
  //         //     try {
  //         //       const { receipt } = await this.node.mine(tx);
  //         //       const {
  //         //         amountSpent,
  //         //         totalSpent,
  //         //         from,
  //         //         to,
  //         //         executedGasUsed,
  //         //         input,
  //         //         output,
  //         //       } = this.parseReceipt(receipt, iface, functionName);
  //         //       const txHash = bytesToHex(tx.hash());
  //         //       const balance = (
  //         //         await this.node.getBalance(contractAddress)
  //         //       ).toString();
  //         //       panelProvider.panel.webview.postMessage({
  //         //         type: "changeContractBalance",
  //         //         payload: {
  //         //           balance,
  //         //         },
  //         //       });
  //         //       console.log("receipt", receipt);
  //         //       const test =
  //         //         (await receipt.execResult.runState?.stateManager.dumpStorage(
  //         //           new Address(hexToBytes(contractAddress))
  //         //         )) as any;
  //         //       console.log(
  //         //         "rlp",
  //         //         Object.values(test).map((v: any) => RLP.decode(v))
  //         //       );
  //         //       console.log(
  //         //         "1",
  //         //         await receipt.execResult.runState?.stateManager.getContractStorage(
  //         //           new Address(hexToBytes(contractAddress)),
  //         //           hexToBytes("0x0")
  //         //         )
  //         //       );
  //         //       console.log(
  //         //         "2",
  //         //         await receipt.execResult.runState?.stateManager.getContractStorage(
  //         //           new Address(hexToBytes(contractAddress)),
  //         //           hexToBytes("0x1")
  //         //         )
  //         //       );
  //         //       await this.changeAccountState();
  //         //       panelProvider.panel.webview.postMessage({
  //         //         type: "transactionResult",
  //         //         payload: {
  //         //           txHash,
  //         //           amountSpent,
  //         //           totalSpent,
  //         //           from,
  //         //           to,
  //         //           executedGasUsed,
  //         //           input,
  //         //           output,
  //         //         },
  //         //       });
  //         //     } catch (e: any) {
  //         //       panelProvider.panel.webview.postMessage({
  //         //         type: "transactionResult",
  //         //         payload: {
  //         //           txHash: "Error",
  //         //           error: e.message,
  //         //         },
  //         //       });
  //         //     }
  //         //     // get Text from result
  //         //     break;
  //         //   }
  //       }
  //     }
  //   });

  //   case "send": {
  //     const { functionName, arguments: args } = payload;

  //     const latestBlock = this.node.getLatestBlock();
  //     const estimatedGasLimit = this.node.getEstimatedGasLimit(latestBlock);
  //     const baseFee = latestBlock.header.calcNextBaseFee();

  //     const callData = iface.encodeFunctionData(functionName, [...args]);

  //     const txData = {
  //       to: contractAddress,
  //       value: bigIntToHex(BigInt(this.value)),
  //       maxFeePerGas: baseFee,
  //       gasLimit: bigIntToHex(BigInt(estimatedGasLimit)),
  //       nonce: await this.node.getNonce(this.currentAccount.privateKey),
  //       data: callData,
  //     };

  //     const tx = FeeMarketEIP1559Transaction.fromTxData(txData).sign(
  //       hexToBytes(this.currentAccount.privateKey)
  //     );

  //     try {
  //       const { receipt } = await this.node.mine(tx);

  //       const {
  //         amountSpent,
  //         totalSpent,
  //         from,
  //         to,
  //         executedGasUsed,
  //         input,
  //         output,
  //       } = this.parseReceipt(receipt, iface, functionName);
  //       const txHash = bytesToHex(tx.hash());

  //       const balance = (
  //         await this.node.getBalance(contractAddress)
  //       ).toString();
  //       panelProvider.panel.webview.postMessage({
  //         type: "changeContractBalance",
  //         payload: {
  //           balance,
  //         },
  //       });

  //       console.log("receipt", receipt);
  //       const test =
  //         (await receipt.execResult.runState?.stateManager.dumpStorage(
  //           new Address(hexToBytes(contractAddress))
  //         )) as any;
  //       console.log(
  //         "rlp",
  //         Object.values(test).map((v: any) => RLP.decode(v))
  //       );

  //       console.log(
  //         "1",
  //         await receipt.execResult.runState?.stateManager.getContractStorage(
  //           new Address(hexToBytes(contractAddress)),
  //           hexToBytes("0x0")
  //         )
  //       );

  //       console.log(
  //         "2",
  //         await receipt.execResult.runState?.stateManager.getContractStorage(
  //           new Address(hexToBytes(contractAddress)),
  //           hexToBytes("0x1")
  //         )
  //       );

  //       await this.changeAccountState();

  //       panelProvider.panel.webview.postMessage({
  //         type: "transactionResult",
  //         payload: {
  //           txHash,
  //           amountSpent,
  //           totalSpent,
  //           from,
  //           to,
  //           executedGasUsed,
  //           input,
  //           output,
  //         },
  //       });
  //     } catch (e: any) {
  //       panelProvider.panel.webview.postMessage({
  //         type: "transactionResult",
  //         payload: {
  //           txHash: "Error",
  //           error: e.message,
  //         },
  //       });
  //     }
  //     // get Text from result
  //     break;
  //   }
  //   case "call": {
  //     const { functionName, arguments: args } = payload;
  //     const latestBlock = this.node.getLatestBlock();
  //     const estimatedGasLimit = this.node.getEstimatedGasLimit(latestBlock);
  //     const baseFee = latestBlock.header.calcNextBaseFee();

  //     const callData = iface.encodeFunctionData(functionName, args);
  //     const txData = {
  //       to: contractAddress,
  //       value: bigIntToHex(0n),
  //       maxFeePerGas: baseFee,
  //       gasLimit: bigIntToHex(BigInt(estimatedGasLimit)),
  //       nonce: await this.node.getNonce(this.currentAccount.privateKey),
  //       data: callData,
  //     };

  //     const tx = FeeMarketEIP1559Transaction.fromTxData(txData).sign(
  //       hexToBytes(this.currentAccount.privateKey)
  //     );

  //     try {
  //       const receipt = await this.node.runTx({ tx });

  //       const {
  //         amountSpent,
  //         totalSpent,
  //         from,
  //         to,
  //         executedGasUsed,
  //         input,
  //         output,
  //       } = this.parseReceipt(receipt, iface, functionName);

  //       const txHash = bytesToHex(tx.hash());

  //       const balance = (
  //         await this.node.getBalance(contractAddress)
  //       ).toString();
  //       panelProvider.panel.webview.postMessage({
  //         type: "changeContractBalance",
  //         payload: {
  //           balance,
  //         },
  //       });

  //       await this.changeAccountState();

  //       panelProvider.panel.webview.postMessage({
  //         type: "transactionResult",
  //         payload: {
  //           txHash,
  //           amountSpent,
  //           totalSpent,
  //           from,
  //           to,
  //           executedGasUsed,
  //           input,
  //           output,
  //         },
  //       });
  //     } catch (e: any) {
  //       panelProvider.panel.webview.postMessage({
  //         type: "transactionResult",
  //         payload: {
  //           txHash: "Error",
  //           error: e.message,
  //         },
  //       });
  //     }
  //     break;
  //   }
  // }
  // }
}
