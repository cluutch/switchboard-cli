/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  Account,
  Connection,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { 
  createFulfillmentManager, 
  createFulfillmentManagerAuth,
  setFulfillmentManagerConfigs, 
  SWITCHBOARD_DEVNET_PID,
} from '@switchboard-xyz/switchboard-api';


import {
  getPayer,
  getRpcUrl,
  newAccountWithLamports,
} from './utils';

/**
 * Connection to the network
 */
let connection: Connection;

/**
 * Account (keypair)
 */
let payerAccount: Account;

/**
 * Establish a connection to the cluster
 */
export async function establishConnection(): Promise<void> {
  const rpcUrl = await getRpcUrl();
  connection = new Connection(rpcUrl, 'confirmed');
  const version = await connection.getVersion();
  console.log('Connection to cluster established:', rpcUrl, version);
}

/**
 * Establish an account to pay for everything
 */
export async function establishPayer(): Promise<void> {
  if (!payerAccount) {
    try {
      // Get payer from cli config
      payerAccount = await getPayer();
    } catch (err) {
      // Fund a new payer via airdrop
      payerAccount = await newAccountWithLamports(connection, 10000);
    }
  }

  const lamports = await connection.getBalance(payerAccount.publicKey);
  
  console.log(
    'Using account',
    payerAccount.publicKey.toBase58(),
    'containing',
    lamports / LAMPORTS_PER_SOL,
    'SOL to pay for fees',
  );
}

export async function initSolana(): Promise<void> {
    // Establish connection to the cluster
    await establishConnection();
    console.log("Established connection");
  
    // Determine who pays for the fees
    await establishPayer();
    console.log("Established payer");
};


export async function createSwitchboardFulfillmentManager(): Promise<void> {
  payerAccount = await getPayer();
  let fulfillmentManagerAccount = await createFulfillmentManager(connection, payerAccount, SWITCHBOARD_DEVNET_PID);  
  console.log(
    'Created fulfillment manager account',
    fulfillmentManagerAccount.publicKey.toBase58()
  ); 

  await setFulfillmentManagerConfigs(
    connection,
    payerAccount,
    fulfillmentManagerAccount, {
      "heartbeatAuthRequired": true,
      "usageAuthRequired": true,
      "lock": false
    });
  console.log(
    'Set fulfillment manager configs',
  ); 
  
  let authAccount = await createFulfillmentManagerAuth(
    connection,
    payerAccount,
    fulfillmentManagerAccount,
    payerAccount.publicKey,
    {
        "authorizeHeartbeat": true,
        "authorizeUsage": false
    });
    console.log(
      'Created AUTH account',
      authAccount.publicKey.toBase58()
    ); 
}
