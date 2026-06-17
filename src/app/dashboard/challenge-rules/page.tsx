import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { ChallengeRulesPanel } from "@/components/dashboard/ChallengeRulesPanel";

export default function ChallengeRulesPage() {
  return (
    <ErrorBoundary name="Challenge rules">
      <ChallengeRulesPanel />
    </ErrorBoundary>
  );
}
