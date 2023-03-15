// DECLARATION
const express = require("express");
const app = express();
const bodyParser = require('body-parser');
const fs = require("fs");
const axios = require("axios");
const localurl = "http://localhost:3000/";
const routeHelpers = require("./routes/helpers.js");
const bs58 = require("bs58");
let elliptic = require("elliptic");
let sha3 = require("js-sha3");
let ec = new elliptic.ec("secp256k1");

// LMDB
const lmdb = require("lmdb");
const open = lmdb.open;

// HELPERS
const helpers = require("./helpers.js");

// *************** ROUTES *************** // 
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(routeHelpers); // routes/helpers.js

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
infos.put("nodeVersion", 1)
// ************ INITIALISATION FIRST NODE ********** //


app.get("/", (req, res) => {
  var ip = helpers.splitString(req.socket.remoteAddress, ":"); // '127.0.0.1'
  console.log(ip);
  res.json({ message: "Hello " + ip });
});

// DEPENDENCIE OF /sendBecomStacker route
app.post("/becomeStacker", async (req, res) => {
  let walletId = helpers.verifySignature(req.body.message, req.body.info.signature)
  var ipClient = helpers.splitString(req.socket.remoteAddress, ":"); // '127.0.0.1'
  let ipSelected = (ipClient == undefined) ? '127.0.0.1' : ipClient
  let ipExist = await nodesList.get(ipSelected)
  if(ipExist == undefined){
    await nodesList.put(ipSelected, {
      timestamp: Date.now(),
      stacker: true,
      publicKey : walletId
    })
    res.json("Node added to nodesList db")
  } else {
    res.json("Already in nodesList")
  }
});

//
app.get("/sendBecomeStacker", async (req, res) => { // childs => /becomeStacker
// pour devenir stacker il faut signer un message avec son wallet et envoyer son ip

    let prepareData = {
      message: {
        timestamp: Date.now(),
        type: "becomeStacker"
      },
      info: {
        signature: null,
        howToVerifyInfo: "To verify message, you need to use helpers.js tool verifySignature() use message as message and info.signature as signature to verify authenticity"
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

// DEPENDENCIE OF SENDTRANSACTION
app.post("/transaction", async (req, res) => { // childs => /becomeStacker
  let walletId = helpers.verifySignature(req.body.message, req.body.info.signature)
  let amountToSend = req.body.message.value
  let wallet = await wallets.get(walletId)
  let gazFee = await infos.get("gazFee")
  let amountToSendPlusGazFee = amountToSend + gazFee
  console.log("🌱 - file: router.js:111 - app.post - amountToSendPlusGazFee:", amountToSendPlusGazFee)
  if(wallet.value >= amountToSendPlusGazFee){
    console.log('ok on peut faire la transaction')
  }
  console.log("🌱 - file: router.js:110 - app.post - gazFee:", gazFee)
  console.log("🌱 - file: router.js:108 - app.post - wallet:", wallet)
  res.json("Transaction sent to network, verify in block explorer if validated")
});

// SENDTRANSACTION TO NODE - PASS PARAM $VALUE
app.get("/sendTransaction", async (req, res) => { // childs => /becomeStacker > 
  let valueToSend = JSON.parse(req.query.value)
  let prepareData = {
    message: {
      timestamp: Date.now(),
      type: "transaction",
      value: valueToSend // PARAM IN URL
    },
    info: {
      signature: null,
      howToVerifyInfo: "To verify message, you need to use helpers.js tool verifySignature() use message as message and info.signature as signature to verify authenticity"
    }
  };

  prepareData.info.signature = helpers.signMessage(prepareData.message);

  axios.post(localurl + "transaction", prepareData)
  .then(function (response) {
    res.json(response.data)
  })
  .catch(function (error) {
    res.json(error)
  })
});


app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
  console.log(`Example app listening at http://localhost:${port}/sendTransaction`);
});

module.exports = router;