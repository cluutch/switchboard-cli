/**
 * Update Data Feed with current values
 */

 import {
  PublicKey
} from '@solana/web3.js';

 import {
  initSolana,
  refreshSwitchboardFeed
} from './lib';

async function main() {
  console.log("Updating Data Feed...");
  const dataFeedPubkey = new PublicKey('D4zVbxxmrSwsNGoJwRUwGUKyLs6xQcF7vnmqmx2otcUr');
  const dataAuthorizationPubkey = new PublicKey('2jmEUAWWNG6GpjuvCaBnr5FsPW81NCg3QYdRkMzgwFDx');
  await initSolana();
  await refreshSwitchboardFeed(dataFeedPubkey, dataAuthorizationPubkey);
}

main().then(
  () => process.exit(),
  err => {
    console.error(err);
    process.exit(-1);
  },
);
