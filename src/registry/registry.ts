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

  // On définit la route pour le statut du Registre
  app.get("/status", (req, res) => {
    res.send("live");
  });

  // On initialise une variable qui coontiendra tous les noeuds : le registre
  let nodesRegistry: Node[] = [];

  // On définis la route pour enregistrer un noeud
  app.post("/registerNode", (req: Request, res: Response) => {
    const { nodeId, pubKey }: { nodeId: number; pubKey: string } = req.body;
    nodesRegistry.push({ nodeId, pubKey });
    res.status(200).send("Node registered successfully");
  });

  // Ici on définit la route pour obtenir le registre des noeuds
  app.get("/getNodeRegistry", (req, res) => {
    res.json({ nodes: nodesRegistry });
  });

  // Finalement on peut démarer le serveur Registry
  const server = app.listen(REGISTRY_PORT, () => {
    console.log(`Registry is listening on port ${REGISTRY_PORT}`);
  });

  return server;
}