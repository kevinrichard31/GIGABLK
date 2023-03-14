const axios = require('axios');
const localurl = "http://localhost:3000/";
const http = require('http');
const fetch = require('node-fetch')

async function testx() {
    for (let index = 0; index < 1200; index++) {
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

