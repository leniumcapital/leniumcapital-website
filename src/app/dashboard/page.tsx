import { redirect } from "next/navigation";

/** /dashboard always lands on the market browser. */
export default function DashboardIndexPage() {
  redirect("/dashboard/markets");
}
