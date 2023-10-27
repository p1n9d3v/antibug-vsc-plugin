import * as ethers from "ethers";
import { ABI } from "../type";
import { Address, bigIntToHex, hexToBytes } from "@ethereumjs/util";

export const makeABI = (abis: ABI[]) => {
  const ABI = abis.map((data) => {
    const { name, inputs, type } = data;
    if (type !== "function") return data;

    const inputsTypes = inputs.map(({ type }) => type).join(",");
    const signature = `function ${name}(${inputsTypes})`;
    const newABI = {
      ...data,
      signature,
    };

    return newABI;
  });
  return ABI;
};

export const encodeCallData = (
  signature: string,
  name: string,
  args: any[]
) => {
  const iface = new ethers.utils.Interface([signature]);
  const data = iface.encodeFunctionData(name, args);
  return data;
};

export const makeGenesisState = (accounts: any) => {
  const convertedAccounts = accounts.map((account: any) => {
    return {
      [privateKeyToAddress(account.privateKey).toString()]: [
        bigIntToHex(account.balance),
        "0x",
        [],
        "0x00",
      ],
    };
  });

  return Object.assign({}, ...convertedAccounts);
};

export const privateKeyToAddress = (privateKey: string) => {
  const address = Address.fromPrivateKey(hexToBytes(privateKey));
  return address;
};
