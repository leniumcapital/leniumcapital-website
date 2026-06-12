import { BrandedLoader } from "@/components/BrandedLoader";

/** Shown instantly while the dashboard server-renders. */
export default function DashboardLoading() {
  return <BrandedLoader fullScreen />;
}
