/**
 * Create Data Feed
 */

 import {
  initSolana,
  createSwitchboardDataFeedAccount
} from './lib';

async function main() {
  console.log("Creating Data Feed...");
  await initSolana();
  await createSwitchboardDataFeedAccount();
}

main().then(
  () => process.exit(),
  err => {
    console.error(err);
    process.exit(-1);
  },
);
