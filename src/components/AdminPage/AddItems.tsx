"use client";

import { useState } from "react";
import AddSticker from "./AddSticker";
import AddPart from "./AddPart";
import AddPowdercoatService from "./AddPowdercoatService";

interface AddItemsProps {
  csrfToken: string;
}

const AddItems = ({ csrfToken }: AddItemsProps) => {
  const [activeTab, setActiveTab] = useState<"sticker" | "part" | "powdercoat">(
    "sticker",
  );

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Add Items</h2>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("sticker")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === "sticker"
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }
            `}
          >
            Add Sticker
          </button>
          <button
            onClick={() => setActiveTab("part")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === "part"
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }
            `}
          >
            Add Part
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
            Add Powdercoat Service
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "sticker" && <AddSticker csrfToken={csrfToken} />}
        {activeTab === "part" && <AddPart csrfToken={csrfToken} />}
        {activeTab === "powdercoat" && (
          <AddPowdercoatService csrfToken={csrfToken} />
        )}
      </div>
    </div>
  );
};

export default AddItems;
