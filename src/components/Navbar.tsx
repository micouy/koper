import React from "react";
import { useStore } from "@nanostores/react";
import { $peer } from "../stores/peer";
import {
  $turnConfig,
  setTurnConfig,
} from "../stores/turn";
import { peerManager } from "../lib/peerjs-peer-manager";
import githubIcon from "../assets/github-mark-white.svg";

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

  const peerIdDisplay = peer.peerId || "--------";

  return (
    <div className="flex flex-col overflow-visible">
      <div className="flex items-center gap-2 flex-wrap border-b border-border px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="whitespace-nowrap">
            <span className="font-bold text-text-muted">koper</span>
            <span className="font-bold text-text-muted">.</span>
            <a
              href="https://powierz.art"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold hover:underline transition-colors"
            >
              powierz.art
            </a>
          </span>
          <a
            href="https://github.com/micouy/koper"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
            aria-label="GitHub repository"
          >
            <img src={githubIcon} alt="GitHub" width="20" height="20" />
          </a>
          <span className="text-sm text-text-muted">collaborative code playground</span>
        </div>
        <div className="flex items-center gap-2">
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
            className={`font-semibold px-3 py-1 transition-colors border w-[100px] overflow-hidden text-ellipsis whitespace-nowrap ${
              copied
                ? "bg-bg-active border-border-strong"
                : "bg-bg-active border-border hover:border-border-strong"
            } ${!peer.peerId ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {copied ? "Copied" : peerIdDisplay}
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
        </div>
        <div className="flex-1"></div>
        <button
          onClick={() => setExpandedTurn((v) => !v)}
          className="text-sm text-text-muted cursor-pointer"
        >
          TURN settings
        </button>
      </div>

      {expandedTurn && (
        <div className="border-b border-border p-2">
          <div className="flex gap-2 items-center flex-wrap justify-end">
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
