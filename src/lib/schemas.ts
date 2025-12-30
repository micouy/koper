import { z } from "zod";

export const HelloMessage = z.object({
  type: z.literal("hello"),
  payload: z.unknown().optional(),
});

export const YUpdateMessage = z.object({
  type: z.literal("y-update"),
  updateId: z.string(),
  chunkIndex: z.number(),
  totalChunks: z.number(),
  data: z.instanceof(ArrayBuffer),
});

export const YStateVectorMessage = z.object({
  type: z.literal("y-state-vector"),
  stateVector: z.array(z.number()),
});

export const YCodeUpdateMessage = z.object({
  type: z.literal("y-code-update"),
  updateId: z.string(),
  chunkIndex: z.number(),
  totalChunks: z.number(),
  data: z.instanceof(ArrayBuffer),
});

export const YCodeStateVectorMessage = z.object({
  type: z.literal("y-code-state-vector"),
  stateVector: z.array(z.number()),
});

export const AnyMessage = z.discriminatedUnion("type", [
  HelloMessage,
  YUpdateMessage,
  YStateVectorMessage,
  YCodeUpdateMessage,
  YCodeStateVectorMessage,
]);

export type AnyMessage = z.infer<typeof AnyMessage>;
