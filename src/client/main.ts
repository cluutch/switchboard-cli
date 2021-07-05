/**
 * Create Fulfillment Manager
 */

import {
  initSolana,
  createSwitchboardFulfillmentManager
} from './hello_world';

async function main() {
  console.log("Creating Fulfillment Manager...");
  await initSolana();
  await createSwitchboardFulfillmentManager();
}

main().then(
  () => process.exit(),
  err => {
    console.error(err);
    process.exit(-1);
  },
);
