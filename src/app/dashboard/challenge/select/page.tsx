import { Suspense } from "react";
import { ChallengeSelector } from "@/components/ChallengeSelector";

export default function DashboardChallengeSelectPage() {
  return (
    <Suspense fallback={null}>
      <ChallengeSelector isAuthenticated />
    </Suspense>
  );
}
