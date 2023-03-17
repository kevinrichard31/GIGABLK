// DECLARATION
const express = require("express");
const app = express();
const bodyParser = require('body-parser');
const fs = require("fs");
const axios = require("axios");
const localurl = "http://localhost:3000/";
const routeHelpers = require("./routes/informations.js");
const bs58 = require("bs58");
let elliptic = require("elliptic");
let sha3 = require("js-sha3");
let ec = new elliptic.ec("secp256k1");

// LMDB
const { blocks, wallets, infos, nodesList } = require('./lmdbSetup.js');

// HELPERS
const helpers = require("./helpers.js");

// *************** ROUTES *************** // 
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(routeHelpers); // routes/helpers.js


const router = express.Router();
// Créer une route get qui renvoi un message json
const port = 3000;


// ************ INITIALISATION FIRST NODE ********** //
infos.put("gazFee", 0.25)
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

  let amountToSendPlusGazFee = await helpers.amountToSendPlusGazFeeCalculator(amountToSend)
  if(wallet){
    if(wallet.tokens[req.body.message.tokenName] >= amountToSendPlusGazFee){
      // Ajouter la transaction à pool de transaction
      res.json(amountToSendPlusGazFee)
    } else {
      res.json("not enough to spend")
    }
  } else {
    res.json("no wallet")
  }

});

// SENDTRANSACTION TO NODE - PASS PARAM $VALUE
// GENERATE TOKEN , CAN'T CREATE TOKEN IF YOU ALREADY HAVE TOKENS IN YOUR WALLETS
app.get("/sendTransaction", async (req, res) => { // childs => /becomeStacker > 
  try {
    if (!req.query.type) {
      return res.status(400).json("Value is missing");
    }

    let prepareData = {
      message: {
        timestamp: Date.now()
      },
      info: {
        signature: null,
        howToVerifyInfo: "To verify message, you need to use helpers.js tool verifySignature() use message as message and info.signature as signature to verify authenticity"
      }
    };
    
    async function executeSwitch(){
      switch (req.query.type) {
        case "sendToken":
          let sendTokenValue = parseFloat(req.query.value) 
          if(isNaN(sendTokenValue)){
            return false
          }
          if(req.query.toPublicKey == undefined || req.query.tokenName == undefined){
            return false
          }
          prepareData.message.type = req.query.type
          prepareData.message.value = sendTokenValue
          prepareData.message.toPublicKey = req.query.toPublicKey
          prepareData.message.tokenName = req.query.tokenName
          break;
        default:

          break;
      }
    }
    executeSwitch().then((data)=>{
      if(data == false){
        res.json('Verify your parameters')
        return
      }
      prepareData.info.signature = helpers.signMessage(prepareData.message);
      console.log(prepareData)
      axios.post(localurl + "transaction", prepareData)
      .then(function (response) {
        res.json(response.data)
      })
      .catch(function (error) {
        res.json(error)
      })
    })



  

  } catch (error) {
    res.json("Erreur lors de la transaction")
  }


});


app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

module.exports = router;