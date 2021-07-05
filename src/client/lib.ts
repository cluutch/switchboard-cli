/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  Account,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey
} from '@solana/web3.js';
import {
  addFeedJob,
  AggregatorState,
  createDataFeed,
  createFulfillmentManager, 
  createFulfillmentManagerAuth,
  OracleJob,
  parseAggregatorAccountData,
  setDataFeedConfigs,
  setFulfillmentManagerConfigs, 
  SWITCHBOARD_DEVNET_PID,
  updateFeed
} from '@switchboard-xyz/switchboard-api';


import {
  getFulfillmentManager,
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
 * Fullfillment manager (keypair)
 */
let fulfillmentManagerAccount: Account;

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
  fulfillmentManagerAccount = await createFulfillmentManager(connection, payerAccount, SWITCHBOARD_DEVNET_PID);  
  console.log(
    'Created FULFILLMENT_MANAGER_KEY',
    fulfillmentManagerAccount.publicKey.toBase58(),
    'SECRET KEY',
    fulfillmentManagerAccount.secretKey.toJSON()
  ); 
  await setFulfillmentManagerConfigs(
    connection,
    payerAccount,
    fulfillmentManagerAccount, {
      "heartbeatAuthRequired": true,
      "usageAuthRequired": true,
      "lock": false
    });
  
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
      'Created FULFILLMENT_MANAGER_HEARTBEAT_AUTH_KEY',
      authAccount.publicKey.toBase58()
    ); 
}

export async function createSwitchboardDataFeedAccount(): Promise<void> {
  fulfillmentManagerAccount = await getFulfillmentManager();
  console.log(
    'Using fulfillment manager',
    fulfillmentManagerAccount.publicKey.toBase58()
  );
  
  let dataFeedAccount = await createDataFeed(connection, payerAccount, SWITCHBOARD_DEVNET_PID);
  console.log(
    'Created DATA FEED ACCOUNT',
    dataFeedAccount.publicKey.toBase58()
  ); 

  let jobTasks = [
    OracleJob.Task.create({
      httpTask: OracleJob.HttpTask.create({
        url: "https://api.cluutch.io/v2/daily?date=2021-07-04"
      }),
    }),
    OracleJob.Task.create({
      jsonParseTask: OracleJob.JsonParseTask.create({ path: "$[0].avg_price_per_ounce" }),
    })
  ];

  await addFeedJob(connection, payerAccount, dataFeedAccount, jobTasks);

  await setDataFeedConfigs(
    connection,
    payerAccount,
    dataFeedAccount,
    {
        "minConfirmations": 1,
        "minUpdateDelaySeconds": 10,
        "fulfillmentManagerPubkey": fulfillmentManagerAccount.publicKey.toBuffer(),
        "lock": false
    }
  );

  let dataAuthAccount = await createFulfillmentManagerAuth(
    connection,
    payerAccount,
    fulfillmentManagerAccount,
    dataFeedAccount.publicKey,
    {
        "authorizeHeartbeat": true,
        "authorizeUsage": true
    }
  );
  console.log(
    'Created DATA AUTH ACCOUNT',
    dataAuthAccount.publicKey.toBase58()
  ); 
}

export async function updateDataFeed(dataFeedPubkey: PublicKey, dataAuthorizationPubkey: PublicKey): Promise<void> {
  await updateFeed(
    connection,
    payerAccount, 
    dataFeedPubkey,
    dataAuthorizationPubkey // optional
  );
};

export async function readDataFeed(dataFeedPubkey: PublicKey): Promise<void> {
  let state: AggregatorState = await parseAggregatorAccountData(connection, dataFeedPubkey);
  console.log(`(${dataFeedPubkey.toBase58()}) state.\n`,
                JSON.stringify(state.toJSON(), null, 2));

};

export async function refreshSwitchboardFeed(dataFeedPubkey: PublicKey, dataAuthorizationPubkey: PublicKey): Promise<void> {
  console.log("Reading from feed before update");
  await readDataFeed(dataFeedPubkey);
  
  updateDataFeed(dataFeedPubkey, dataAuthorizationPubkey);
  console.log("Updated feed");

  console.log("Reading from feed after update");
  await readDataFeed(dataFeedPubkey);
};