import { useAccountStore } from "@/stores/accountStore";
import { usePositionStore } from "@/stores/positionStore";
import { effectiveAccountSize } from "@/lib/rules";

/** Cash balance = starting size + realized P&L − open position cost − commissions. */
export function reconcileCashBalance(): void {
  const account = useAccountStore.getState();
  const size = effectiveAccountSize({
    accountSize: account.accountSize,
    tier: account.tier,
    challengeTier: account.challengeTier,
    fundedTier: account.fundedTier,
    tradingMode: account.tradingMode,
  });
  if (size <= 0 || account.accountType === "none") return;

  const { positions, closedTrades } = usePositionStore.getState();
  const realized = closedTrades.reduce((sum, t) => sum + t.pnl, 0);
  const deployed = Object.values(positions).reduce((sum, p) => sum + p.size, 0);
  const cash = size + realized - deployed - account.commissionsPaid;
  const rounded = Math.max(0, Math.round(cash * 100) / 100);

  if (Math.abs(rounded - account.balance) > 0.009) {
    account.updateBalance(rounded);
  }
}
