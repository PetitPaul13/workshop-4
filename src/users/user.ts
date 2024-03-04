import bodyParser from "body-parser";
import express from "express";
import { BASE_USER_PORT, BASE_ONION_ROUTER_PORT } from "../config";
import { createRandomSymmetricKey, symEncrypt, rsaEncrypt, exportSymKey } from "../crypto";
import { GetNodeRegistryBody, Node } from "@/src/registry/registry";

export interface NodeRegistry {
  nodes: Node[];
}

export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());

  // Route pour le statut
  _user.get("/status", (req, res) => {
    res.send("live");
  });

  let lastReceivedMessage: string | null = null;
  let lastSentMessage: string | null = null;
  let lastCircuit: Node[] = [];

  // Route pour recevoir un message
  _user.post("/message", (req, res) => {
    const message = req.body.message;
    lastReceivedMessage = message;
    console.log(`Received message: ${message}`);
    res.status(200).send("success");
  });

  // Route pour obtenir le dernier message reçu
  _user.get("/getLastReceivedMessage", (req, res) => {
    res.json({ result: lastReceivedMessage });
  });

  // Route pour obtenir le dernier message envoyé
  _user.get("/getLastSentMessage", (req, res) => {
    res.json({ result: lastSentMessage });
  });

  // Route pour obtenir le dernier circuit utilisé
  _user.get("/getLastCircuit", (req, res) => {
    res.status(200).json({ result: lastCircuit.map((node) => node.nodeId) });
  });

  // Route pour envoyer un message
  _user.post("/sendMessage", async (req, res) => {
    const { message, destinationUserId } = req.body;

    // Récupérer la liste des noeuds
    const nodes = await fetch(`http://localhost:8080/getNodeRegistry`)
        .then((res) => res.json() as Promise<GetNodeRegistryBody>)
        .then((body) => body.nodes);

    // Créer un circuit de 3 noeuds aléatoires
    let circuit: Node[] = [];
    while (circuit.length < 3) {
      const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
      if (!circuit.includes(randomNode)) {
        circuit.push(randomNode);
      }
    }

    // Préparer le message à envoyer
    let destination = `${BASE_USER_PORT + destinationUserId}`.padStart(10, "0");
    let finalMessage = message;
    for (const node of circuit) {
      const symmetricKey = await createRandomSymmetricKey();
      const symmetricKey64 = await exportSymKey(symmetricKey);
      const encryptedMessage = await symEncrypt(symmetricKey, `${destination + finalMessage}`);
      destination = `${BASE_ONION_ROUTER_PORT + node.nodeId}`.padStart(10, '0');
      const encryptedSymKey = await rsaEncrypt(symmetricKey64, node.pubKey);
      finalMessage = encryptedSymKey + encryptedMessage;
    }

    // Inverser le circuit pour avoir l'ordre des noeuds correct
    circuit.reverse();
    lastCircuit = circuit;
    lastSentMessage = message;

    // Envoyer le message chiffré au premier noeud du circuit
    await fetch(`http://localhost:${BASE_ONION_ROUTER_PORT + circuit[0].nodeId}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: finalMessage }),
    });

    res.status(200).send("success");
  });

  // Démarrer le serveur User
  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(`User ${userId} is listening on port ${BASE_USER_PORT + userId}`);
  });

  return server;
}