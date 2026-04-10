"use client";

import { useState } from "react";
import AvailableColors from "./AvailableColors";
import PowdercoatColors from "./PowdercoatColors";
import FilamentColors from "./FilamentColors";
import FilamentTypes from "./FilamentTypes";

interface ColorSettingsProps {
  csrfToken: string;
}

const ColorSettings = ({ csrfToken }: ColorSettingsProps) => {
  const [activeTab, setActiveTab] = useState<"vinyl" | "powdercoat" | "filament" | "filament-types">("vinyl");

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Color Settings</h2>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("vinyl")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === "vinyl"
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }
            `}
          >
            Vinyl Colors
          </button>
          <button
            onClick={() => setActiveTab("powdercoat")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === "powdercoat"
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }
            `}
          >
            Powdercoat Colors
          </button>
          <button
            onClick={() => setActiveTab("filament")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === "filament"
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }
            `}
          >
            Filament Colors
          </button>
          <button
            onClick={() => setActiveTab("filament-types")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === "filament-types"
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }
            `}
          >
            Filament Types
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "vinyl" && <AvailableColors csrfToken={csrfToken} />}
        {activeTab === "powdercoat" && (
          <PowdercoatColors csrfToken={csrfToken} />
        )}
        {activeTab === "filament" && (
          <FilamentColors csrfToken={csrfToken} />
        )}
        {activeTab === "filament-types" && (
          <FilamentTypes csrfToken={csrfToken} />
        )}
      </div>
    </div>
  );
};

export default ColorSettings;
