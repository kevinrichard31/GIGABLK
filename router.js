// Comment exporter les routes du serveur dans un autre fichier
const express = require("express");
const app = express();
const bodyParser = require('body-parser');
const fs = require("fs");
const axios = require("axios");
const localurl = "http://localhost:3000/";

let test = require("./swagger.json");

// LMDB
const lmdb = require("lmdb");
const open = lmdb.open;

// helpers

const bs58 = require("bs58");
let elliptic = require("elliptic");
let sha3 = require("js-sha3");
let ec = new elliptic.ec("secp256k1");
const helpers = require("./helpers.js");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


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
const router = express.Router();
// Créer une route get qui renvoi un message json
const port = 3000;


// ************ INITIALISATION FIRST NODE ********** //
infos.put("gazFee", 0.00010000)
// ************ INITIALISATION FIRST NODE ********** //


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

  console.log()
  await blocks.put(0, genesisBlock);
  await blocks.put("blocksIndex", 0);
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
    blocksIndex: await blocks.get("blocksIndex") ?? null,
    walletsIndex: await wallets.get("walletsIndex") ?? null
  }
  res.json(informations);
});

app.get("/whichWalletsToSync", async (req, res) => {
  try {
    let nodeInformations = await axios.get(localurl + "nodeInformations")
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

  }
});
// SYNC WALLETS FROM BLOCKS
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

app.post("/becomeStacker", async (req, res) => {
  let walletId = helpers.verifySignature(req.body.message, req.body.info.signature)
  var ipClient = helpers.splitString(req.socket.remoteAddress, ":"); // '127.0.0.1'
  let ipSelected = (ipClient == undefined) ? '127.0.0.1' : ipClient
  let isExist = await nodesList.get(ipSelected)
  if(isExist == undefined){
    await nodesList.put(ipSelected, {
      timestamp: Date.now(),
      stacker: true,
      publicKey : walletId
    })
    res.json("Node added to nodesList db")
  } else {
    res.json("Already exist")
  }



});

app.get("/sendBecomeStacker", async (req, res) => { // childs => /becomeStacker
// pour devenir stacker il faut signer un message avec son wallet et envoyer son ip

    let prepareData = {
      message: {
        timestamp: Date.now(),
        transactions: [{ type: "becomeStacker", value: 100000 }]
      },
      info: {
        signature: null,
        howToVerifyInfo: "To verify message, you need to use helpers.js use message as message and info.signature as signature to verify authenticity"
      }
    };

    prepareData.info.signature = helpers.signMessage(prepareData.message);


    
    axios.post(localurl + "becomeStacker", prepareData)
    .then(function (response) {
      console.log("🌱 - file: router.js:267 - response:", response.data)
      res.json(response.data)
    })
    .catch(function (error) {
      res.json(error)
    })


});



app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

module.exports = router;