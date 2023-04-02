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
  let blockZero = await blocks.get(0);
  if(blockZero != undefined){
    res.json('BLock zero existe deja')
    return;
  } else {
    let genesisBlock = {
      blockMessage: {
        index: 0,
        timestamp: Date.now(),
        transactions: [{ message : {type: "generateToken", tokenName: "GIGATREE", value: 25000000, walletId: "cZ4TJ4frv8hdT6a4et4n4oYoePgmABWhj7YTh2wJ926Z", createdOn: Date.now()} }]
      },
      blockInfo: {
        signatureBlock: null,
        howToVerifyInfo: "To verify block, you need to use helpers.js use blockMessage as message and blockInfo.signatureBlock as signature to verify authenticity"
      }
    };
  
    genesisBlock.blockInfo.signatureBlock = helpers.signMessage(genesisBlock.blockMessage);
  
    await blocks.put(0, genesisBlock);
    await blocks.put("blocksIndex", 0);
    let x = await blocks.get(0);
    res.json(x);
  }


});

app.get("/helpers/checkMyWallet", async (req, res) => {
  let wallet = await wallets.get(fs.readFileSync("GIGATREEpublicKey.pem").toString("utf8"))
  // let wallet = await wallets.get("hello")
  console.log("🌱 - file: helpers.js:76 - app.get - wallet:", wallet)
  res.json(wallet);
});

// RETURN INFORMATIONS LIKE BLOCKSINDEX AND WALLETINDEX
app.get("/helpers/nodeInformations", async (req, res) => {
  let informations = {
    blocksIndex: await blocks.get("blocksIndex") ?? null,
    walletsIndex: await wallets.get("walletsIndex") ?? null,
    nodeVersion: await infos.get("nodeVersion") ?? null,
    gazFee: await infos.get("gazFee") ?? null,
    minimumGazFee: await infos.get("minimumGazFee") ?? null
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
          if (data.walletsIndex == null) {
            min = 0;
          }
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


  for (let i = min; i < max + 1; i++) { // PREMIERE BOUCLE SYNCHRONISATION DE CHAQUE BLOCKS
    let block = await blocks.get(i);
    console.log("🌱 - file: informations.js:184 - app.get - i:", i)
    console.log("🌱 - file: informations.js:184 - app.get - block:", block)
    console.log("🌱 - file: informations.js:184 - app.get - block:", block.blockMessage.transactions)
    if (block != undefined) { // BLOCKS NON VIDE DONC...
      let transactions = block.blockMessage.transactions

      for (let j = 0; j < transactions.length; j++) { // DEUXIEME BOUCLE SYNCHRONISATION DE CHAQUES TRANSACTIONS
        let transaction = transactions[j]
        console.log("🌱 - file: informations.js:189 - app.get - transaction:", transaction)

        switch (transaction.message.type) {
          case "generateToken":
            let newWalletCreator = await wallets.get(transaction.message.walletId)
            console.log("🌱 - file: helpers.js:179 - app.get - newWalletCreator:", newWalletCreator)
            if (newWalletCreator == undefined) {
              await wallets.put(transaction.message.walletId,
                {
                  tokens: {
                    [transaction.message.tokenName]: {
                      value: transaction.message.value,
                      feesPaid: 0
                    }
                  },
                  creationDate: Date.now(),
                  lastTransaction: {
                    block: null,
                    id: null
                  }
                }
              );
            }
            break;
          case "sendToken":
            let walletIdSender = helpers.verifySignature(transaction.message, transaction.info.signature)
            console.log("🌱 - file: informations.js:206 - app.get - walletIdSender:", walletIdSender)
            let walletIdReceiver = transaction.message.toPublicKey
            let walletSender = await wallets.get(walletIdSender)
            console.log("🌱 - file: informations.js:219 - app.get - walletSender:", walletSender)
            let walletReceiver = await wallets.get(walletIdReceiver)
            if(walletReceiver == undefined){
              await wallets.put(walletIdReceiver,
                {
                  tokens: {
                    [transaction.message.tokenName]: {
                      value: transaction.message.value,
                      feesPaid: 0
                    }
                  },
                  creationDate: Date.now(),
                  lastTransaction: {
                    block: null,
                    id: null
                  }
                }
              );
              walletSender.tokens[transaction.message.tokenName].value -= transaction.message.amountToSendPlusGazFee
              walletSender.tokens[transaction.message.tokenName].feesPaid = helpers.toPrice8(walletSender.tokens[transaction.message.tokenName].feesPaid + transaction.message.gazFees)
              walletSender.lastTransaction.block = i
              walletSender.lastTransaction.id = transaction.message.randomId
              await wallets.put(walletIdSender, walletSender)
            } else if(walletIdReceiver != undefined){
              walletReceiver.tokens[transaction.message.tokenName].value = helpers.toPrice8(walletReceiver.tokens[transaction.message.tokenName].value + transaction.message.value)
              
              walletSender.tokens[transaction.message.tokenName].value = helpers.toPrice8(walletSender.tokens[transaction.message.tokenName].value - transaction.message.amountToSendPlusGazFee)
              walletSender.tokens[transaction.message.tokenName].feesPaid = helpers.toPrice8(walletSender.tokens[transaction.message.tokenName].feesPaid + transaction.message.gazFees)
              walletSender.lastTransaction.block = i
              walletSender.lastTransaction.id = transaction.message.randomId
              await wallets.put(walletIdSender, walletSender)
              await wallets.put(walletIdReceiver, walletReceiver)
            }
            break;
          default:
            break;
        }


      }
    }

  }



  await wallets.put("walletsIndex", max);
  let walletsIndex = await wallets.get("walletsIndex");
  res.json({ message: "syncMyOwnWallets", walletsIndex: walletsIndex });
});

app.get("/getPeerList", async (req, res) => {
  console.log('tet')
  res.json(['localhost:3000'])
});


app.get("/getWallet", async (req, res) => {

  let wallet = await wallets.get(req.query.walletid)
  res.json(wallet)
});


module.exports = app;