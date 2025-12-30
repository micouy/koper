import React from "react";
import { Navbar } from "./components/Navbar";
import { peerManager } from "./lib/peerjs-peer-manager";
import { attachHelloLogger } from "./lib/on-messages.ts";
import { initYPeerSync } from "./lib/y-sync.ts";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { CodeManager } from "./editor/CodeManager";
import { CodeEditor } from "./editor/CodeEditor";
import { YCodeUpdateMessage, YCodeStateVectorMessage } from "./lib/schemas";
import { prepareUpdate, ChunkAssembler } from "./lib/chunking";
import { P5TextareaYjsRunner } from "./runner/P5TextareaYjsRunner";
import { $logs, clearLogs } from "./stores/logs";
import { COUNTER_BUTTON_EXAMPLE } from "./runner/examples";
import { YDocInspector } from "./components/YDocInspector";
import { cn } from "./lib/cn";
import { useStore } from "@nanostores/react";

export function App() {
  const [ydoc] = React.useState(() => new Y.Doc());
  const [indexeddbProvider] = React.useState(
    () => new IndexeddbPersistence("koper-db", ydoc)
  );

  const clearAllState = () => {
    ydoc.transact(() => {
      const ytext = ydoc.getText("code");
      ytext.delete(0, ytext.length);

      const runningCode = ydoc.getText("runningCode");
      runningCode.delete(0, runningCode.length);

      const stateMap = ydoc.getMap("state");
      stateMap.clear();
    }, "clear");
  };

  React.useEffect(() => {
    peerManager
      .init()
      .then(() => {
        console.log("[App] PeerJS peer initialized");
      })
      .catch((e) => {
        console.error("[App] Failed to initialize peer:", e);
      });

    const off = attachHelloLogger();
    const teardownY = initYPeerSync();
    return () => {
      off();
      teardownY();
      peerManager.destroy();
      indexeddbProvider.destroy();
    };
  }, [indexeddbProvider]);

  return (
    <div className="flex flex-col h-full w-full">
      <Navbar />
      <EditorSection
        ydoc={ydoc}
        indexeddbProvider={indexeddbProvider}
        clearAllState={clearAllState}
      />
    </div>
  );
}

function EditorSection({
  ydoc,
  indexeddbProvider,
  clearAllState,
}: {
  ydoc: Y.Doc;
  indexeddbProvider: IndexeddbPersistence;
  clearAllState: () => void;
}) {
  const [ytext] = React.useState(() => ydoc.getText("code"));
  const sendCodeUpdate = React.useCallback((update: Uint8Array) => {
    const chunks = prepareUpdate(update);

    for (const chunk of chunks) {
      peerManager.send({ type: "y-code-update", ...chunk });
    }
  }, []);

  const [codeManager] = React.useState(
    () => new CodeManager(ydoc, ytext, sendCodeUpdate)
  );

  React.useEffect(() => {
    const assembler = new ChunkAssembler();

    const handleSynced = () => {
      console.log("[App] IndexedDB synced");
      // Refresh the editor with loaded content
      codeManager.refreshTextarea();
    };

    indexeddbProvider.on("synced", handleSynced);

    const applyCodeUpdate = (update: Uint8Array) => {
      codeManager.handleExternalUpdate(update);
    };

    const off = peerManager.onMessage((data) => {
      const updateParsed = YCodeUpdateMessage.safeParse(data);
      if (updateParsed.success) {
        assembler.addChunk(
          {
            ...updateParsed.data,
            data: new Uint8Array(updateParsed.data.data),
          },
          applyCodeUpdate
        );
        return;
      }

      const stateVectorParsed = YCodeStateVectorMessage.safeParse(data);
      if (stateVectorParsed.success) {
        const remoteStateVector = new Uint8Array(
          stateVectorParsed.data.stateVector
        );
        console.log("[App] Received code state vector, computing diff");

        // Compute diff based on their state vector
        const diff = Y.encodeStateAsUpdate(ydoc, remoteStateVector);
        console.log("[App] Code diff size:", diff.length, "bytes");
        sendCodeUpdate(diff);
      }
    });
    const onYDocUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === "iframe" || origin === "clear" || origin === "run") {
        sendCodeUpdate(update);
      }
    };
    ydoc.on("update", onYDocUpdate);
    const offConn = peerManager.onConnectionChange((status) => {
      if (status === "connected") {
        // Send state vector instead of full state
        const stateVector = Y.encodeStateVector(ydoc);
        console.log(
          "[App] Sending code state vector, size:",
          stateVector.length,
          "bytes"
        );
        peerManager.send({
          type: "y-code-state-vector",
          stateVector: Array.from(stateVector),
        });
      }
    });
    return () => {
      off();
      ydoc.off("update", onYDocUpdate);
      offConn();
      codeManager.cleanup();
      assembler.cleanup();
    };
  }, [codeManager, ydoc, indexeddbProvider, sendCodeUpdate]);

  return (
    <EditorWithRunner
      ydoc={ydoc}
      ytext={ytext}
      codeManager={codeManager}
      clearAllState={clearAllState}
    />
  );
}

