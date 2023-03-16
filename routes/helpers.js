const express = require("express");
const app = express();
const fs = require("fs");
const bs58 = require("bs58");
let elliptic = require("elliptic");
let ec = new elliptic.ec("secp256k1");
const helpers = require("../helpers.js");
const axios = require("axios");
const localurl = "http://localhost:3000/";

// LMDB
const { blocks, wallets, infos, nodesList } = require('../lmdbSetup.js');
// GENERATE KEY PAIRS
app.get("/helpers/generateKeyPair", async (req, res) => {
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


// GENERATE KEY GENESIS BLOCK (FIRST BLOCK => 0)
app.get("/helpers/genesisBlock", async (req, res) => {
  let genesisBlock = {
    blockMessage: {
      index: 0,
      timestamp: Date.now(),
      transactions: [{ type: "genesis", value: 25000000 }]
    },
    blockInfo: {
      signatureBlock: null,
      howToVerifyInfo: "To verify block, you need to use helpers.js use blockMessage as message and blockInfo.signatureBlock as signature to verify authenticity"
    }
  };

  genesisBlock.blockInfo.signatureBlock = helpers.signMessage(genesisBlock.blockMessage);

  console.log()
  await blocks.put(0, genesisBlock);
  await blocks.put("blocksIndex", 0);
  let x = await blocks.get(0);
  res.json(x);
});

// RETURN INFORMATIONS LIKE BLOCKSINDEX AND WALLETINDEX
app.get("/helpers/nodeInformations", async (req, res) => {
  let informations = {
    blocksIndex: await blocks.get("blocksIndex") ?? null,
    walletsIndex: await wallets.get("walletsIndex") ?? null,
    nodeVersion: await infos.get("nodeVersion") ?? null,
    gazFee: await infos.get("gazFee") ?? null
  }
  res.json(informations);
});

// RETRIEVE BLOCKS CLIENT DON'T HAVE
app.get("/returnBlocks", async (req, res) => { // TWO PARAMETERS MIN AND MAX
  let blocksToReturn = []
  let min = JSON.parse(req.query.min);
  let max = JSON.parse(req.query.max);

  if (max - min > 10) {
    res.json("too much blocks asked");
  } else {
    for (let i = min; i < max + 1; i++) {
      let block = await blocks.get(i);
      if (block != undefined) {
        blocksToReturn.push(block);
      }
    }
    if (blocksToReturn.length == 0) {
      res.json("synced");
    } else {
      res.json(blocksToReturn);
    }

  }
});

// DETECT WHICH WALLETS TO SYNC
app.get("/whichWalletsToSync", async (req, res) => {
  try {
    let nodeInformations = await axios.get(localurl + "helpers/nodeInformations")
      .then(function (response) {
        let data = response.data;

        if (data.walletsIndex == data.blocksIndex) {
          res.json("synced")
          return;
        }
    
        let min = 0;
        let max = 0;
    
        if ((data.blocksIndex - data.walletsIndex) > 10) {
          min = data.walletsIndex + 1;
          max = min + 9;
          console.log("🌱 - file: router.js:153 - app.get - max:", max)
        } else if ((data.blocksIndex - data.walletsIndex) <= 10) {
          min = data.walletsIndex + 1;
          max = data.blocksIndex;
          if (data.walletsIndex == null) {
            min = 0;
          }
        }
    
        res.json({ min: min, max: max });
      })
      .catch(function (error) {
        console.log(error);
      })


  } catch (error) {
    console.log(error);
  }
});
// SYNC WALLETS FROM BLOCKS STORED
app.get("/syncMyOwnWallets", async (req, res) => {
  let whichWalletsToSync = await axios.get(localurl + "whichWalletsToSync")
    .then(function (response) {
      return response.data;
    })
    .catch(function (error) {
      console.log(error);
    })
  console.log("🌱 - file: router.js:170 - app.get - whichWalletsToSync:", whichWalletsToSync)


  if (whichWalletsToSync == "synced") {
    res.json("synced");
    return
  }
  let min = whichWalletsToSync.min;
  let max = whichWalletsToSync.max;


  for (let i = min; i < max + 1; i++) {
    let block = await blocks.get(i);
    let count = 0;
    if (block != undefined) {
      // ADD FOR LOOP FOR EACH TRANSACTIONS A FAIRE
      let blockType = block.blockMessage.transactions[0].type;
      let blockValue = block.blockMessage.transactions[0].value;
      let walletIdGenesis = helpers.verifySignature(block.blockMessage, block.blockInfo.signatureBlock)
      await wallets.put(walletIdGenesis,
        {
          value: blockValue,
          lastTransaction: {
            block: 0,
            hash: null
          }
        }
      );
      console.log(await wallets.get(walletIdGenesis))
    }
  }
  await wallets.put("walletsIndex", max);
  let walletsIndex = await wallets.get("walletsIndex");
  res.json({ message: "syncMyOwnWallets", walletsIndex: walletsIndex });
});


module.exports = app;