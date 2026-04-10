"use client";

import { useState } from "react";
import PowdercoatServices from "./PowdercoatServices";
import Inventory from "./Inventory";

interface ServicesInventoryProps {
  csrfToken: string;
}

const ServicesInventory = ({ csrfToken }: ServicesInventoryProps) => {
  const [activeTab, setActiveTab] = useState<"powdercoat" | "inventory">(
    "inventory",
  );

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Services & Inventory</h2>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
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
            Powdercoat Services
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === "inventory"
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }
            `}
          >
            Inventory
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "powdercoat" && (
          <PowdercoatServices csrfToken={csrfToken} />
        )}
        {activeTab === "inventory" && <Inventory csrfToken={csrfToken} />}
      </div>
    </div>
  );
};

export default ServicesInventory;
