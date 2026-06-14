import Link from "next/link";
import { Logo } from "./Logo";
import {
  SITE_EMAIL,
  SITE_TWITTER_HANDLE,
  SITE_TWITTER_URL,
} from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo variant="outline" />
          <p className="max-w-xs text-sm text-muted">
            The first CFTC-regulated prediction market proprietary trading firm.
            Built on Kalshi.
          </p>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold">Product</h4>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link href="/how-it-works" className="hover:text-foreground">How It Works</Link></li>
            <li><Link href="/pricing" className="hover:text-foreground">Pricing</Link></li>
            <li><Link href="/rules" className="hover:text-foreground">Rules</Link></li>
            <li><Link href="/leaderboard" className="hover:text-foreground">Leaderboard</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold">Account</h4>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link href="/signup?mode=login" className="hover:text-foreground">Login</Link></li>
            <li><Link href="/signup" className="hover:text-foreground">Create account</Link></li>
            <li><Link href="/how-it-works#faq" className="hover:text-foreground">FAQ</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold">Contact</h4>
          <ul className="space-y-2 text-sm text-muted">
            <li>
              <a
                href={SITE_TWITTER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground"
              >
                {SITE_TWITTER_HANDLE}
              </a>
            </li>
            <li>
              <a
                href={`mailto:${SITE_EMAIL}`}
                className="hover:text-foreground"
              >
                {SITE_EMAIL}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Lenium, Inc. A Delaware C-corporation.</p>
          <p className="max-w-2xl sm:text-right">
            Lenium is an evaluation services company, not a broker-dealer, FCM,
            or investment adviser. Nothing here is an offer of securities or
            investment advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
