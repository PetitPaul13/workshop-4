import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import { REGISTRY_PORT } from "../config";

export type Node = { nodeId: number; pubKey: string };

export type RegisterNodeBody = {
  nodeId: number;
  pubKey: string;
};

export type GetNodeRegistryBody = {
  nodes: Node[];
};

export async function launchRegistry() {
  const _registry = express();
  _registry.use(express.json());
  _registry.use(bodyParser.json());

  // Etape 1.3 :
  _registry.get("/status", (req, res) => {
    res.send('live');
  });

  // Etape 3.1 :
  let nodesRegistry: Node[] = [];

  _registry.post("/registerNode", (req: Request, res: Response) => {

    // On créeer un nouveau noeud : sous une ligne
    const { nodeId, pubKey }: { nodeId: number; pubKey: string } = req.body;

    // On ajoute le noeud au registre
    nodesRegistry.push({ nodeId, pubKey });

    // Pour savoir si ca marche
    res.status(200).send("Node registered successfully");
  });

  // Etape 3.4 :
  _registry.get('/getNodeRegistry', (req, res) => {
    res.json({ nodes: nodesRegistry });
  });


  // Lancement du serveur de registre
  const server = _registry.listen(REGISTRY_PORT, () => {
    console.log(`registry is listening on port ${REGISTRY_PORT}`);
  });

  return server;
}
