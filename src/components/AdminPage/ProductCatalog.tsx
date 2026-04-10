"use client";

import { useState } from "react";
import Groups from "./Groups";
import PartGroups from "./PartGroups";
import Variations from "./Variations";
import PartAccessories from "./PartAccessories";
import BikeModels from "./BikeModels";

interface ProductCatalogProps {
  csrfToken: string;
}

const ProductCatalog = ({ csrfToken }: ProductCatalogProps) => {
  const [activeTab, setActiveTab] = useState<
    "groups" | "part-groups" | "variations" | "accessories" | "bikes"
  >("groups");

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Product Catalog</h2>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("groups")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === "groups"
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }
            `}
          >
            Groups
          </button>
          <button
            onClick={() => setActiveTab("part-groups")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === "part-groups"
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }
            `}
          >
            Part Groups
          </button>
          <button
            onClick={() => setActiveTab("variations")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === "variations"
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
        {activeTab === "part-groups" && <PartGroups csrfToken={csrfToken} />}
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
