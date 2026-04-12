"use client";

import { useState } from "react";
import Groups from "./Groups";
import Variations from "./Variations";
import PartAccessories from "./PartAccessories";
import BikeModels from "./BikeModels";

interface ProductCatalogProps {
  csrfToken: string;
}

const ProductCatalog = ({ csrfToken }: ProductCatalogProps) => {
  const [activeTab, setActiveTab] = useState<
    "groups" | "variations" | "accessories" | "bikes"
  >("groups");

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Product Catalog</h2>

      {/* Tabs */}
      <div className="border-b border-zinc-700 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("groups")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === "groups"
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700"
              }
            `}
          >
            Groups
          </button>
          <button
            onClick={() => setActiveTab("variations")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === "variations"
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700"
              }
            `}
          >
            Variations
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
          <button
            onClick={() => setActiveTab("bikes")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === "bikes"
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700"
              }
            `}
          >
            Bike Models
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "groups" && <Groups csrfToken={csrfToken} />}
        {activeTab === "variations" && <Variations csrfToken={csrfToken} />}
        {activeTab === "accessories" && (
          <PartAccessories csrfToken={csrfToken} />
        )}
        {activeTab === "bikes" && <BikeModels csrfToken={csrfToken} />}
      </div>
    </div>
  );
};

export default ProductCatalog;
