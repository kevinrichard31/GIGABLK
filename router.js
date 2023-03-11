// Comment exporter les routes du serveur dans un autre fichier
const express = require("express");
const app = express();

// LMDB
const lmdb = require("lmdb");
const open = lmdb.open;

// helpers
const fs = require("fs");
const bs58 = require("bs58");
let elliptic = require("elliptic");
let sha3 = require("js-sha3");
let ec = new elliptic.ec("secp256k1");
const helpers = require("./helpers.js");

let blocks = open({
  path: "blocks",
  // any options go here, we can turn on compression like this:
  compression: true,
});
const router = express.Router();
// Créer une route get qui renvoi un message json
const port = 3000;

app.get("/", (req, res) => {
  var ip = helpers.splitString(req.socket.remoteAddress, ":"); // '127.0.0.1'
  console.log(ip);
  res.json({ message: "Hello /" });
});
app.get("/genesisBlock", async (req, res) => {
  let genesisBlock = {
    index: 0,
    timestamp: Date.now(),
    transactions: [{ type: "genesis", value: 25000000 }],
  };

  await blocks.put(0, genesisBlock);
  await blocks.put("index", 0);
  let x = await blocks.get(0);
  res.json({ message: x });
});

app.get("/generateKeyPair", async (req, res) => {
  if (fs.existsSync("GIGATREEprivateKey.pem" || "GIGATREEpublicKey.pem")) {
    console.log(
      "You already have keys, move your keys if you want generate new Wallet (GIGATREEpublicKey.pem & GIGATREEprivateKey.pem)"
    );
    privateKey = fs.readFileSync("GIGATREEprivateKey.pem");
    publicKey = fs.readFileSync("GIGATREEpublicKey.pem");
    res.json({ message: "Already Generated" });
  } else {
    let keyPair = ec.genKeyPair(); // Generate random keys

    let privKey = keyPair.getPrivate("hex");
    console.log(privKey);
    let pubKey = keyPair.getPublic();
    console.log(`Private key: ${privKey}`);
    console.log("pubkeylll");
    console.log("Public key :", pubKey.encode("hex").substr(2));
    console.log("Public key (compressed):", pubKey.encodeCompressed("hex"));
    const bytes = Buffer.from(pubKey.encodeCompressed("hex"), "hex");
    const addressPubK = bs58.encode(bytes);
    console.log(addressPubK);

    fs.writeFile("GIGATREEprivateKey.pem", privKey, function (err) {
      if (err) throw err;
    });

    fs.writeFile("GIGATREEpublicKey.pem", addressPubK, function (err) {
      if (err) throw err;
    });

    console.log(
      "Yours keys has been generated into the main folder. (GIGATREEprivateKey.pem & GIGATREEpublicKey.pem)"
    );
    res.json({ message: "generated" });
  }
});

app.get("/blocksToWallets", async (req, res) => {
  let index = await blocks.get("index");
  console.log(index);

  switch (index) {
    case 0:
      console.log(index);
      let block = await blocks.get(0);
      console.log("block");
      console.log(block);
      // let walletIdGenesis = helpers.verifySignature(block.message, block.signature)
      // console.log(walletIdGenesis)
      // blocks.get(0, function (err, value) {

      //     let walletIdGenesis = verifySignature(valueParsed)
      //     let messageParsed = JSON.parse(valueParsed.message)
      //     console.log("🌱 ~ file: server.js:864 ~ messageParsed:", messageParsed)
      //     wallets.put(walletIdGenesis, JSON.stringify({
      //         value: messageParsed.maxSupply,
      //         lastTransaction: {
      //             block:valueParsed.blockInfo.blockNumber,
      //             hash: valueParsed.blockInfo.hash
      //         }
      //     }), function (err, value) {
      //         if (err) return console.log('Ooops!', err) // some kind of I/O error
      //         wallets.get(walletIdGenesis, function (err, value) {
      //             if (err) return console.log('Ooops!', err) // some kind of I/O error
      //             console.log("🌱 ~ file: server.js:873 ~ value", JSON.parse(value))
      //         })
      //     })
      // })
      break;
    default:
      break;
  }

  res.json({ message: "BLOCKS TO WALLETS" });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

module.exports = router;
