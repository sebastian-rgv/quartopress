"use client";

import { Languages } from "lucide-react";

import { useI18n } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Lang } from "@/lib/i18n";

const AVAILABLE: Lang[] = ["en", "es"];

export function LanguageToggle() {
  const { lang, setLang, t } = useI18n();

  const cycle = () => {
    const next = AVAILABLE[(AVAILABLE.indexOf(lang) + 1) % AVAILABLE.length];
    setLang(next);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={t("languageToggle")}
      onClick={cycle}
      className="gap-1 font-display text-xs tracking-wider"
    >
      <Languages className="size-4 text-muted-foreground" />
      {AVAILABLE.map((option) => (
        <span
          key={option}
          className={cn(
            option === lang
              ? "font-semibold text-foreground"
              : "text-muted-foreground/45"
          )}
        >
          {option.toUpperCase()}
        </span>
      ))}
    </Button>
  );
}