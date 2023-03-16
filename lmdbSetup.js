// LMDB
const lmdb = require("lmdb");
const open = lmdb.open;

let blocks = open({
  path: "blocks",
  compression: true,
});
let wallets = open({
  path: "wallets",
  compression: true,
});
let infos = open({
  path: "infos",
  compression: true,
});
let nodesList = open({
  path: "nodesList",
  compression: true,
});

module.exports = {
    blocks,
    wallets,
    infos,
    nodesList
  };