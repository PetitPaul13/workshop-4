import bodyParser from "body-parser";
import express from "express";
import { BASE_ONION_ROUTER_PORT, REGISTRY_PORT } from "../config";
import { generateRsaKeyPair, exportPubKey, exportPrvKey, rsaDecrypt, symDecrypt } from "../crypto";
import axios from 'axios';
import http from "http";

// Fonction pour enregistrer un noeud dans le registre (+ lisibilité pour la fonction simpleOnionRouter
async function registerNode(nodeId: number, pubKeyBase64: string) {

  // Données à envoyer pour l'enregistrement
  const data = JSON.stringify({
    nodeId,
    pubKey: pubKeyBase64,
  });

  // Les paramètre pour une requête HTTP
  const options = {
    hostname: 'localhost',
    port: REGISTRY_PORT,
    path: '/registerNode',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
    },
  };

  try {
    // Ici on effectue une requête HTTP POST pour enregistrer le nœud
    const response = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        res.on('end', () => {
          resolve(responseData);
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      // On envoie les données dans le corps de la requête
      req.write(data);
      req.end();
    });
    console.log(`Response: ${response}`);
  } catch (error) {
    console.error(`Problem with request: ${(error as Error).message}`);
  }
}

// Fonction pour créer un Onion Router Simple
export async function simpleOnionRouter(nodeId: number) {

  // On crée une instance express pour le routeur
  const router = express();
  router.use(express.json());
  router.use(bodyParser.json());

  // Ici ce sont les variables de suivis
  let lastEncryptedMsg: string | null = null;
  let lastDecryptedMsg: string | null = null;
  let lastMsgDestination: number | null = null;

  // On génère une paire de clés asymétrique RSA pour le nœud
  const { publicKey, privateKey } = await generateRsaKeyPair();
  const pubKeyBase64 = await exportPubKey(publicKey);
  const prvKeyBase64 = await exportPrvKey(privateKey);

  // Ici on enregistre le noeud dans le registre (grâce à notre fonction)
  await registerNode(nodeId, pubKeyBase64);

  // On définit les endPoints/Routes
  router.get('/status', (_, res) => res.send('live'));
  router.get('/getPrivateKey', (_, res) => res.json({ result: prvKeyBase64 }));
  router.get("/getLastReceivedEncryptedMessage", (_, res) => res.json({ result: lastEncryptedMsg }));
  router.get("/getLastReceivedDecryptedMessage", (_, res) => res.json({ result: lastDecryptedMsg }));
  router.get("/getLastMessageDestination", (_, res) => res.json({ result: lastMsgDestination }));

  // Ici on va recevoir et traiter le message (successions de Decrypt)
  router.post('/message', async (req, res) => {
    try {

      // On recoit le message ici
      const { message } = req.body;

      // On déchiffre le message à l'aide des fonctions de notre fichier crypto.ts
      const symKeyDecrypted = await rsaDecrypt(message.slice(0, 344), privateKey);
      const msgDecrypted = await symDecrypt(symKeyDecrypted, message.slice(344));
      const nextDest = parseInt(msgDecrypted.slice(0, 10), 10);
      const remainingMsg = msgDecrypted.slice(10);

      // On met à jours les variables de suivis
      lastEncryptedMsg = message;
      lastDecryptedMsg = remainingMsg;
      lastMsgDestination = nextDest;

      // Ensuite on peut transfèrer le message au prochain destinataire (on gère les erreurs aussi)
      await axios.post(`http://localhost:${nextDest}/message`, { message: remainingMsg });
      res.send('Message forwarded');
    } catch (error) {
      console.error("Message processing error:", error);
      res.status(500).send('Message processing failed');
    }
  });

  // Finalement on peut démarrer le serveur du routeur Onion
  const server = router.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
    console.log(`Onion router ${nodeId} listening at port ${BASE_ONION_ROUTER_PORT + nodeId}`);
  });

  return server;
}