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
  X,
  Menu,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const sidebarItems = [
  { id: "users", label: "Users", icon: <Users className="h-4 w-4" /> },
  { id: "add-items", label: "Add Items", icon: <Plus className="h-4 w-4" /> },
  {
    id: "product-catalog",
    label: "Product Catalog",
    icon: <FolderTree className="h-4 w-4" />,
  },
  {
    id: "services-inventory",
    label: "Services & Inventory",
    icon: <Package className="h-4 w-4" />,
  },
  { id: "orders", label: "Orders", icon: <History className="h-4 w-4" /> },
  {
    id: "marketing",
    label: "Marketing",
    icon: <Megaphone className="h-4 w-4" />,
  },
  {
    id: "discount-codes",
    label: "Discount Codes",
    icon: <Tag className="h-4 w-4" />,
  },
  {
    id: "colors",
    label: "Color Settings",
    icon: <Palette className="h-4 w-4" />,
  },
  {
    id: "tracking",
    label: "Tracking",
    icon: <Compass className="h-4 w-4" />,
  },
  {
    id: "settings",
    label: "Settings",
    icon: <Settings className="h-4 w-4" />,
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
    <div className="min-h-screen bg-zinc-950 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center">
            <h2 className="text-xl font-bold uppercase tracking-widest text-red-400">
              Unauthorized Access
            </h2>
            <p className="mt-2 text-zinc-400">
              You don&apos;t have permission to view this page
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex items-center justify-between mb-4 sm:mb-8">
          <div className="flex items-center gap-3">
            <div className="h-6 w-1 bg-amber-500" />
            <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-[0.15em] text-white">
              Admin <span className="text-amber-400">Dashboard</span>
            </h1>
          </div>

          {/* Mobile menu button */}
          <button
            className="block md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
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
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <div
              className="absolute inset-y-0 left-0 max-w-xs w-full bg-zinc-900 border-r border-zinc-800 shadow-[4px_0_32px_rgba(0,0,0,0.6)] transform transition-transform duration-300 ease-in-out z-10"
              style={{
                transform: sidebarOpen
                  ? "translateX(0)"
                  : "translateX(-100%)",
              }}
            >
              <div className="p-4 flex justify-between items-center border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-0.5 bg-amber-500" />
                  <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-100">
                    Menu
                  </h2>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <nav
                className="p-3 overflow-y-auto"
                style={{ maxHeight: "calc(100vh - 64px)" }}
              >
                <ul className="space-y-1">
                  {sidebarItems.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/${locale}/admin/${item.id}`}
                        onClick={() => setSidebarOpen(false)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold uppercase tracking-widest transition-all border-l-2 ${
                          activeSection === item.id
                            ? "border-amber-500 text-amber-400 bg-amber-500/10"
                            : "border-transparent text-zinc-400 hover:text-white hover:bg-zinc-800"
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
          <div className="hidden md:block w-56 flex-shrink-0">
            <nav className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 sticky top-20">
              <ul className="space-y-1">
                {sidebarItems.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/${locale}/admin/${item.id}`}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold uppercase tracking-widest transition-all border-l-2 ${
                        activeSection === item.id
                          ? "border-amber-500 text-amber-400 bg-amber-500/10"
                          : "border-transparent text-zinc-400 hover:text-white hover:bg-zinc-800"
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
          <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg p-3 sm:p-6 min-w-0 text-white">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
