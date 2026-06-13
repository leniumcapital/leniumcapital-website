import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { AccountPanel } from "@/components/dashboard/AccountPanel";

export default function AccountPage() {
  return (
    <ErrorBoundary name="Account">
      <AccountPanel />
    </ErrorBoundary>
  );
}
