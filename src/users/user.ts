import bodyParser from "body-parser";
import express from "express";
import { BASE_USER_PORT } from "../config";

export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());

  // Etape 1.2 :
  _user.get("/status", (req, res) => {
    res.send('live');
  });

  // Etape 2.2 :
  let lastReceivedMessage = null;
  let lastSentMessage = null;

  _user.get("/getLastReceivedMessage", (req, res) => {
    res.json({ result: lastReceivedMessage || "Aucun message reçu" });
  });

  _user.get("/getLastSentMessage", (req, res) => {
    res.json({ result: lastSentMessage || "Aucun message envoyé" });
  });

  _user.post("/message", (req, res) => {
    // On récupère le message du corps de la requête
    const message = req.body.message;

    // On met à jour la variable avec le message qu'on à recu
    lastReceivedMessage = message;

    // On affiche le message recu dans la console
    console.log(`Received message: ${message}`);

    // On affiche pour savoir si on à réussit à recevoir le message
    res.status(200).send("Message received successfully");
  });

  // Code de base :
  
  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(
      `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
    );
  });

  return server;
}
