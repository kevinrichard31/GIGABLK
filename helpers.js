let sha3 = require("js-sha3");
let elliptic = require("elliptic");
let ec = new elliptic.ec("secp256k1");
const bs58 = require("bs58");
const fs = require("fs");
const axios = require("axios");

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
    return true
  } else {
    return false
  }
}

module.exports = {
  toPrice2,
  toPrice8,
  signMessage,
  verifySignature,
  splitString,
  getMyIp,
  getPublicKey,
  ipSizeAcceptable
};
