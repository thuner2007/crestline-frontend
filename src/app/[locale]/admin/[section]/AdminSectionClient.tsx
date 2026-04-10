"use client";

import AddItems from "@/components/AdminPage/AddItems";
import ProductCatalog from "@/components/AdminPage/ProductCatalog";
import ServicesInventory from "@/components/AdminPage/ServicesInventory";
import ColorSettings from "@/components/AdminPage/ColorSettings";
import TrackingManagement from "@/components/AdminPage/TrackingManagement";
import MarketingTools from "@/components/AdminPage/MarketingTools";
import ShowUsers from "@/components/AdminPage/ShowUsers";
import Orders from "@/components/AdminPage/Orders";
import DiscountCodes from "@/components/AdminPage/DiscountCodes";
import useCsrfToken from "@/useCsrfToken";

export default function AdminSectionClient({ section }: { section: string }) {
  const { csrfToken } = useCsrfToken();

  switch (section) {
    case "users":
      return <ShowUsers csrfToken={csrfToken} />;
    case "add-items":
      return <AddItems csrfToken={csrfToken} />;
    case "product-catalog":
      return <ProductCatalog csrfToken={csrfToken} />;
    case "services-inventory":
      return <ServicesInventory csrfToken={csrfToken} />;
    case "orders":
      return <Orders csrfToken={csrfToken} />;
    case "marketing":
      return <MarketingTools csrfToken={csrfToken} />;
    case "discount-codes":
      return <DiscountCodes csrfToken={csrfToken} />;
    case "colors":
      return <ColorSettings csrfToken={csrfToken} />;
    case "tracking":
      return <TrackingManagement csrfToken={csrfToken} />;
    case "settings":
      return (
        <div>
          <h2 className="text-xl font-semibold mb-4">Admin Settings</h2>
          <p className="text-gray-600">Settings coming soon...</p>
        </div>
      );
    default:
      return null;
  }
}
