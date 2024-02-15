// src/index.js
import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import {
  createKernelAccount,
  createZeroDevPaymasterClient,
  createKernelAccountClient,
} from "@zerodev/sdk"
import { http, Hex, createPublicClient, zeroAddress } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import { polygonMumbai } from "viem/chains"
import { UserOperation } from "permissionless"

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.get("/", async (req: Request, res: Response) => {
  if (!process.env.BUNDLER_RPC || !process.env.PAYMASTER_RPC || !process.env.PRIVATE_KEY) {
    throw new Error("BUNDLER_RPC or PAYMASTER_RPC or PRIVATE_KEY is not set")
  }

  const publicClient = createPublicClient({
    transport: http(process.env.BUNDLER_RPC),
  })

  const signer = privateKeyToAccount(process.env.PRIVATE_KEY as Hex)

  const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
    signer,
  })

  const account = await createKernelAccount(publicClient, {
    plugins: {
      sudo: ecdsaValidator,
    }
  })

  const kernelClient = createKernelAccountClient({
    account,
    chain: polygonMumbai,
    transport: http(process.env.BUNDLER_RPC),
    sponsorUserOperation: async ({ userOperation }): Promise<UserOperation> => {
      const paymasterClient = createZeroDevPaymasterClient({
        chain: polygonMumbai,
        transport: http(process.env.PAYMASTER_RPC),
      })
      return paymasterClient.sponsorUserOperation({
        userOperation,
      })
    },
  })

  console.log("My account:", kernelClient.account.address)

  res.send("Express + TypeScript Server");
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});