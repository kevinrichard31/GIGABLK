// Comment exporter les routes du serveur dans un autre fichier
const express = require("express");
const app = express();
const fs = require("fs");
const axios = require("axios");
const localurl = "http://localhost:3000/";

let test = require("./swagger.json");

const swaggerUi = require('swagger-ui-express');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(test));
// LMDB
const lmdb = require("lmdb");
const open = lmdb.open;

// helpers

const bs58 = require("bs58");
let elliptic = require("elliptic");
let sha3 = require("js-sha3");
let ec = new elliptic.ec("secp256k1");
const helpers = require("./helpers.js");



let blocks = open({
  path: "blocks",
  compression: true,
});
let wallets = open({
  path: "wallets",
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

  await blocks.put(0, genesisBlock);
  await blocks.put("blockIndex", 0);
  let x = await blocks.get(0);
  res.json(x);
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

// RETURN INFORMATIONS LIKE BLOCKSINDEX AND WALLETINDEX
app.get("/nodeInformations", async (req, res) => {
  let informations = {
    blocksIndex: await blocks.get("blockIndex") ?? null,
    walletsIndex: await wallets.get("walletIndex") ?? null
  }
  res.json(informations);
});


app.get("/whichBlocksToSync", async (req, res) => {
  let nodeInformations = await axios.get(localurl + "nodeInformations")
    .then(function (response) {
      return response.data;
    })
    .catch(function (error) {
      console.log(error);
    })

    let maxIndex = Math.max(nodeInformations.blocksIndex, nodeInformations.walletsIndex);
    

    
  let min = null;
  let max = null;
  if(min == null){
    min = 0;
  } else {
    min = nodeInformations.blocksIndex + 1;
  }



  res.json();
});
// SYNC WALLETS FROM BLOCKS
app.get("/syncMyOwnWallets", async (req, res) => {
  let nodeInformations = await axios.get(localurl + "nodeInformations")
    .then(function (response) {
      return response.data;
    })
    .catch(function (error) {
      console.log(error);
    })
  console.log("🌱 - file: router.js:146 - app.get - nodeInformations:", nodeInformations)

  let min = 0;
  let max = 0;

  if (nodeInformations.walletsIndex == null) { // IF NULL
    min = 0;
    max = min + 9;
    for (let i = min; i < max + 1; i++) {
      let block = await blocks.get(i);
      if(block != undefined) {
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
  } else if (nodeInformations.walletsIndex >= 0) { // IF SUP OR EQUAL TO 0
    min = nodeInformations.walletsIndex + 1;
    max = min + 9;
  }




  // switch (blockIndex) {
  //   case 0:
  //     let block = await blocks.get(0);
  //     let blockType = block.blockMessage.transactions[0].type;
  //     let blockValue = block.blockMessage.transactions[0].value;
  //     let walletIdGenesis = helpers.verifySignature(block.blockMessage, block.blockInfo.signatureBlock)
  //     await blocks.put("blockIndex", 0);
  //     await wallets.put(walletIdGenesis, 
  //       {
  //               value: blockValue,
  //               lastTransaction: {
  //                   block:0,
  //                   hash: null
  //               }
  //       }
  //     );
  //     console.log(await wallets.get(walletIdGenesis))
  //     break;
  //   default:
  //     break;
  // }

  res.json({ message: "syncMyOwnWallets" });
});



app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

module.exports = router;



      // axios.get(localurl + "genesisBlock")
      //     .then(function (response) {
      //       console.log(response.data);
      //     })
      //     .catch(function (error) {
      //       console.log(error);
      //     })