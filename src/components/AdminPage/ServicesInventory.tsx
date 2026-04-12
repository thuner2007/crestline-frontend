"use client";

import Inventory from "./Inventory";

interface ServicesInventoryProps {
  csrfToken: string;
}

const ServicesInventory = ({ csrfToken }: ServicesInventoryProps) => {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Inventory</h2>
      <Inventory csrfToken={csrfToken} />
    </div>
  );
};

export default ServicesInventory;
