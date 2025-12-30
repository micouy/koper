import { useEffect, useState } from "react";
import * as Y from "yjs";

// Helper to detect correct Y.js type by trying each getter with try-catch
// After IndexedDB load, constructor names are lost, so we try each type
// The last successful one wins (this matches the user's logic)
function getYValue(
  ydoc: Y.Doc,
  key: string
): Y.Text | Y.Map<unknown> | Y.Array<unknown> | Y.XmlFragment | Y.XmlText {
  // Try each type - last successful one wins
  try {
    const map = ydoc.getMap(key);
    return map;
  } catch (e) {
    // Silently fail
  }

  try {
    const array = ydoc.getArray(key);
    return array;
  } catch (e) {
    // Silently fail
  }

  try {
    const text = ydoc.getText(key);
    return text;
  } catch (e) {
    // Silently fail
  }

  try {
    const xml = ydoc.getXmlElement(key);

    return xml;
  } catch (e) {
    // Silently fail
  }

  try {
    const xmlFragment = ydoc.getXmlFragment(key);

    return xmlFragment;
  } catch (e) {
    // Silently fail
  }

  throw new Error(`No Y.js type found for key "${key}"`);
}

function isCollection(value: unknown): boolean {
  // Check if it's a Y.js type using instanceof
  return (
    value instanceof Y.Array ||
    value instanceof Y.Map ||
    value instanceof Y.Text ||
    value instanceof Y.XmlElement ||
    value instanceof Y.XmlFragment ||
    value instanceof Y.XmlText
  );
}

function isBlockValue(value: unknown): boolean {
  // Values that should be rendered below the key (not inline)
  if (typeof value === "string" && value.includes("\n")) {
    return true;
  }
  if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
    return true;
  }
  return false;
}

const borderColors = [
  "#2196f3", // blue
  "#9c27b0", // purple
  "#4caf50", // green
  "#ff9800", // orange
  "#e91e63", // pink
  "#8bc34a", // lime
  "#00bcd4", // cyan
  "#ffc107", // amber
];

function getBorderColor(level: number): string {
  return borderColors[level % borderColors.length];
}

