import { create } from "zustand";

export type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

interface ConnectionState {
  status: ConnectionStatus;
  lastUpdateTimestamp: number;
  reconnectAttempts: number;
  setConnected: () => void;
  setReconnecting: () => void;
  setDisconnected: () => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
  reset: () => void;
}

export const useConnectionStore = create<ConnectionState>()((set) => ({
  status: "disconnected",
  lastUpdateTimestamp: 0,
  reconnectAttempts: 0,
  setConnected: () =>
    set({ status: "connected", lastUpdateTimestamp: Date.now() }),
  setReconnecting: () => set({ status: "reconnecting" }),
  setDisconnected: () => set({ status: "disconnected" }),
  incrementReconnectAttempts: () =>
    set((s) => ({ reconnectAttempts: s.reconnectAttempts + 1 })),
  resetReconnectAttempts: () => set({ reconnectAttempts: 0 }),
  reset: () =>
    set({ status: "disconnected", lastUpdateTimestamp: 0, reconnectAttempts: 0 }),
}));
