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
      className="mt-8 xxs:mt-12 xs:mt-12 sm:mt-6 mb-4 xxs:mb-6 xs:mb-6 sm:mb-4 relative z-20 bg-white pt-4 xxs:pt-6 xs:pt-6 sm:pt-2 border-t border-gray-200 px-6 xxs:px-8 xs:px-8 sm:px-4 mx-4 xxs:mx-6 xs:mx-6 sm:mx-0"
      data-testid="agb-checkbox"
    >
      <label className="flex items-start group cursor-pointer relative z-20">
        <div className="relative flex items-center h-6 xxs:h-8 xs:h-8 sm:h-5">
          <input
            type="checkbox"
            checked={agbAccepted}
            onChange={(e) => setAgbAccepted(e.target.checked)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="sr-only" // Hide the actual checkbox but keep it accessible
          />
          <div
            className={`w-5 h-5 xxs:w-6 xxs:h-6 xs:w-6 xs:h-6 sm:w-5 sm:h-5 border-2 rounded flex items-center justify-center
              ${
                agbAccepted
                  ? "bg-purple-700 border-purple-700"
                  : "bg-white border-gray-300 group-hover:border-purple-600"
              }
              ${isFocused ? "ring-2 ring-purple-400 ring-offset-1" : ""}`}
          >
            {agbAccepted && (
              <CheckIcon className="h-3.5 w-3.5 xxs:h-4 xxs:w-4 xs:h-4 xs:w-4 sm:h-3.5 sm:w-3.5 text-white" />
            )}
          </div>
        </div>
        <span className="ml-3 xxs:ml-4 xs:ml-4 sm:ml-3 text-sm xxs:text-base xs:text-base sm:text-sm text-gray-700 select-none pb-4 xxs:pb-6 xs:pb-6 sm:pb-4">
          {t.rich("agbCheckbox", {
            a: (chunks) => (
              <a
                href={`/${locale}/agb`}
                className="text-purple-700 hover:text-purple-800 underline"
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
          <div className="w-5 xxs:w-6 xs:w-6 sm:w-5 flex-shrink-0"></div>
          <p className="ml-3 xxs:ml-4 xs:ml-4 sm:ml-3 text-red-500 text-sm xxs:text-base xs:text-base sm:text-sm">
            {fieldErrors.agb}
          </p>
        </div>
      )}
    </div>
  );
};

export default AGBCheckbox;
