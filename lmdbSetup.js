// LMDB
const lmdb = require("lmdb");
const open = lmdb.open;

// Contain all blocks
let blocks = open({
  path: "./db/blocks",
  compression: true,
});
// Contain index of wallets from blocks
let wallets = open({
  path: "./db/wallets",
  compression: true,
});
// Contain this node informations
let infos = open({
  path: "./db/infos",
  compression: true,
});
// Contain list of partners nodes
let nodesList = open({
  path: "./db/nodesList",
  compression: true,
});
// Contain pool of transactions that will be checked
let pool = open({
  path: "./db/pool",
  compression: true,
});

// Contain tokens names and walletId who receive tokens
let tokens = open({
  path: "./db/tokens",
  compression: true,
});

module.exports = {
    blocks,
    wallets,
    infos,
    nodesList,
    pool,
    tokens
  };