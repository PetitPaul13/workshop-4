import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import { REGISTRY_PORT } from "../config";

export type Node = {
  nodeId: number;
  pubKey: string;
};

export type RegisterNodeBody = {
  nodeId: number;
  pubKey: string;
};

export type GetNodeRegistryBody = {
  nodes: Node[];
};

export async function launchRegistry() {
  const app = express();
  app.use(express.json());
  app.use(bodyParser.json());

  // Route pour le statut du registre
  app.get("/status", (req, res) => {
    res.send("live");
  });

  // Registre des noeuds
  let nodesRegistry: Node[] = [];

  // Route pour enregistrer un noeud
  app.post("/registerNode", (req: Request, res: Response) => {
    const { nodeId, pubKey }: { nodeId: number; pubKey: string } = req.body;
    nodesRegistry.push({ nodeId, pubKey });
    res.status(200).send("Node registered successfully");
  });

  // Route pour obtenir le registre des noeuds
  app.get("/getNodeRegistry", (req, res) => {
    res.json({ nodes: nodesRegistry });
  });

  // Démarrage du serveur Registry
  const server = app.listen(REGISTRY_PORT, () => {
    console.log(`Registry is listening on port ${REGISTRY_PORT}`);
  });

  return server;
}