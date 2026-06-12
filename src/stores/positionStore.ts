import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist } from "zustand/middleware";
import { useMarketStore } from "@/stores/marketStore";

export type Direction = "yes" | "no";

export type Position = {
  id: string;
  marketTicker: string;
  question: string;
  category: string;
  direction: Direction;
  /** Dollar size of the position. */
  size: number;
  /** Entry price in percent / cents (0–100) for the chosen direction. */
  entryPrice: number;
  /** Unix ms when opened. */
  openedAt: number;
};

export type ClosedTrade = Position & {
  exitPrice: number;
  pnl: number;
  pnlPercent: number;
  closedAt: number;
};

interface PositionState {
  positions: Record<string, Position>;
  closedTrades: ClosedTrade[];
  addPosition: (position: Position) => void;
  closePosition: (positionId: string, exitPrice: number) => ClosedTrade | null;
  setPositions: (positions: Position[]) => void;
  reset: () => void;
}

export const usePositionStore = create<PositionState>()(
  persist(
    immer((set, get) => ({
      positions: {},
      closedTrades: [],

      addPosition: (position) =>
        set((s) => {
          s.positions[position.id] = position;
        }),

      closePosition: (positionId, exitPrice) => {
        const pos = get().positions[positionId];
        if (!pos) return null;
        const pnl = computePnl(pos, exitPrice);
        const closed: ClosedTrade = {
          ...pos,
          exitPrice,
          pnl,
          pnlPercent: pos.size > 0 ? (pnl / pos.size) * 100 : 0,
          closedAt: Date.now(),
        };
        set((s) => {
          delete s.positions[positionId];
          s.closedTrades.unshift(closed);
          if (s.closedTrades.length > 500) s.closedTrades.pop();
        });
        return closed;
      },

      setPositions: (positions) =>
        set((s) => {
          s.positions = {};
          for (const p of positions) s.positions[p.id] = p;
        }),

      reset: () => set(() => ({ positions: {}, closedTrades: [] })),
    })),
    { name: "lenium-positions" },
  ),
);

/** Current price for a position's direction, read live from marketStore. */
export function currentPriceFor(position: Position): number {
  const market = useMarketStore.getState().markets[position.marketTicker];
  if (!market) return position.entryPrice;
  return position.direction === "yes" ? market.yesPrice : market.noPrice;
}

/** P&L in dollars at a given exit price (percent units, 0–100). */
export function computePnl(position: Position, exitPrice: number): number {
  if (position.entryPrice <= 0) return 0;
  const contracts = position.size / position.entryPrice;
  return contracts * (exitPrice - position.entryPrice);
}

/** Derived P&L for an open position, reading live prices. */
export function computedPnl(position: Position): number {
  return computePnl(position, currentPriceFor(position));
}

export function computedPnlPercent(position: Position): number {
  if (position.size <= 0) return 0;
  return (computedPnl(position) / position.size) * 100;
}

/** Total unrealized P&L across all open positions. */
export function totalOpenPnl(positions: Record<string, Position>): number {
  let sum = 0;
  for (const id of Object.keys(positions)) sum += computedPnl(positions[id]);
  return sum;
}

/** Realized P&L for the current UTC calendar day. */
export function realizedPnlTodayUtc(closedTrades: ClosedTrade[]): number {
  const now = new Date();
  const dayStart = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  let sum = 0;
  for (const t of closedTrades) {
    if (t.closedAt >= dayStart) sum += t.pnl;
  }
  return sum;
}
