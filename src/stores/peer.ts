import { atom } from "nanostores";

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export type PeerStore = {
  connectionStatus: ConnectionStatus;
  isOfferer: boolean;
  myCode: string | null;
  peerCode: string | null;
  peerId: string | null;
  remotePeerId: string | null;
};

export const $peer = atom<PeerStore>({
  connectionStatus: "disconnected",
  isOfferer: false,
  myCode: null,
  peerCode: null,
  peerId: null,
  remotePeerId: null,
});

export const setConnectionStatus = (connectionStatus: ConnectionStatus) => {
  $peer.set({
    ...$peer.get(),
    connectionStatus,
  });
};

export const setIsOfferer = (isOfferer: boolean) => {
  $peer.set({
    ...$peer.get(),
    isOfferer,
  });
};

export const setMyCode = (myCode: string | null) => {
  $peer.set({
    ...$peer.get(),
    myCode,
  });
};

export const setPeerCode = (peerCode: string | null) => {
  $peer.set({
    ...$peer.get(),
    peerCode,
  });
};

export const setPeerId = (peerId: string) => {
  $peer.set({
    ...$peer.get(),
    peerId,
  });
};

export const setRemotePeerId = (remotePeerId: string | null) => {
  $peer.set({
    ...$peer.get(),
    remotePeerId,
  });
};
