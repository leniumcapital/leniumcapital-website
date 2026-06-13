import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  DashboardShell,
  type SessionUser,
} from "@/components/dashboard/DashboardShell";
import type { ChallengeStatus } from "@/lib/users";
import type {
  AccountType,
  AccountChallengeStatus,
} from "@/stores/accountStore";

export const metadata: Metadata = { title: "Dashboard" };

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

/** Map session challenge status onto the dashboard's account-state model. */
function mapStatus(status: ChallengeStatus): AccountChallengeStatus {
  switch (status) {
    case "in_progress":
      return "active";
    case "passed":
    case "funded":
      return "passed";
    case "failed":
      return "breached";
    case "pending":
      return "none";
  }
}

function mapAccountType(
  accountType: "challenge" | "funded",
  status: ChallengeStatus,
  tier: number,
): AccountType {
  if (!tier || status === "pending") return "none";
  return accountType;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware already guards /dashboard; this is defense in depth so the
  // shell can never render without a session even if the matcher changes.
  const session = await auth();
  if (!session?.user) redirect("/signup?mode=login&callbackUrl=/dashboard");

  const u = session.user;
  const user: SessionUser = {
    id: u.id,
    name: u.name ?? "Trader",
    email: u.email ?? "",
    accountType: mapAccountType(u.accountType, u.challengeStatus, u.tier),
    challengeStatus: mapStatus(u.challengeStatus),
    tier: u.tier,
    balance: u.balance,
  };

  return (
    <div className={inter.variable}>
      <DashboardShell user={user}>{children}</DashboardShell>
    </div>
  );
}
