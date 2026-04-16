"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "./theme-provider";
import { Button } from "./ui/button";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      aria-label="Alternar tema"
      className={`h-9 w-9 p-0 text-[#0F4C5C] hover:bg-[#A0E9FF]/20 dark:text-[#A0E9FF] dark:hover:bg-[#A0E9FF]/10 ${className ?? ""}`}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
