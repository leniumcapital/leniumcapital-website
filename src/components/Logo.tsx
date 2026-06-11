import Link from "next/link";
import { LeniumLogo, type LeniumVariant } from "./ui/LeniumLogo";

export function Logo({
  className = "",
  variant = "green",
  size = 28,
  showWordmark = true,
}: {
  className?: string;
  variant?: LeniumVariant;
  size?: number;
  showWordmark?: boolean;
}) {
  return (
    <Link href="/" className={`inline-flex items-center ${className}`}>
      <LeniumLogo size={size} variant={variant} showWordmark={showWordmark} />
    </Link>
  );
}
