import { Peer } from "peerjs";
import type { DataConnection } from "peerjs";
import * as store from "../stores/peer";
import type { ConnectionStatus } from "../stores/peer";
import { $turnConfig } from "../stores/turn";

type ConnectionListener = (status: ConnectionStatus, peerId?: string) => void;

class PeerManager {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private connectionListeners: Set<ConnectionListener> = new Set();
  private messageListeners: Set<(data: unknown) => void> = new Set();
  private remotePeerId: string | null = null;
  private unsubscribeTurn?: () => void;
  private lastTurnKey: string;
  private lastConnectionIncoming: boolean | null = null;

  constructor() {
    const initial = $turnConfig.get();
    this.lastTurnKey = JSON.stringify(initial);
    this.unsubscribeTurn = $turnConfig.subscribe((cfg) => {
      const nextKey = JSON.stringify(cfg);
      if (nextKey !== this.lastTurnKey) {
        this.lastTurnKey = nextKey;
        this.reinitializePeer();
      }
    });
  }

  private buildRtcConfig(): RTCConfiguration {
    const turn = $turnConfig.get();
    const iceServers: RTCIceServer[] = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ];

    if (turn.url && turn.username && turn.credential) {
      iceServers.push({
        urls: turn.url,
        username: turn.username,
        credential: turn.credential,
      });
      console.log("[WebRTC] Using TURN server:", turn.url);
    } else {
      console.log("[WebRTC] Using default STUN servers (no TURN configured)");
    }

