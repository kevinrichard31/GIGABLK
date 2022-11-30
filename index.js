const lmdb = require("lmdb");
const open = lmdb.open;
const helpers = require("./helpers.js");
const routes = require("./router.js");

let message = { value: 4000 };
let signature = helpers.signMessage({ value: 4000 });

let prepareData = {
  message: message,
  signature: signature,
};
console.log(prepareData);
console.log(helpers.verifySignature(message, signature));
