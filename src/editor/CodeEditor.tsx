import React, { useRef, useEffect, useMemo, useState } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-jsx";
import "prism-themes/themes/prism-nord.css";
import { CodeManager } from "./CodeManager";

interface CodeEditorProps {
  codeManager: CodeManager;
}

export function CodeEditor({ codeManager }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [code, setCode] = useState(codeManager.getContent());

  const highlighted = useMemo(() => {
    const codeWithNewline = code.endsWith("\n") ? code : code + " ";
    const html = Prism.highlight(codeWithNewline, Prism.languages.jsx, "jsx");

    return html;
  }, [code]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    codeManager.setTextarea(textarea);
    setCode(codeManager.getContent());

    const handleInput = () => {
      setCode(codeManager.getContent());
    };

    textarea.addEventListener("input", handleInput);

    const handleYUpdate = () => {
      setCode(codeManager.getContent());
    };

    const interval = setInterval(handleYUpdate, 100);

    return () => {
      textarea.removeEventListener("input", handleInput);
      clearInterval(interval);
    };
  }, [codeManager]);

  useEffect(() => {
    if (!textareaRef.current || !scrollContainerRef.current) {
      return;
    }

    // Saving and restoring scroll position is necessary,
    // otherwise typing makes the textarea jump to the bottom and to the right.

    const ta = textareaRef.current;
    const container = scrollContainerRef.current;

    // Save scroll position
    const scrollTop = container.scrollTop;
    const scrollLeft = container.scrollLeft;

    ta.style.height = "auto";
    const contentHeight = ta.scrollHeight;
    const containerHeight = container.clientHeight;
    const finalHeight = Math.max(contentHeight, containerHeight);
    ta.style.height = finalHeight + "px";

    ta.style.width = "auto";
    ta.style.width = ta.scrollWidth + "px";

    if (preRef.current) {
      preRef.current.style.height = finalHeight + "px";
      preRef.current.style.width = ta.scrollWidth + "px";
    }

    // Restore scroll position
    container.scrollTop = scrollTop;
    container.scrollLeft = scrollLeft;
  }, [code]);

  const commonStyle: React.CSSProperties = {
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    fontSize: 14,
    lineHeight: "20px",
    letterSpacing: "0px",
    padding: 12,
    margin: 0,
    borderRadius: 6,
    boxSizing: "border-box",
    tabSize: 2,
    whiteSpace: "pre",
    overflow: "hidden",
    // border: "none",
    textShadow: "none",
    background: "transparent",
    outline: "none",
    minWidth: "100%",
    minHeight: "100%",
    width: "fit-content",
  };

  return (
    <div
      ref={scrollContainerRef}
      style={{
        width: "100%",
        height: "100%",
        overflow: "auto",
        border: "1px solid #ddd",
        background: "#303030",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "fit-content",
          minWidth: "100%",
          minHeight: "100%",
          border: "1px solid rgba(0, 255, 0, 0.3)",
        }}
      >
        <pre
          ref={preRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            pointerEvents: "none",
            border: "1px solid rgba(255, 0, 0, 0.3)",
            ...commonStyle,
          }}
        >
          <code
            className="language-jsx"
            style={{
              fontFamily: "inherit",
              fontSize: "inherit",
              lineHeight: "inherit",
              padding: 0,
              margin: 0,
              display: "block",
              textShadow: "none",
            }}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </pre>

        <textarea
          ref={textareaRef}
          spellCheck={false}
          placeholder="Start typing..."
          className="code-editor-textarea"
          style={{
            position: "relative",
            display: "block",
            resize: "none",
            color: "transparent",
            caretColor: "white",
            border: "1px solid rgba(0, 0, 255, 0.3)",
            ...commonStyle,
          }}
        />
      </div>

      <style>{`
        .code-editor-textarea::selection {
          background-color: rgba(100, 149, 237, 0.4);
          color: white;
        }
      `}</style>
    </div>
  );
}
