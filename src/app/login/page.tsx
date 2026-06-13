import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

/** Legacy /login URL — redirects to the unified auth page. */
export default async function LoginRedirectPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const qs = new URLSearchParams({ mode: "login" });
  if (params.callbackUrl) {
    qs.set("callbackUrl", params.callbackUrl);
  }
  redirect(`/signup?${qs.toString()}`);
}
