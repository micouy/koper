import React from "react";
import { useStore } from "@nanostores/react";
import { $peer } from "../stores/peer";
import {
  $turnConfig,
  setTurnConfig,
  isTurnConfigComplete,
} from "../stores/turn";
import { peerManager } from "../lib/peerjs-peer-manager";

export function Navbar() {
  const peer = useStore($peer);
  const turn = useStore($turnConfig);
  const [expandedTurn, setExpandedTurn] = React.useState(false);
  const [peerIdInput, setPeerIdInput] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  const copyCode = async () => {
    if (!peer.peerId) return;
    try {
      await navigator.clipboard.writeText(peer.peerId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      return;
    }
  };

  const connect = async () => {
    let idToUse = peerIdInput;

    if (!idToUse) {
      try {
        const clipboardText = await navigator.clipboard.readText();
        const trimmed = clipboardText.trim();
        if (trimmed) {
          idToUse = trimmed;
          setPeerIdInput(trimmed);
        }
      } catch {
        // Clipboard access denied or failed, ignore
      }
    }

    if (!idToUse) return;
    peerManager.connectToPeer(idToUse);
    setPeerIdInput("");
  };

  const canUseTurn = isTurnConfigComplete(turn);

  const shortPeerId = peer.peerId ? peer.peerId.slice(0, 8) : "--------";

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 flex-wrap border-b border-border p-2">
        <button
          onClick={() => setExpandedTurn((v) => !v)}
          aria-label="Toggle settings"
          className="min-w-[24px] hover:text-text transition-colors"
        >
          {expandedTurn ? "▾" : "▸"}
        </button>
        <button
          onClick={copyCode}
          disabled={!peer.peerId}
          title={
            copied
              ? "Copied!"
              : peer.peerId
              ? "Click to copy peer ID"
              : "Connecting..."
          }
          className={`font-semibold px-3 py-1 transition-colors border w-[100px] ${
            copied
              ? "bg-bg-active border-border-strong"
              : "bg-bg-active border-border hover:border-border-strong"
          } ${!peer.peerId ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {copied ? "Copied" : shortPeerId}
        </button>
        {peer.connectionStatus === "disconnected" && peer.peerId && (
          <>
            <input
              placeholder="Peer's ID"
              value={peerIdInput}
              onChange={(e) =>
                setPeerIdInput((e.target as HTMLInputElement).value)
              }
              className="w-[180px] text-center font-mono bg-bg-active border border-border px-2 py-1"
            />
            <button
              onClick={connect}
              disabled={!peerIdInput}
              className="px-3 py-1 bg-bg-active border border-border hover:border-border-strong disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={
                peerIdInput
                  ? "Connect to peer"
                  : "Connect (will check clipboard)"
              }
            >
              Connect
            </button>
          </>
        )}
        <span>{peer.connectionStatus}</span>
        {!expandedTurn && canUseTurn && (
          <span className="text-xs text-text-muted">TURN</span>
        )}
      </div>

      {expandedTurn && (
        <div className="border-b border-border p-2">
          <div className="text-sm text-text-muted mb-2">
            TURN Server {canUseTurn ? "(configured)" : "(using STUN only)"}
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <input
              placeholder="TURN url (turn:host:port)"
              value={turn.url}
              onChange={(e) =>
                setTurnConfig({
                  ...turn,
                  url: (e.target as HTMLInputElement).value,
                })
              }
              className="min-w-[200px] bg-bg-active border border-border px-2 py-1"
            />
            <input
              placeholder="TURN username"
              value={turn.username}
              onChange={(e) =>
                setTurnConfig({
                  ...turn,
                  username: (e.target as HTMLInputElement).value,
                })
              }
              className="min-w-[120px] bg-bg-active border border-border px-2 py-1"
            />
            <input
              placeholder="TURN credential"
              value={turn.credential}
              onChange={(e) =>
                setTurnConfig({
                  ...turn,
                  credential: (e.target as HTMLInputElement).value,
                })
              }
              className="min-w-[120px] bg-bg-active border border-border px-2 py-1"
            />
          </div>
        </div>
      )}
    </div>
  );
}
