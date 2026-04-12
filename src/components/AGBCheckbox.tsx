import { useTranslations } from "next-intl";
import { CheckIcon } from "lucide-react";
import { useState } from "react";

const AGBCheckbox = ({
  agbAccepted,
  setAgbAccepted,
  fieldErrors,
  locale,
}: {
  agbAccepted: boolean;
  setAgbAccepted: (value: boolean) => void;
  fieldErrors: Record<string, string>;
  locale: string;
}) => {
  const t = useTranslations("checkout");
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      className="mt-6 mb-4 relative z-20 pt-4 border-t border-zinc-800 px-4 sm:px-0"
      data-testid="agb-checkbox"
    >
      <label className="flex items-start group cursor-pointer relative z-20">
        <div className="relative flex items-center h-5 mt-0.5">
          <input
            type="checkbox"
            checked={agbAccepted}
            onChange={(e) => setAgbAccepted(e.target.checked)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="sr-only"
          />
          <div
            className={`w-5 h-5 border-2 flex items-center justify-center transition-colors duration-150
              ${
                agbAccepted
                  ? "bg-amber-500 border-amber-500"
                  : "bg-zinc-950 border-zinc-600 group-hover:border-amber-500"
              }
              ${isFocused ? "ring-2 ring-amber-500/40 ring-offset-1 ring-offset-zinc-950" : ""}`}
          >
            {agbAccepted && (
              <CheckIcon className="h-3.5 w-3.5 text-zinc-950" />
            )}
          </div>
        </div>
        <span className="ml-3 text-sm text-zinc-400 select-none leading-relaxed">
          {t.rich("agbCheckbox", {
            a: (chunks) => (
              <a
                href={`/${locale}/agb`}
                className="text-amber-400 hover:text-amber-300 underline underline-offset-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                {chunks}
              </a>
            ),
          })}
        </span>
      </label>
      {fieldErrors.agb && (
        <div className="flex items-start mt-2">
          <div className="w-5 flex-shrink-0"></div>
          <p className="ml-3 text-red-400 text-xs uppercase tracking-wide">
            {fieldErrors.agb}
          </p>
        </div>
      )}
    </div>
  );
};

export default AGBCheckbox;
