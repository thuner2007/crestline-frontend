"use client";

import { useState } from "react";
import PartAccessories from "./PartAccessories";
import PartSections from "./PartSections";

interface ProductCatalogProps {
  csrfToken: string;
}

const ProductCatalog = ({ csrfToken }: ProductCatalogProps) => {
  const [activeTab, setActiveTab] = useState<
    "sections" | "accessories"
  >("sections");

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Product Catalog</h2>

      {/* Tabs */}
      <div className="border-b border-zinc-700 mb-6">
        <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("sections")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === "sections"
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700"
              }
            `}
          >
            Part Sections
          </button>
          
          <button
            onClick={() => setActiveTab("accessories")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === "accessories"
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700"
              }
            `}
          >
            Part Accessories
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "sections" && <PartSections csrfToken={csrfToken} />}
        {activeTab === "accessories" && (
          <PartAccessories csrfToken={csrfToken} />
        )}
      </div>
    </div>
  );
};

export default ProductCatalog;
