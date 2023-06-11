
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
const { blocks, wallets, infos, nodesList, pool, tokens } = require('./lmdbSetup.js');

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
infos.put("gazFee", 0.25) // PERCENT
infos.put("minimumGazFee", 0.005) // MINIMUM GAZ FEE FIXED
infos.put("nodeVersion", 1)
infos.put("gazFeeSubToken", 1) // AMOUNT FIXED
infos.put("generateTokenFee", 10) // AMOUNT FIXED
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
  if (ipExist == undefined) {
    await nodesList.put(ipSelected, {
      timestamp: Date.now(),
      stacker: true,
      publicKey: walletId
    })
    res.json("Node added to nodesList db")
  } else {
    res.json("Already in nodesList")
  }
});

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
// PART REALLY IMPORTANT ***** VERIFY ALL TRANSACTION BEFORE PUSHING TO POOL USING SWITCH 
app.post("/addToPool", async (req, res) => {
  console.log(req.body)
  console.log("🌱 - file: router.js:95 - app.post - req.body:", req.body)
  
  let walletId = helpers.verifySignature(req.body.message, req.body.info.signature) 
  console.log("🌱 - file: router.js:98 - app.post - walletId:", walletId)

  let isRandomIdAlreadyExist = await helpers.isRandomIdAlreadyExist(walletId, req.body.message.randomId)
  if(isRandomIdAlreadyExist == true){ // SECURITY, blocks the sending of same transaction
    res.json("Id already exist, you can't reuse the same id")
    return;
  }
  let isExistInPool
  switch (req.body.message.type) {

    case "sendToken":
      let toPubK = req.body.message.toPublicKey;
      if(walletId == toPubK){ // SECURITY, blocks the sending of infinite tokens
        res.json("A wallet cannot send a transaction to itself")
        return;
      }
      isExistInPool = await pool.get(walletId)
      if (isExistInPool != undefined) {
        res.json("Already a transaction in progress for this wallet, wait for next block")
        return;
      }
      let amountToSend = req.body.message.value
      let wallet = await wallets.get(walletId)
      let amountToSendPlusGazFee = await helpers.amountToSendPlusGazFeeCalculator(amountToSend, req.body.message.tokenName)
      console.log("🌱 - file: router.js:122 - app.post - amountToSendPlusGazFee:", amountToSendPlusGazFee)
      let gazFees = await helpers.gazFeeCalculator(amountToSend, req.body.message.tokenName)
      if(amountToSendPlusGazFee != req.body.message.amountToSendPlusGazFee){
        res.json("Error, Recalculate the gas fees")
        return;
      }
      if(gazFees != req.body.message.gazFees){
        res.json("Error, Recalculate the gas fees")
        return;
      }

      
      
      

      console.log("🌱 - file: router.js:109 - app.post - req.body.message:", req.body.message)
      if (wallet && wallet.tokens[req.body.message.tokenName]) {
        if (wallet.tokens[req.body.message.tokenName].value >= amountToSendPlusGazFee) {
          // Ajouter la transaction à pool de transaction
          await pool.put(walletId, req.body)
          res.json("Transaction added to pool, imminent validation... check on explorer")
        } else {
          res.json("not enough to spend")
        }
      } else {
        res.json("no wallet")
      }
      break;
    case "generateToken":
      isExistInPool = await pool.get(walletId)
      if (isExistInPool != undefined) {
        res.json("Already a transaction in progress for this wallet, wait for next block")
        return;
      }

      let isTokenExist = await tokens.get(req.body.message.tokenName)
      if(isTokenExist != undefined){
        return false;
      }

      let generateTokenFee = await infos.get("generateTokenFee")
      if(generateTokenFee != req.body.message.gazFees){
        return false;
      }

      try {
        let walletCreator =  await wallets.get(walletId)
        if(walletCreator.tokens.GIGATREE.value < generateTokenFee){
          return false;
        }
      } catch (error) {
        return false;
      }
      

      await pool.put(walletId, req.body)
      res.json("Transaction added to pool, imminent validation... check on explorer")
    default:
      break;
  }
});

// SENDTRANSACTION TO NODE - PASS PARAM $VALUE
// GENERATE TOKEN , CAN'T CREATE TOKEN IF YOU ALREADY HAVE TOKENS IN YOUR WALLETS
app.get("/sendTransaction", async (req, res) => { // childs => /addToPool > 
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

    async function executeSwitch() {
      switch (req.query.type) {
        case "sendToken":
          let amountToSend = Math.abs(parseFloat(req.query.value))
          console.log("🌱 - file: router.js:145 - executeSwitch - amountToSend:", amountToSend)

          if (isNaN(amountToSend)) {
            return false
          }
          if (req.query.toPublicKey == undefined || req.query.tokenName == undefined) {
            return false
          }
          prepareData.message.type = req.query.type
          prepareData.message.value = amountToSend
          prepareData.message.toPublicKey = req.query.toPublicKey
          prepareData.message.tokenName = req.query.tokenName
          console.log("🌱 - file: router.js:218 - executeSwitch - prepareData.message.tokenName:", prepareData.message.tokenName)
          prepareData.message.randomId = helpers.makeid(10)
          prepareData.message.amountToSendPlusGazFee = helpers.toPrice8(await helpers.amountToSendPlusGazFeeCalculator(amountToSend, req.query.tokenName))
          prepareData.message.gazFees = helpers.toPrice8(await helpers.gazFeeCalculator(amountToSend, req.query.tokenName))
          console.log("🌱 - file: router.js:159 - executeSwitch - prepareData.message.gazFees:", prepareData.message.gazFees)
          return prepareData
          break;
        case "generateToken":
          console.log('test')
          console.log(req.query)
          break;
        default:

          break;
      }
    }
    executeSwitch().then(async (data) => {
      if (data == false || data == undefined) {
        res.json('Verify your parameters')
        return
      }
      prepareData.info.signature = helpers.signMessage(prepareData.message);
      console.log("🌱 - file: router.js:177 - executeSwitch - prepareData:", prepareData)
      if (await helpers.validateObjectSendToken(prepareData) == false) {
        res.json('error')
        return false;
      }
      axios.post(localurl + "addToPool", prepareData)
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
app.post("/sendTransaction", async (req, res) => { // childs => /addToPool > 
  try {

    console.log(req.body)
    switch (req.body.message.type) {
      case 'sendToken':
        if (await helpers.validateObjectSendToken(req.body) == false) {
          res.json('error')
          return false;
        }
        axios.post(localurl + "addToPool", req.body)
          .then(function (response) {
            res.json(response.data)
          })
          .catch(function (error) {
            res.json(error)
          })
        break;
      case 'generateToken':
        console.log(req.body)
        console.log("🌱 - file: router.js:242 - app.post - req.body:", req.body)
        if (await helpers.validateObjectGenerateToken(req.body) == false) {
          res.json('error')
          return false;
        }
        axios.post(localurl + "addToPool", req.body)
        .then(function (response) {
          res.json(response.data)
        })
        .catch(function (error) {
          res.json(error)
        })
        break;
      default:
        res.json('error')
        break;
    }
  } catch (error) {
    res.json('error')
  }


});


app.listen(port, () => {
  console.log(`Gigatree Node launched at http://localhost:${port}`);
});

module.exports = router;