import * as Y from "yjs";
import { diffChars } from "diff";

export function applyDiffToYText(ytext: Y.Text, newContent: string) {
  const oldContent = ytext.toString();
  if (oldContent === newContent) return;

  const diffs = diffChars(oldContent, newContent);
  let index = 0;

  for (const part of diffs) {
    if (part.removed) {
      const len = part.count ?? part.value.length;
      if (len > 0) {
        ytext.delete(index, len);
      }
    } else if (part.added) {
      if (part.value.length > 0) {
        ytext.insert(index, part.value);
        index += part.value.length;
      }
    } else {
      index += part.value.length;
    }
  }
}
