"use client";

import { useState } from "react";
import AddSticker from "./AddSticker";
import AddPart from "./AddPart";

interface AddItemsProps {
  csrfToken: string;
}

const AddItems = ({ csrfToken }: AddItemsProps) => {
  const [activeTab, setActiveTab] = useState<"sticker" | "part">("sticker");

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Add Items</h2>

      {/* Tabs */}
      <div className="border-b border-zinc-700 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("sticker")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === "sticker"
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700"
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
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700"
              }
            `}
          >
            Add Part
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "sticker" && <AddSticker csrfToken={csrfToken} />}
        {activeTab === "part" && <AddPart csrfToken={csrfToken} />}
      </div>
    </div>
  );
};

export default AddItems;
