import * as ethers from "ethers";
import { ABI } from "../types";

export const makeABIEnocde = (abis: ABI[]) => {
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
