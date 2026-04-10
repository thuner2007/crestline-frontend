"use client";

import { useState } from "react";
import TodaysChoice from "./TodaysChoice";
import BlogManagement from "./BlogManagement";
import PushNotifications from "./PushNotifications";

interface MarketingToolsProps {
  csrfToken: string;
}

const MarketingTools = ({ csrfToken }: MarketingToolsProps) => {
  const [activeTab, setActiveTab] = useState<
    "todays-choice" | "blog" | "notifications"
  >("todays-choice");

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Marketing Tools</h2>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("todays-choice")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === "todays-choice"
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }
            `}
          >
            Today&apos;s Choice
          </button>
          <button
            onClick={() => setActiveTab("blog")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === "blog"
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }
            `}
          >
            Blog
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === "notifications"
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
        {activeTab === "blog" && <BlogManagement csrfToken={csrfToken} />}
        {activeTab === "notifications" && (
          <PushNotifications csrfToken={csrfToken} />
        )}
      </div>
    </div>
  );
};

export default MarketingTools;
