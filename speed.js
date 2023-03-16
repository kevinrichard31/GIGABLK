const axios = require('axios');
const localurl = "http://localhost:3000/";
const http = require('http');
const fetch = require('node-fetch')

async function testx() {
    for (let index = 0; index < 250; index++) {
        axios.get(localurl + "helpers/nodeInformations")
            .then(function (response) {
                // console.log(response.data)
            })
            .catch(function (error) {
                console.log(error);
            })
    }
}

testx()


let sha3 = require("js-sha3");

console.log(sha3.sha3_256("bonjour"))