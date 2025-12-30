import * as Y from "yjs";
import { peerManager } from "./peerjs-peer-manager";
import { $peer } from "../stores/peer";
import { YUpdateMessage, YStateVectorMessage } from "./schemas";
import { prepareUpdate, ChunkAssembler } from "./chunking";

export const doc = new Y.Doc();
export const sharedMap = doc.getMap<unknown>("m");

export function initYPeerSync(): () => void {
  console.log("[Y.js Sync] Initializing Y.js peer sync");
  
  const assembler = new ChunkAssembler();

  const sendUpdate = (update: Uint8Array) => {
    const chunks = prepareUpdate(update);
    console.log("[Y.js Sync] Sending update, size:", update.length, "bytes");
    
    for (const chunk of chunks) {
      peerManager.send({ type: "y-update", ...chunk });
    }
  };

  const onDocUpdate = (update: Uint8Array) => {
    const { connectionStatus } = $peer.get();

    if (connectionStatus === "connected") {
      sendUpdate(update);
    } else {
      console.log("[Y.js Sync] Skipping update send - not connected");
    }
  };

  doc.on("update", onDocUpdate);

  const applyUpdate = (update: Uint8Array) => {
    console.log("[Y.js Sync] Applying update, size:", update.length, "bytes");
    doc.transact(() => {
      Y.applyUpdate(doc, update);
    }, "external");
  };

  const offMessage = peerManager.onMessage((data) => {
    const updateParsed = YUpdateMessage.safeParse(data);
    if (updateParsed.success) {
      assembler.addChunk(
        {
          ...updateParsed.data,
          data: new Uint8Array(updateParsed.data.data),
        },
        applyUpdate
      );
      return;
    }

    const stateVectorParsed = YStateVectorMessage.safeParse(data);
    if (stateVectorParsed.success) {
      const remoteStateVector = new Uint8Array(stateVectorParsed.data.stateVector);
      console.log("[Y.js Sync] Received state vector, computing diff");

      // Compute diff based on their state vector
      const diff = Y.encodeStateAsUpdate(doc, remoteStateVector);
      console.log("[Y.js Sync] Diff size:", diff.length, "bytes");
      sendUpdate(diff);
    }
  });

  const offConn = peerManager.onConnectionChange((status) => {
    console.log("[Y.js Sync] Connection status changed to:", status);
    if (status === "connected") {
      // Send state vector instead of full state
      const stateVector = Y.encodeStateVector(doc);
      console.log(
        "[Y.js Sync] Sending state vector, size:",
        stateVector.length,
        "bytes"
      );
      peerManager.send({ type: "y-state-vector", stateVector: Array.from(stateVector) });
    }
  });

  return () => {
    console.log("[Y.js Sync] Cleaning up Y.js peer sync");
    doc.off("update", onDocUpdate);
    offMessage();
    offConn();
    assembler.cleanup();
  };
}

export function addSimpleEntry(): void {
  const key = "k_" + Math.random().toString(36).slice(2, 8);

  sharedMap.set(key, Date.now());
}
