import * as Y from "yjs";
import { applyDiffToYText } from "./applyDiffToYText";

export class CodeManager {
  private ydoc: Y.Doc;
  private ytext: Y.Text;
  private textareaRef: HTMLTextAreaElement | null = null;
  public onLocalUpdate: ((update: Uint8Array) => void) | null = null;
  private observer: (event: Y.YTextEvent, transaction: Y.Transaction) => void;
  private inputListener: ((e: Event) => void) | null = null;
  private keydownListener: ((e: KeyboardEvent) => void) | null = null;

  constructor(
    ydoc: Y.Doc,
    ytext: Y.Text,
    onLocalUpdate?: (update: Uint8Array) => void
  ) {
    this.ydoc = ydoc;
    this.ytext = ytext;
    this.onLocalUpdate = onLocalUpdate || null;

    this.observer = (event: Y.YTextEvent, transaction: Y.Transaction) => {
      if (transaction.origin === "external" && this.textareaRef) {
        this.handleCursorUpdate(event);
      }
    };

    this.ytext.observe(this.observer);
  }

  setTextarea(textarea: HTMLTextAreaElement) {
    // Detach any previous listeners
    if (this.textareaRef) {
      if (this.inputListener)
        this.textareaRef.removeEventListener("input", this.inputListener);
      if (this.keydownListener)
        this.textareaRef.removeEventListener(
          "keydown",
          this.keydownListener as EventListener
        );
    }

    this.textareaRef = textarea;
    // Initialize value from Y.Text
    this.textareaRef.value = this.getContent();

    // Create and attach listeners that update Yjs
    this.inputListener = (e: Event) => {
      const target = e.target as HTMLTextAreaElement;
      this.handleLocalUpdate(target.value);
    };
    this.keydownListener = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const el = e.currentTarget as HTMLTextAreaElement;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const before = el.value.slice(0, start);
        const after = el.value.slice(end);
        const insert = "  ";
        el.value = before + insert + after;
        const caret = start + insert.length;
        el.setSelectionRange(caret, caret);
        this.handleLocalUpdate(el.value);
      }
    };
    this.textareaRef.addEventListener("input", this.inputListener);
    this.textareaRef.addEventListener(
      "keydown",
      this.keydownListener as EventListener
    );
  }

  handleLocalUpdate(newContent: string) {
    const currentContent = this.ytext.toString();
    if (newContent !== currentContent) {
      const beforeState = Y.encodeStateVector(this.ydoc);

      this.ydoc.transact(() => {
        applyDiffToYText(this.ytext, newContent);
      }, "local");

      if (this.onLocalUpdate) {
        const update = Y.encodeStateAsUpdate(this.ydoc, beforeState);
        this.onLocalUpdate(update);
      }
    }
  }

  handleExternalUpdate(update: Uint8Array) {
    this.ydoc.transact(() => {
      Y.applyUpdate(this.ydoc, update);
    }, "external");
    if (this.textareaRef) {
      // Reflect new content into textarea without moving caret unexpectedly
      const contentAfter = this.ytext.toString();
      this.textareaRef.value = contentAfter;
    }
  }

  setCode(newContent: string): void {
    this.handleLocalUpdate(newContent);
    if (this.textareaRef) {
      this.textareaRef.value = newContent;
      const end = newContent.length;
      this.textareaRef.setSelectionRange(end, end);
    }
  }

  private handleCursorUpdate(event: Y.YTextEvent) {
    if (!this.textareaRef) return;

    let newStart = this.textareaRef.selectionStart;
    let newEnd = this.textareaRef.selectionEnd;

    {
      let pos = 0;
      for (const d of event.changes.delta) {
        if (d.retain) {
          pos += d.retain;
        } else if (d.insert) {
          const ins = String(d.insert);
          const len = ins.length;
          if (newStart >= pos) newStart += len;
          if (newEnd >= pos) newEnd += len;
          pos += len;
        } else if (d.delete) {
          const delLen: number = d.delete;
          const delStart = pos;
          const delEnd = pos + delLen;
          if (newStart > delStart) {
            if (newStart <= delEnd) newStart = delStart;
            else newStart -= delLen;
          }
          if (newEnd > delStart) {
            if (newEnd <= delEnd) newEnd = delStart;
            else newEnd -= delLen;
          }
        }
      }
    }

    if (newStart > newEnd) {
      const t = newStart;
      newStart = newEnd;
      newEnd = t;
    }

    const contentAfter = this.ytext.toString();
    this.textareaRef.value = contentAfter;
    this.textareaRef.setSelectionRange(newStart, newEnd);
  }

  getContent(): string {
    return this.ytext.toString();
  }

  refreshTextarea() {
    if (this.textareaRef) {
      this.textareaRef.value = this.getContent();
    }
  }

  cleanup() {
    this.ytext.unobserve(this.observer);
    if (this.textareaRef) {
      if (this.inputListener)
        this.textareaRef.removeEventListener("input", this.inputListener);
      if (this.keydownListener)
        this.textareaRef.removeEventListener(
          "keydown",
          this.keydownListener as EventListener
        );
    }
    this.inputListener = null;
    this.keydownListener = null;
  }
}
