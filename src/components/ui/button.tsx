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
        "font-display inline-flex min-h-11 min-w-11 items-center justify-center rounded-[3px] px-4 text-base font-medium tracking-wide transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" &&
          "bg-primary text-primary-foreground hover:bg-[#2c4a41]",
        variant === "secondary" &&
          "border border-border bg-surface text-foreground hover:bg-surface-muted",
        variant === "ghost" && "text-primary hover:bg-surface-muted",
        variant === "danger" &&
          "bg-danger text-danger-foreground hover:bg-[#8c3127]",
        className,
      )}
      {...props}
    />
  );
}
