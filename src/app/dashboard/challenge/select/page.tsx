import { Suspense } from "react";
import { ChallengeSelector } from "@/components/ChallengeSelector";
import { T } from "@/lib/tokens";

export default function DashboardChallengeSelectPage() {
  return (
    <div style={{ padding: "32px 40px 48px", fontFamily: T.font }}>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 600,
          color: T.textPrimary,
          margin: 0,
        }}
      >
        Start a challenge
      </h1>
      <p
        style={{
          marginTop: 8,
          fontSize: 14,
          color: T.textSecondary,
          maxWidth: 480,
        }}
      >
        Pick your account size and add-ons. Your total updates as you configure.
      </p>

      <div style={{ marginTop: 28, maxWidth: 960 }}>
        <Suspense fallback={null}>
          <ChallengeSelector isAuthenticated />
        </Suspense>
      </div>
    </div>
  );
}