    const config: RTCConfiguration = {
      iceServers,
      iceTransportPolicy: 'all',
    };
    console.log(
      "[WebRTC] RTC Configuration: ",
      iceServers.length,
      "ICE servers"
    );
    return config;
  }

  private reinitializePeer(): void {
    console.log("[WebRTC] Reinitializing peer due to TURN config change");
    const wasConnectedTo = this.remotePeerId;
    this.destroy();
    this.init().catch((err) => {
      console.error("[WebRTC] Re-init after TURN change failed:", err);
    });
    if (wasConnectedTo) {
      console.log("[WebRTC] Reconnecting to previous peer:", wasConnectedTo);
      this.connectToPeer(wasConnectedTo);
    }
  }

  public init(): Promise<string> {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      console.log("[WebRTC] Starting peer initialization at", startTime);

      const configStart = performance.now();
      const rtcConfig = this.buildRtcConfig();
      console.log(
        "[WebRTC] buildRtcConfig took",
        (performance.now() - configStart).toFixed(2),
        "ms"
      );

      const peerOptions: { debug?: number; config?: RTCConfiguration } = {
        debug: 1,
        config: rtcConfig,
      };

      const peerCreateStart = performance.now();
      this.peer = new Peer(peerOptions);
      console.log(
        "[WebRTC] new Peer() took",
        (performance.now() - peerCreateStart).toFixed(2),
        "ms"
      );
      console.log(
        "[WebRTC] Waiting for 'open' event from signaling server (using default PeerJS cloud server)..."
      );

      // Add timeout warning
      const slowWarning = setTimeout(() => {
        console.warn(
          "[WebRTC] Peer initialization taking longer than 2s - signaling server may be slow"
        );
      }, 2000);

      this.peer.on("open", (id) => {
        clearTimeout(slowWarning);
        const totalTime = performance.now() - startTime;
        console.log(
          "[WebRTC] Peer opened with ID:",
          id,
          "- Total time:",
          totalTime.toFixed(2),
          "ms"
        );
        store.setPeerId(id);
        resolve(id);
      });

      this.peer.on("error", (error) => {
        clearTimeout(slowWarning);
        console.error("[WebRTC] Peer error:", error);
        this.setStatus("error");
        reject(error);
      });

      this.peer.on("connection", (conn) => {
        console.log("[WebRTC] Incoming connection from:", conn.peer);
        this.handleConnection(conn, true);
      });

      this.peer.on("close", () => {
        console.log("[WebRTC] Peer closed");
      });

      this.peer.on("disconnected", () => {
        console.log("[WebRTC] Peer disconnected from signaling server");
      });
    });
  }

  public connectToPeer(peerId: string): void {
    if (!this.peer) {
      console.error("[WebRTC] Peer not initialized");
      return;
    }
    console.log("[WebRTC] Initiating connection to peer:", peerId);
    this.setStatus("connecting", peerId);
    const conn = this.peer.connect(peerId, {
      reliable: true,
    });
    this.handleConnection(conn, false);
  }

  private handleConnection(conn: DataConnection, incoming: boolean): void {
    this.connection = conn;
    this.remotePeerId = conn.peer;
    this.lastConnectionIncoming = incoming;
    console.log(
      "[WebRTC] Setting up connection handlers for peer:",
      conn.peer,
      "incoming:",
      incoming
    );

    conn.on("open", () => {
      console.log("[WebRTC] DataConnection opened with:", conn.peer);
      console.log("[WebRTC] Connection metadata:", {
        peer: conn.peer,
        open: conn.open,
        type: conn.type,
        label: conn.label,
        incoming: this.lastConnectionIncoming,
      });
      this.setStatus("connected", conn.peer);
      store.setRemotePeerId(conn.peer);
    });

    conn.on("data", (data) => {
      this.messageListeners.forEach((listener) => listener(data));
    });

    conn.on("close", () => {
      console.log("[WebRTC] DataConnection closed with:", conn.peer);
      this.setStatus("disconnected");
      this.connection = null;
      this.remotePeerId = null;
      this.lastConnectionIncoming = null;
      store.setRemotePeerId(null);
    });

    conn.on("error", (error) => {
      console.error(
        "[WebRTC] DataConnection error with",
        conn.peer,
        ":",
        error
      );
      this.setStatus("error");
    });

    conn.on("iceStateChanged", (state) => {
      console.log("[WebRTC] ICE state changed to:", state);
    });

    // Access underlying RTCPeerConnection for more detailed logging
    // Use addEventListener instead of overwriting handlers to preserve PeerJS's internal handlers
    const peerConnection = (conn as { peerConnection?: RTCPeerConnection })
      .peerConnection;
    if (peerConnection) {
      console.log("[WebRTC] Accessing underlying RTCPeerConnection");

      peerConnection.addEventListener('icecandidate', (event: RTCPeerConnectionIceEvent) => {
        if (event.candidate) {
          const address = event.candidate.address || '';
          const isIPv6 = address.includes(':');

          console.log("[WebRTC] ICE candidate:", {
            type: event.candidate.type,
            protocol: event.candidate.protocol,
            address: address,
            port: event.candidate.port,
            priority: event.candidate.priority,
            foundation: event.candidate.foundation,
            isIPv6,
          });

          if (isIPv6) {
            console.warn("[WebRTC] IPv6 candidate detected - this may cause connection issues");
          }
        } else {
          console.log("[WebRTC] ICE gathering complete");
        }
      });

      peerConnection.addEventListener('icecandidateerror', (event: Event) => {
        const errorEvent = event as RTCPeerConnectionIceErrorEvent;
        console.error("[WebRTC] ICE candidate error:", {
          errorCode: errorEvent.errorCode,
          errorText: errorEvent.errorText,
          url: errorEvent.url,
          address: errorEvent.address,
          port: errorEvent.port,
        });
      });

      peerConnection.addEventListener('iceconnectionstatechange', () => {
        console.log(
          "[WebRTC] ICE connection state:",
          peerConnection.iceConnectionState
        );
        if (peerConnection.iceConnectionState === "failed") {
          console.error("[WebRTC] ICE connection failed! Checking stats...");
          peerConnection.getStats().then((stats) => {
            stats.forEach((report) => {
              if (report.type === "candidate-pair") {
                console.log("[WebRTC] Candidate pair:", {
                  state: report.state,
                  nominated: report.nominated,
                  bytesSent: report.bytesSent,
                  bytesReceived: report.bytesReceived,
                });
              }
            });
          });
        }
      });

      peerConnection.addEventListener('icegatheringstatechange', () => {
        console.log(
          "[WebRTC] ICE gathering state:",
          peerConnection.iceGatheringState
        );
      });

      peerConnection.addEventListener('signalingstatechange', () => {
        console.log("[WebRTC] Signaling state:", peerConnection.signalingState);
      });

      peerConnection.addEventListener('connectionstatechange', () => {
        console.log(
          "[WebRTC] Connection state:",
          peerConnection.connectionState
        );
      });
    }
  }

  public send(data: unknown): void {
    if (this.connection && this.connection.open) {
      this.connection.send(data);
    } else {
      console.warn("[WebRTC] Cannot send data: connection not open");
    }
  }

  private setStatus(status: ConnectionStatus, peerId?: string): void {
    store.setConnectionStatus(status);
    this.connectionListeners.forEach((listener) => listener(status, peerId));
  }

  public onConnectionChange(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  public onMessage(listener: (data: unknown) => void): () => void {
    this.messageListeners.add(listener);
    return () => {
      this.messageListeners.delete(listener);
    };
  }

  public disconnect(): void {
    console.log("[WebRTC] Disconnecting from peer:", this.remotePeerId);
    if (this.connection) {
      this.connection.close();
      this.connection = null;
      this.remotePeerId = null;
    }
    store.setRemotePeerId(null);
    this.lastConnectionIncoming = null;
    store.setConnectionStatus("disconnected");
  }

  public destroy(): void {
    console.log("[WebRTC] Destroying peer manager");
    this.disconnect();
    this.unsubscribeTurn?.();
    this.unsubscribeTurn = undefined;
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}

export const peerManager = new PeerManager();
