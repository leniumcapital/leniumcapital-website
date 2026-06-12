import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { AccountInfoPanel } from "@/components/dashboard/AccountInfoPanel";

export default function AccountPage() {
  return (
    <ErrorBoundary name="Trading account">
      <AccountInfoPanel />
    </ErrorBoundary>
  );
}
