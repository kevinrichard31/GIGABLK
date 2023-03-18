let sha3 = require("js-sha3");
let elliptic = require("elliptic");
let ec = new elliptic.ec("secp256k1");
const bs58 = require("bs58");
const fs = require("fs");
const axios = require("axios");
// LMDB
const { blocks, wallets, infos, nodesList, pool } = require('./lmdbSetup.js');

function toPrice2(params) {
  return parseFloat(params).toFixed(2);
}

function toPrice8(params) {
  return parseFloat(params).toFixed(8);
}

function splitString(stringToSplit, separator) {
  var arrayOfStrings = stringToSplit.split(separator); // [ '', '', 'ffff', '127.0.0.1' ]
  return arrayOfStrings[3];
}

function getMyIp(){
  return axios.get("http://ip-api.com/json/?fields=61439")
  .then(function (response) {
    return response.data.query;
  })
  .catch(function (error) {
    console.log(error);
  })
}

function signMessage(message) {
  let msgHash = sha3.keccak256(JSON.stringify(message));
  let signature = ec.sign(
    msgHash,
    fs.readFileSync("GIGATREEprivateKey.pem").toString("utf8"),
    "hex"
  );

  signature = JSON.stringify(signature);

  return signature;
}

function verifySignature(messageJSON, signatureFromHelpersSTRING) {
  let msgHash = sha3.keccak256(JSON.stringify(messageJSON));
  let hexToDecimal = (x) =>
    ec.keyFromPrivate(x, "hex").getPrivate().toString(10);

  let pubKeyRecovered = ec.recoverPubKey(
    hexToDecimal(msgHash),
    JSON.parse(signatureFromHelpersSTRING),
    JSON.parse(signatureFromHelpersSTRING).recoveryParam,
    "hex"
  );

  const bytes = Buffer.from(pubKeyRecovered.encodeCompressed("hex"), "hex");
  const addressRecovered = bs58.encode(bytes);
  return addressRecovered;
}

function getPublicKey(){
  return fs.readFileSync("GIGATREEpublicKey.pem", 'utf8');
}

function ipSizeAcceptable(val){

  if(val != undefined){
    return true;
  } else {
    return false;
  }
}

async function amountToSendPlusGazFeeCalculator(amountToSend){
  let gazFeePercent = await infos.get("gazFee");
  let amountToSendPlusGazFee = amountToSend + (amountToSend*gazFeePercent/100);
  return amountToSendPlusGazFee;
}

async function gazFeeCalculator(amountToSend){
  let gazFeePercent = await infos.get("gazFee");
  let gazFee = (amountToSend*gazFeePercent/100);
  return gazFee;
}

function makeid(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

function sortByRandomId(arr) {
  return arr.sort((a, b) => {
    const idA = a.message.randomId;
    const idB = b.message.randomId;

    // Compare les deux chaînes en les convertissant en valeurs numériques si possible
    const numA = parseFloat(idA) || idA;
    const numB = parseFloat(idB) || idB;

    if (numA < numB) {
      return -1;
    }
    if (numA > numB) {
      return 1;
    }
    // Si les deux chaînes sont égales en valeur numérique, compare les chaînes en ordre alphabétique
    if (typeof numA === 'string' && typeof numB === 'string') {
      return numA.localeCompare(numB);
    }
    return 0;
  });
}

// ********************************************* //
// ************** BLOCK BUILDER **************** //
// ********************************************* //
async function blockBuilder(){
  let poolData = await pool.getRange()
  let count = 0
  let transactions = []
  let blockIndex = await blocks.get("blocksIndex")
  let newBlockIndex = blockIndex + 1
  for(let transaction of poolData){
    count++
    if(count <= 20){
      transactions.push(transaction.value)
    }
  }
  if(count == 0){ // RETURN IF TRANSACTIONS IS EMPTY TO DISABLE BLOCK CREATION
    return; 
  }
  const sortedArray = sortByRandomId(transactions);
  let block = {
    blockMessage: {
      index: newBlockIndex,
      timestamp: Date.now(),
    },
    blockInfo: {
      signatureBlock: null,
      howToVerifyInfo: "To verify block, you need to use helpers.js use blockMessage as message and blockInfo.signatureBlock as signature to verify authenticity"
    }
  };

  block.blockMessage.transactions = transactions
  block.blockInfo.signatureBlock = signMessage(block.blockMessage);
  await blocks.put(newBlockIndex, block);
  await blocks.put("blocksIndex", newBlockIndex);
  await pool.clearAsync()
}
setInterval(() => {
  blockBuilder()
}, 3000);

// ************************************************* //
// ************** BLOCK CONSTRUCTOR **************** //
// ************************************************* //

// Constructor function for blocks




module.exports = {
  toPrice2,
  toPrice8,
  signMessage,
  verifySignature,
  splitString,
  getMyIp,
  getPublicKey,
  ipSizeAcceptable,
  amountToSendPlusGazFeeCalculator,
  makeid,
  blockBuilder,
  gazFeeCalculator
};
