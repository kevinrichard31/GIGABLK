async function boucles() {
    for (let i = 0; i < 5; i++) {
      console.log("Iteration " + i + " de la boucle exterieure");
      for (let j = 0; j < 3; j++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log("    Iteration " + j + " de la boucle interieure");
      }
    }
  }
  
  boucles();

  { type: "sendToken", value: 100, fromPubK: "", toPubK: "", tokenName:"" }


  // old  syncMyOwnWallets
  let walletId = helpers.verifySignature(block.blockMessage, block.blockInfo.signatureBlock)
  await wallets.put(walletId,
    {
      value: blockValue,
      lastTransaction: {
        block: 0,
        hash: null
      }
    }
  );