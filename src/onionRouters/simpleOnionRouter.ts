import bodyParser from "body-parser";
import express from "express";
import { BASE_ONION_ROUTER_PORT } from "../config";
import fetch from 'node-fetch';
import {generateRsaKeyPair, exportPubKey, exportPrvKey, rsaDecrypt, symDecrypt} from "../crypto";

export async function simpleOnionRouter(nodeId: number) {
  const onionRouter = express();
  onionRouter.use(express.json());
  onionRouter.use(bodyParser.json());

  // Etape 1.1 :
  onionRouter.get("/status", (req, res) => {
    res.send('live');
  });

  // Etape 2.1 :
  let lastEncryptedMessage = null;
  let lastDecryptedMessage = null;
  let lastMessageDestination = null;

  onionRouter.get("/getLastReceivedEncryptedMessage", (req, res) => {
    res.json({ result: lastEncryptedMessage || null });
  });

  onionRouter.get("/getLastReceivedDecryptedMessage", (req, res) => {
    res.json({ result: lastDecryptedMessage || null });
  });

  onionRouter.get("/getLastMessageDestination", (req, res) => {
    res.json({ result: lastMessageDestination || null });
  });

  // Ici on va traiter les messages recus

  onionRouter.post('/message', async (req, res) => {
    // Corps même du code -> déchiffrement, récupération du message et de la prochaine adresse
    try {
      // On récupère le message
      const { message } = req.body;

      // On décrypte la clé symétric à l'aide de notre clé privé RSA
      const decryptedSymKey = await rsaDecrypt(message.slice(0, 344), privateKey);

      // On décrypte le message avec la clé symétrique qu'on vien d'obtenir
      const decryptedMessage = await symDecrypt(decryptedSymKey, message.slice(344));

      // On récupère maintenant la prochaine destination du message
      const destination = parseInt(decryptedMessage.slice(0, 10), 10);

      // Finalement on récupère le message qu'on devra envoyer par la suite
      const remainingMessage = decryptedMessage.slice(10);

      // Ensuite on met à jours les variables de suivis
      lastReceivedEncryptedMessage = message;
      lastMessageDestination = destination;
      lastReceivedDecryptedMessage = remainingMessage;

      // Ensuite on envoie le message à la prochaine destination
      await axios.post(`http://localhost:${destination}/message`, {
        message: remainingMessage,
      });

      // Pour afficher la réussite du process
      res.status(200).send('Message forwarded');

    } catch (error) {

      // Pour afficher si il y a eu un problème/erreur
      console.error("Error processing message:", error);
      res.status(500).send('Error processing message');
    }
  });

  // On lance le serveur et on écoute sur le PORT
  const server = onionRouter.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
    console.log(`Onion router ${nodeId} is listening on port ${BASE_ONION_ROUTER_PORT + nodeId}`);
  });

  return server;
}
