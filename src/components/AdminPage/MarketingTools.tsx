"use client";

import { useState } from "react";
import TodaysChoice from "./TodaysChoice";
import PushNotifications from "./PushNotifications";

interface MarketingToolsProps {
  csrfToken: string;
}

const MarketingTools = ({ csrfToken }: MarketingToolsProps) => {
  const [activeTab, setActiveTab] = useState<
    "todays-choice" | "notifications"
  >("todays-choice");

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Marketing Tools</h2>

      {/* Tabs */}
      <div className="border-b border-zinc-700 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("todays-choice")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === "todays-choice"
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700"
              }
            `}
          >
            Today&apos;s Choice
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === "notifications"
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700"
              }
            `}
          >
            Notifications
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "todays-choice" && (
          <TodaysChoice csrfToken={csrfToken} />
        )}
        {activeTab === "notifications" && (
          <PushNotifications csrfToken={csrfToken} />
        )}
      </div>
    </div>
  );
};

export default MarketingTools;
