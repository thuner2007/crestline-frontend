"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Plus,
  Package,
  History,
  Settings,
  Tag,
  Palette,
  FolderTree,
  Compass,
  Megaphone,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const sidebarItems = [
  { id: "users", label: "Users", icon: <Users className="h-5 w-5" /> },
  { id: "add-items", label: "Add Items", icon: <Plus className="h-5 w-5" /> },
  {
    id: "product-catalog",
    label: "Product Catalog",
    icon: <FolderTree className="h-5 w-5" />,
  },
  {
    id: "services-inventory",
    label: "Services & Inventory",
    icon: <Package className="h-5 w-5" />,
  },
  { id: "orders", label: "Orders", icon: <History className="h-5 w-5" /> },
  {
    id: "marketing",
    label: "Marketing",
    icon: <Megaphone className="h-5 w-5" />,
  },
  {
    id: "discount-codes",
    label: "Discount Codes",
    icon: <Tag className="h-5 w-5" />,
  },
  {
    id: "colors",
    label: "Color Settings",
    icon: <Palette className="h-5 w-5" />,
  },
  {
    id: "tracking",
    label: "Tracking",
    icon: <Compass className="h-5 w-5" />,
  },
  {
    id: "settings",
    label: "Settings",
    icon: <Settings className="h-5 w-5" />,
  },
];

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Extract locale from pathname (e.g. /en/admin/orders -> en)
  const locale = pathname.split("/")[1];
  // Extract active section from pathname (e.g. /en/admin/orders -> orders)
  const pathSegments = pathname.split("/");
  const activeSection = pathSegments[3] || "users";

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <h2 className="text-xl font-bold text-red-600">
              Unauthorized Access
            </h2>
            <p className="mt-2 text-gray-600">
              You don&apos;t have permission to view this page
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex items-center justify-between mb-4 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">
            RevSticks Admin Dashboard
          </h1>

          {/* Mobile menu button */}
          <button
            className="block md:hidden p-2 bg-purple-700 text-white rounded-md"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {sidebarOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 md:gap-8">
          {/* Mobile Sidebar (overlay) */}
          <div
            className={`
              fixed inset-0 z-40 transform ease-in-out duration-300 md:hidden
              ${
                sidebarOpen
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 pointer-events-none"
              }
            `}
          >
            <div
              className="absolute inset-0 bg-black opacity-50"
              onClick={() => setSidebarOpen(false)}
            ></div>
            <div
              className="absolute inset-y-0 left-0 max-w-xs w-full bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-10"
              style={{
                transform: sidebarOpen
                  ? "translateX(0)"
                  : "translateX(-100%)",
              }}
            >
              <div className="p-4 flex justify-between items-center border-b">
                <h2 className="text-lg font-semibold">Menu</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="text-gray-600"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <nav
                className="p-4 overflow-y-auto"
                style={{ maxHeight: "calc(100vh - 64px)" }}
              >
                <ul className="space-y-2">
                  {sidebarItems.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/${locale}/admin/${item.id}`}
                        onClick={() => setSidebarOpen(false)}
                        className={`w-full flex items-center gap-3 px-4 py-2 rounded-md text-left ${
                          activeSection === item.id
                            ? "bg-purple-100 text-purple-700"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </div>

          {/* Desktop Sidebar */}
          <div className="hidden md:block w-64 bg-white rounded-lg shadow flex-shrink-0">
            <nav className="p-4">
              <ul className="space-y-2">
                {sidebarItems.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/${locale}/admin/${item.id}`}
                      className={`w-full flex items-center gap-3 px-4 py-2 rounded-md text-left ${
                        activeSection === item.id
                          ? "bg-purple-100 text-purple-700"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 bg-white rounded-lg shadow p-3 sm:p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
