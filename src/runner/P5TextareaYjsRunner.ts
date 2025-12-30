import * as Y from "yjs";
import { addLog } from "../stores/logs";
import iframeHtml from "./iframe.html?raw";

type BridgeMessage = {
  __p5Bridge?: boolean;
  action?: "ready" | "y-update" | "console-log" | "init";
  update?: number[];
  args?: unknown[];
  code?: string;
  playerId?: string;
};

export type RunnerOptions = {
  previewContainer: HTMLElement;
  yDoc: Y.Doc;
};

export class P5TextareaYjsRunner {
  readonly yDoc: Y.Doc;
  readonly appState: Y.Map<unknown>;
  readonly runningCode: Y.Text;
  private previewEl: HTMLElement;
  private currentHandler: ((event: MessageEvent) => void) | null = null;
  private docUpdateHandler:
    | ((update: Uint8Array, origin: unknown) => void)
    | null = null;
  private runningCodeObserver: (() => void) | null = null;
  private playerId: string;

  constructor(opts: RunnerOptions) {
    this.previewEl = opts.previewContainer;
    this.yDoc = opts.yDoc;
    this.appState = this.yDoc.getMap<unknown>("state");
    this.runningCode = this.yDoc.getText("runningCode");
    this.playerId = this.getOrCreatePlayerId();
    this.setupRunningCodeObserver();
  }

  private getOrCreatePlayerId(): string {
    const storageKey = "p5-yjs-player-id";
    let playerId = sessionStorage.getItem(storageKey);
    if (!playerId) {
      playerId = crypto.randomUUID();
      sessionStorage.setItem(storageKey, playerId);
    }
    return playerId;
  }

  private setupRunningCodeObserver(): void {
    this.runningCodeObserver = () => {
      this.run();
    };
    this.runningCode.observe(this.runningCodeObserver);

    // Trigger initial run if runningCode already has content
    if (this.runningCode.length > 0) {
      this.run();
    }
  }

  private run(): void {
    const code = this.runningCode.toString();
    if (this.currentHandler) {
      window.removeEventListener("message", this.currentHandler);
      this.currentHandler = null;
    }

    if (this.docUpdateHandler) {
      this.yDoc.off("update", this.docUpdateHandler);
      this.docUpdateHandler = null;
    }

    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.srcdoc = iframeHtml;
    this.previewEl.innerHTML = "";
    this.previewEl.appendChild(iframe);

    const postToIframe = (msg: BridgeMessage) => {
      if (!iframe.contentWindow) return;
      iframe.contentWindow.postMessage({ __p5Bridge: true, ...msg }, "*");
    };

    this.docUpdateHandler = (update: Uint8Array, origin: unknown) => {
      if (origin === "iframe") return;
      postToIframe({ action: "y-update", update: Array.from(update) });
    };
    this.yDoc.on("update", this.docUpdateHandler);

    this.currentHandler = (event: MessageEvent) => {
      const data: BridgeMessage = event.data || {};
      if (!data || data.__p5Bridge !== true) return;
      if (data.action === "ready") {
        // Send initial Y.js state and code to initialize the sketch
        const initUpdate = Y.encodeStateAsUpdate(this.yDoc);
        postToIframe({ action: "y-update", update: Array.from(initUpdate) });
        postToIframe({
          action: "init",
          code: code,
          playerId: this.playerId,
        });
      } else if (data.action === "y-update" && data.update) {
        const u8 = new Uint8Array(data.update);
        Y.applyUpdate(this.yDoc, u8, "iframe");
      } else if (data.action === "console-log" && data.args) {
        addLog(data.args);
      }
    };

    window.addEventListener("message", this.currentHandler);
  }

  cleanup(): void {
    if (this.currentHandler) {
      window.removeEventListener("message", this.currentHandler);
      this.currentHandler = null;
    }
    if (this.docUpdateHandler) {
      this.yDoc.off("update", this.docUpdateHandler);
      this.docUpdateHandler = null;
    }
    if (this.runningCodeObserver) {
      this.runningCode.unobserve(this.runningCodeObserver);
      this.runningCodeObserver = null;
    }
    this.previewEl.innerHTML = "";
  }
}
