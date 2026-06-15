import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { BillingPanel } from "@/components/dashboard/BillingPanel";

export default function BillingPage() {
  return (
    <ErrorBoundary name="Billing">
      <BillingPanel />
    </ErrorBoundary>
  );
}
