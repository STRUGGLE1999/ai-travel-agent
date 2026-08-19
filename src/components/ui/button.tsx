import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-4 text-base font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" &&
          "bg-primary text-primary-foreground hover:bg-[#104840]",
        variant === "secondary" &&
          "border border-border bg-surface text-foreground hover:bg-surface-muted",
        variant === "ghost" && "text-primary hover:bg-surface-muted",
        variant === "danger" &&
          "bg-danger text-danger-foreground hover:bg-[#7f1622]",
        className,
      )}
      {...props}
    />
  );
}
