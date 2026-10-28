import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return <img src="/images/gim-logo.png" alt="German In Minutes" width={633} height={215} className={cn("brand-logo", className)} />;
}
