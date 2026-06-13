import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { ProfilePanel } from "@/components/dashboard/ProfilePanel";

export default function ProfilePage() {
  return (
    <ErrorBoundary name="Profile">
      <ProfilePanel />
    </ErrorBoundary>
  );
}
