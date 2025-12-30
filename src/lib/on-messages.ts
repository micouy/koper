import { peerManager } from "./peerjs-peer-manager";
import { HelloMessage } from "./schemas";

export function attachHelloLogger(): () => void {
  const off = peerManager.onMessage((data) => {
    const parsed = HelloMessage.safeParse(data);

    if (!parsed.success) {
      return;
    }

    console.log("Hello received:", parsed.data);
  });

  return off;
}
