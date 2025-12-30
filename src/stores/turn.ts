import { persistentAtom } from "@nanostores/persistent";
import { z } from "zod";

export type TurnServerConfig = {
  url: string;
  username: string;
  credential: string;
};

const initialConfig: TurnServerConfig = {
  url: "",
  username: "",
  credential: "",
};

export const $turnConfig = persistentAtom<TurnServerConfig>(
  "turnServerConfigExperiment",
  initialConfig,
  {
    encode: JSON.stringify,
    decode(value) {
      const Schema = z
        .object({
          url: z.string().optional(),
          username: z.string().optional(),
          credential: z.string().optional(),
        })
        .passthrough();
      try {
        const raw = JSON.parse(value);
        const s = Schema.safeParse(raw);
        if (!s.success) return initialConfig;
        return {
          url: s.data.url ?? "",
          username: s.data.username ?? "",
          credential: s.data.credential ?? "",
        } as TurnServerConfig;
      } catch {
        return initialConfig;
      }
    },
  }
);

export function setTurnConfig(config: TurnServerConfig): void {
  $turnConfig.set(config);
}

export function isTurnConfigComplete(config: TurnServerConfig): boolean {
  return Boolean(config.url && config.username && config.credential);
}
