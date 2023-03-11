const axios = require('axios');
const localurl = "http://localhost:3000/";
const http = require('http');
const fetch = require('node-fetch')

async function testx() {
    for (let index = 0; index < 1000; index++) {



        await axios.get(localurl + "nodesInformations")
            .then(function (response) {

            })
            .catch(function (error) {
                console.log(error);
            })
    }
    



}




testx()