function getBorderColorWithOpacity(level: number): string {
  const color = getBorderColor(level);
  // Convert hex to rgba with 50% opacity
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.5)`;
}

interface YDocInspectorProps {
  ydoc: Y.Doc;
}

export function YDocInspector({ ydoc }: YDocInspectorProps) {
  const [, setVersion] = useState(0);

  useEffect(() => {
    // Trigger initial render
    setVersion((v) => v + 1);

    const handler = () => setVersion((v) => v + 1);
    ydoc.on("update", handler);
    return () => ydoc.off("update", handler);
  }, [ydoc]);

  const sharedKeys = Array.from(ydoc.share.keys());

  return (
    <div
      style={{ fontFamily: "monospace", fontSize: "14px", overflowY: "auto" }}
    >
      {sharedKeys.length === 0 ? (
        <div style={{ color: "#666", fontStyle: "italic" }}>
          No shared types
        </div>
      ) : (
        sharedKeys.map((key) => {
          const value = getYValue(ydoc, key);
          return (
            <div key={key} style={{ marginBottom: "16px" }}>
              <KeyValueRenderer keyLabel={`${key}:`} value={value} level={0} />
            </div>
          );
        })
      )}
    </div>
  );
}

function YTextRenderer({
  ytext,
  level = 0,
}: {
  ytext: Y.Text;
  level?: number;
}) {
  let text = "";

  try {
    text = ytext.toString();
  } catch (error) {
    console.error("[YTextRenderer] Error reading text:", error);
    return (
      <div style={{ color: "#f44336", fontStyle: "italic" }}>
        Error reading text
      </div>
    );
  }

  return (
    <div
      style={{
        maxHeight: "400px",
        overflowY: "auto",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        borderLeft: `2px solid ${getBorderColorWithOpacity(level)}`,
        paddingLeft: "8px",
        width: "100%",
      }}
    >
      {text || (
        <span style={{ color: "#999", fontStyle: "italic" }}>empty</span>
      )}
    </div>
  );
}

function YXmlElementRenderer({
  element,
  level = 0,
}: {
  element: Y.XmlElement;
  level?: number;
}) {
  return (
    <div
      style={{
        borderLeft: `2px solid ${getBorderColorWithOpacity(level)}`,
        paddingLeft: "8px",
      }}
    >
      &lt;{element.nodeName}&gt;
    </div>
  );
}

function YXmlTextRenderer({
  xmltext,
  level = 0,
}: {
  xmltext: Y.XmlText;
  level?: number;
}) {
  let text = "";

  try {
    text = xmltext.toString();
  } catch (error) {
    console.error("[YXmlTextRenderer] Error reading xml text:", error);
    return (
      <div style={{ color: "#f44336", fontStyle: "italic" }}>
        Error reading xml text
      </div>
    );
  }

  return (
    <div
      style={{
        borderLeft: `2px solid ${getBorderColorWithOpacity(level)}`,
        paddingLeft: "8px",
        whiteSpace: "pre-wrap",
      }}
    >
      {text || (
        <span style={{ color: "#999", fontStyle: "italic" }}>
          empty xml text
        </span>
      )}
    </div>
  );
}

function YArrayRenderer({
  yarray,
  level = 0,
}: {
  yarray: Y.Array<unknown>;
  level?: number;
}) {
  let items: unknown[] = [];

  try {
    items = yarray.toArray();
  } catch (error) {
    console.error("[YArrayRenderer] Error reading array:", error);
    return (
      <div style={{ color: "#f44336", fontStyle: "italic" }}>
        Error reading array
      </div>
    );
  }

  return (
    <div
      style={{
        maxHeight: "500px",
        overflowY: "auto",
        width: "100%",
      }}
    >
      {items.length === 0 ? (
        <div
          style={{
            color: "#999",
            fontStyle: "italic",
            borderLeft: `2px solid ${getBorderColor(level + 1)}`,
            paddingLeft: "8px",
          }}
        >
          empty array
        </div>
      ) : (
        items.map((item, index) => (
          <div key={index} style={{ marginBottom: "4px" }}>
            <KeyValueRenderer
              keyLabel={`[${index}]`}
              value={item}
              level={level + 1}
            />
          </div>
        ))
      )}
    </div>
  );
}

function YMapRenderer({
  ymap,
  level = 0,
}: {
  ymap: Y.Map<unknown>;
  level?: number;
}) {
  let entries: [string, unknown][] = [];

  try {
    entries = Array.from(ymap.entries());
  } catch (error) {
    console.error("[YMapRenderer] Error reading map entries:", error);
    return (
      <div style={{ color: "#f44336", fontStyle: "italic" }}>
        Error reading map
      </div>
    );
  }

  return (
    <div
      style={{
        maxHeight: "500px",
        overflowY: "auto",
        width: "100%",
      }}
    >
      {entries.length === 0 ? (
        <div
          style={{
            color: "#999",
            fontStyle: "italic",
            borderLeft: `2px solid ${getBorderColor(level + 1)}`,
            paddingLeft: "8px",
          }}
        >
          empty map
        </div>
      ) : (
        entries.map(([key, value]) => (
          <div key={key} style={{ marginBottom: "4px" }}>
            <KeyValueRenderer
              keyLabel={`"${key}":`}
              value={value}
              level={level + 1}
            />
          </div>
        ))
      )}
    </div>
  );
}

function KeyValueRenderer({
  keyLabel,
  value,
  level,
}: {
  keyLabel: string;
  value: unknown;
  level: number;
}) {
  const [expanded, setExpanded] = useState(false);

  // Determine if this is a Y.js collection using instanceof
  const isYCollection = isCollection(value);
  const isBlock = isBlockValue(value);

  // Check if Y.js collection is empty
  const isEmpty =
    isYCollection &&
    ((value instanceof Y.Array && value.length === 0) ||
      (value instanceof Y.Map && value.size === 0) ||
      (value instanceof Y.Text && value.length === 0) ||
      (value instanceof Y.XmlElement && value.length === 0) ||
      (value instanceof Y.XmlText && value.length === 0));

  // Empty collections should be treated as simple inline values
  if (isEmpty) {
    let emptyLabel = "";

    if (value instanceof Y.Array) {
      emptyLabel = "empty array";
    } else if (value instanceof Y.Map) {
      emptyLabel = "empty map";
    } else if (value instanceof Y.Text) {
      emptyLabel = "empty text";
    } else if (value instanceof Y.XmlElement) {
      emptyLabel = "empty xml element";
    }

    return (
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          width: "100%",
          boxSizing: "border-box",
          minWidth: 0,
        }}
      >
        <span
          style={{
            color: getBorderColor(level),
            fontWeight: keyLabel.startsWith("[") ? "normal" : "bold",
            marginRight: "8px",
            flexShrink: 0,
          }}
        >
          {keyLabel}
        </span>
        <span style={{ color: "#999", fontStyle: "italic" }}>{emptyLabel}</span>
      </div>
    );
  }

  // Any block value (collection or not) should be expandable
  const isExpandable = isYCollection || isBlock;

  if (isExpandable) {
    return (
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            cursor: "pointer",
            userSelect: "none",
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <span
            style={{
              color: getBorderColor(level),
              marginRight: "8px",
            }}
          >
            {expanded ? "▼" : "▶"}
          </span>
          <span
            style={{
              color: getBorderColor(level),
              fontWeight: keyLabel.startsWith("[") ? "normal" : "bold",
              marginRight: "8px",
            }}
          >
            {keyLabel}
            {value instanceof Y.Array && ` Y.Array[${value.length}]`}
            {value instanceof Y.Map && ` Y.Map{${value.size}}`}
            {value instanceof Y.Text && ` Y.Text`}
            {value instanceof Y.XmlElement && ` Y.XmlElement`}
            {value instanceof Y.XmlText && ` Y.XmlText`}
          </span>
        </div>
        <div
          style={{
            marginTop: "4px",
            display: expanded ? "block" : "none",
            borderLeft: `2px solid ${getBorderColorWithOpacity(level)}`,
            paddingLeft: "8px",
          }}
        >
          <ValueRenderer
            value={value}
            level={isYCollection ? level + 1 : level}
            inline={false}
          />
        </div>
      </div>
    );
  } else {
    // Simple inline values: key and value on same line
    return (
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          width: "100%",
          boxSizing: "border-box",
          minWidth: 0,
        }}
      >
        <span
          style={{
            color: getBorderColor(level),
            fontWeight: keyLabel.startsWith("[") ? "normal" : "bold",
            marginRight: "8px",
            flexShrink: 0,
          }}
        >
          {keyLabel}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <ValueRenderer value={value} level={level} inline={true} />
        </div>
      </div>
    );
  }
}

function ValueRenderer({
  value,
  level = 0,
  inline = false,
}: {
  value: unknown;
  level?: number;
  inline?: boolean;
}) {
  // Check if it's a Y.js type using instanceof
  if (value instanceof Y.Text) {
    return <YTextRenderer ytext={value} level={level} />;
  } else if (value instanceof Y.Map) {
    return <YMapRenderer ymap={value} level={level} />;
  } else if (value instanceof Y.Array) {
    return <YArrayRenderer yarray={value} level={level} />;
  } else if (value instanceof Y.XmlElement) {
    return <YXmlElementRenderer element={value} level={level} />;
  } else if (value instanceof Y.XmlText) {
    return <YXmlTextRenderer xmltext={value} level={level} />;
  }

  // For plain JS values
  if (typeof value === "string") {
    if (inline) {
      // Inline string without border
      return (
        <span
          style={{
            color: "#032f62",
            whiteSpace: "pre",
            overflowX: "auto",
            display: "inline-block",
            maxWidth: "100%",
          }}
        >
          "{value}"
        </span>
      );
    } else {
      // Block string (for multiline) - border is on wrapper
      return (
        <div
          style={{
            color: "#032f62",
            whiteSpace: "pre",
            maxHeight: "200px",
            overflowY: "auto",
            overflowX: "auto",
            display: "block",
            width: "100%",
            boxSizing: "border-box",
            minWidth: 0,
          }}
        >
          "{value}"
        </div>
      );
    }
  } else if (typeof value === "number") {
    return <span style={{ color: "#005cc5" }}>{value}</span>;
  } else if (typeof value === "boolean") {
    return <span style={{ color: "#d73a49" }}>{String(value)}</span>;
  } else if (value === null) {
    return <span style={{ color: "#6f42c1" }}>null</span>;
  } else if (value === undefined) {
    return <span style={{ color: "#6f42c1" }}>undefined</span>;
  } else if (
    Array.isArray(value) ||
    (typeof value === "object" && value !== null)
  ) {
    // JSON.stringify arrays and objects to indicate they're not synced - border is on wrapper
    return (
      <div
        style={{
          color: "#666",
          fontStyle: "italic",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          maxHeight: "300px",
          overflowY: "auto",
          display: "block",
          width: "100%",
          boxSizing: "border-box",
          minWidth: 0,
        }}
      >
        {JSON.stringify(value, null, 2)}
      </div>
    );
  } else {
    return <span style={{ color: "#666" }}>{String(value)}</span>;
  }
}
