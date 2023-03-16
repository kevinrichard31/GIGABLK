// LMDB
const lmdb = require("lmdb");
const open = lmdb.open;

let blocks = open({
  path: "./db/blocks",
  compression: true,
});
let wallets = open({
  path: "./db/wallets",
  compression: true,
});
let infos = open({
  path: "./db/infos",
  compression: true,
});
let nodesList = open({
  path: "./db/nodesList",
  compression: true,
});

module.exports = {
    blocks,
    wallets,
    infos,
    nodesList
  };