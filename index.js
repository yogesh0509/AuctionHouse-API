const express = require('express')
const fetch = require('node-fetch');
const Moralis = require('moralis').default
const { ethers } = require("ethers");
const { EvmChain } = require("@moralisweb3/evm-utils")
const ContractAbi = require("./constants/ContractAbi.json")
require('dotenv').config()

const app = express()
const port = 3001
const abiCoder = ethers.utils.defaultAbiCoder;


const MORALIS_API_KEY = process.env.MORALIS_API_KEY
const address = process.env.GOERLI_CONTRACT_ADDRESS
const chain = EvmChain.GOERLI

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.post("/webhook", async (req, res) => {
    const { headers, body } = req;

    try {
        Moralis.Streams.verifySignature({
            body,
            signature: headers["x-signature"],
        });

        console.log(body);

        return res.status(200).json();
    } catch (e) {
        console.log("Not Moralis");
        return res.status(400).json();
    }
});

app.get("/playerdata", async (req, res) => {

    const functionName = "getTokenCounter"
    const abi = JSON.parse(ContractAbi["IdentityNft"])
    const response = await Moralis.EvmApi.utils.runContractFunction({
        abi,
        functionName,
        address,
        chain,
    });
    const total_players = response.result
    let abi_response = []

    for (let i = 0; i < total_players; i++) {

        let tokenId = String(i)
        const response = await Moralis.EvmApi.nft.getNFTMetadata({
            address,
            chain,
            tokenId,
        }); 

        let playerId = response.result.metadata.attributes[2].value
        const url = `https://unofficial-cricbuzz.p.rapidapi.com/players/get-batting?playerId=${playerId}`

        const options = {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': '673075d6ebmshf9d93a82582ea4fp1bfa13jsndc6cd297a25f',
                'X-RapidAPI-Host': 'unofficial-cricbuzz.p.rapidapi.com'
            }
        };

        const user = await fetch(url, options)
        const data = await user.json()
        abi_response.push(abiCoder.encode(["uint256", "uint256"], [parseInt(data.values[5].values[3]), parseInt(data.values[6].values[3])]))
    }
    console.log(abi_response)
    return res.status(200).json({
        abi: abi_response
    })

});


const startServer = async () => {
    await Moralis.start({
        apiKey: MORALIS_API_KEY,
    })
    const abi = {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "tokenId",
                "type": "uint256"
            }
        ],
        "name": "nftminted",
        "type": "event"
    }
    const topic = "NftMinted(uint256)"

    const response = await Moralis.EvmApi.events.getContractEvents({
        address,
        chain,
        topic,
        abi,
    });
    console.log(response.result);

    app.listen(port, () => {
        console.log(`Example app listening on port ${port}`)
    })
}

startServer()