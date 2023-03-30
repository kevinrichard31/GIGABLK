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

  { type: "sendToken", value: 100, toPubK: "", tokenName:"" }


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


  // AJOUTER LES FRAIS APRES LA TRANSACTIONS AU WALLET PRINCIPAL
  // AJOUTER LE CAS GENERATE TOKEN A LA ROUTE /ADDTOPOOL
  // DEMANDER DES FRAIS POUR GENERER UN NOUVEAU TOKEN
  // RENDRE LA CREATION DE TOKEN PAYANTE EN GIGATREE
  // FAIRE PAYER LES TRANSACTIONS DES SUBTOKENS


  // PARTIE WALLET ELECTRON
  // GENERER LA SIGNATURE DEPUIS L'ENVOI DE Token
// MODIFIER LA FONCTION SENDTRANSACTION, FAIRE EN SORTE QUE CE SOIT UNE REQUETE POST