function EditorWithRunner({
  ydoc,
  ytext,
  codeManager,
  clearAllState,
}: {
  ydoc: Y.Doc;
  ytext: Y.Text;
  codeManager: CodeManager;
  clearAllState: () => void;
}) {
  const previewRef = React.useRef<HTMLDivElement | null>(null);
  const runnerRef = React.useRef<P5TextareaYjsRunner | null>(null);
  const [activeTab, setActiveTab] = React.useState<"code" | "state" | "logs">(
    "code"
  );
  const logs = useStore($logs);

  React.useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    const runner = new P5TextareaYjsRunner({
      previewContainer: preview,
      yDoc: ydoc,
    });
    runnerRef.current = runner;
    return () => {
      runnerRef.current?.cleanup();
      runnerRef.current = null;
    };
  }, [ydoc]);

  const handleRun = () => {
    clearLogs();
    const code = ytext.toString();
    const runningCode = ydoc.getText("runningCode");
    ydoc.transact(() => {
      runningCode.delete(0, runningCode.length);
      runningCode.insert(0, code);
    }, "run");
  };

  return (
    <div className="flex w-full h-full">
      <div className="flex flex-col flex-1 min-w-0 border-r border-border">
        <div className="flex items-center">
          <button
            onClick={() => setActiveTab("code")}
            className={cn(
              "w-20 p-2 border-b border-border cursor-pointer text-text",
              activeTab === "code"
                ? "border-0 bg-bg-active font-semibold"
                : "border border-border bg-transparent font-normal"
            )}
          >
            Code
          </button>
          <button
            onClick={() => setActiveTab("state")}
            className={cn(
              "w-20 p-2 border-b border-border border-l cursor-pointer text-text",
              activeTab === "state"
                ? "border-l border-b bg-bg-active font-semibold"
                : "border bg-transparent font-normal"
            )}
          >
            State
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={cn(
              "w-20 p-2 border-b border-border border-l cursor-pointer text-text",
              activeTab === "logs"
                ? "border-l border-b bg-bg-active font-semibold"
                : "border bg-transparent font-normal"
            )}
          >
            Logs
          </button>
          <button
            onClick={handleRun}
            className="px-4 py-2 mr-2 bg-green-600 border border-green-700 cursor-pointer text-white font-semibold"
          >
            Run
          </button>
        </div>
        <div className="flex flex-col flex-1">
          {activeTab === "code" && (
            <>
              <div className="flex gap-2 p-2 border-b border-border">
                <button
                  onClick={() => {
                    codeManager.setCode(COUNTER_BUTTON_EXAMPLE);
                  }}
                  className="px-1 py-0 text-sm underline cursor-pointer text-text bg-transparent hover:text-text-strong"
                >
                  Load Example
                </button>
              </div>
              <div className="w-full flex-1">
                <CodeEditor codeManager={codeManager} />
              </div>
            </>
          )}
          {activeTab === "state" && (
            <div className="flex-1 p-2 flex flex-col min-h-0">
              <div className="mb-2 pb-2 border-b border-border flex-shrink-0">
                <button
                  onClick={clearAllState}
                  className="px-3 py-1 border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 transition-colors"
                >
                  Clear All
                </button>
              </div>
              <YDocInspector ydoc={ydoc} />
            </div>
          )}
          {activeTab === "logs" && (
            <div className="flex-1 p-2 flex flex-col overflow-auto">
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-border">
                <span className="text-text font-semibold">
                  Console ({logs.length})
                </span>
                <button
                  onClick={clearLogs}
                  className="px-2 py-1 text-sm bg-bg-active border border-border cursor-pointer text-text"
                >
                  Clear
                </button>
              </div>
              <div className="flex-1 overflow-auto font-mono text-sm">
                {logs.length === 0 ? (
                  <div className="text-text opacity-50">No logs yet</div>
                ) : (
                  logs.map((log, i) => (
                    <div
                      key={i}
                      className="py-1 border-b border-border text-text"
                    >
                      {log.args.map((arg, j) => (
                        <span key={j} className="mr-2">
                          {typeof arg === "object"
                            ? JSON.stringify(arg)
                            : String(arg)}
                        </span>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <div ref={previewRef} className="flex-1" />
      </div>
    </div>
  );
}
