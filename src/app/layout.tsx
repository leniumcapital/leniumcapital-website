import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { NavigationLoader } from "@/components/NavigationLoader";
import { KalshiMarketProvider } from "@/providers/KalshiMarketProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://lenium.capital"),
  title: {
    default: "Lenium — The prediction market prop firm",
    template: "%s — Lenium",
  },
  description:
    "Lenium funds skilled traders to trade prediction markets on Kalshi. CFTC-regulated infrastructure, USD payouts, available in all 50 states.",
  openGraph: {
    title: "Lenium — The prediction market prop firm",
    description:
      "Get funded to trade prediction markets on Kalshi. CFTC-regulated, USD-settled, all 50 states.",
    url: "https://lenium.capital",
    siteName: "Lenium",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <KalshiMarketProvider>
          <Providers>
            {children}
            <NavigationLoader />
          </Providers>
        </KalshiMarketProvider>
      </body>
    </html>
  );
}
