"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "constraints", label: "底线" },
  { href: "plan", label: "计划" },
  { href: "versions", label: "版本" },
  { href: "checklist", label: "清单" },
  { href: "handout", label: "手账" },
] as const;

export function TripNav({ tripId }: { tripId: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="行程导航"
      className="no-print border-b border-border bg-surface md:border-b-0 md:border-r"
    >
      <ul className="flex md:flex-col md:gap-1.5 md:px-3 md:py-5">
        {LINKS.map((link) => {
          const href = `/trips/${tripId}/${link.href}`;
          const active = pathname === href;
          return (
            <li key={link.href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex min-h-11 items-center justify-center px-3 text-base md:justify-start md:px-4 md:py-2.5 md:text-[15px]",
                  active
                    ? "border-l-2 border-cinnabar bg-surface-muted/60 font-medium text-primary"
                    : "text-muted hover:bg-surface-muted hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
