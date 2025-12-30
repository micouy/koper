import { atom } from "nanostores";

export type LogEntry = {
  args: unknown[];
  timestamp: number;
};

export const $logs = atom<LogEntry[]>([]);

export const addLog = (args: unknown[]) => {
  $logs.set([
    ...$logs.get(),
    {
      args,
      timestamp: Date.now(),
    },
  ]);
};

export const clearLogs = () => {
  $logs.set([]);
};

