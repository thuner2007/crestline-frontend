"use client";

import { useState } from "react";
import AvailableColors from "./AvailableColors";

interface ColorSettingsProps {
  csrfToken: string;
}

const ColorSettings = ({ csrfToken }: ColorSettingsProps) => {
  const [activeTab, setActiveTab] = useState<"vinyl">("vinyl");

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Color Settings</h2>

      {/* Tabs */}
      <div className="border-b border-zinc-700 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("vinyl")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === "vinyl"
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700"
              }
            `}
          >
            Vinyl Colors
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "vinyl" && <AvailableColors csrfToken={csrfToken} />}
      </div>
    </div>
  );
};

export default ColorSettings;
