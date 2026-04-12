"use client";

import { useState } from "react";
import Tracker from "./Tracker";
import TrackerHistory from "./TrackerHistory";

interface TrackingManagementProps {
  csrfToken: string;
}

const TrackingManagement = ({ csrfToken }: TrackingManagementProps) => {
  const [activeTab, setActiveTab] = useState<"tracker" | "history">("tracker");

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Tracking Management</h2>

      {/* Tabs */}
      <div className="border-b border-zinc-700 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("tracker")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === "tracker"
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700"
              }
            `}
          >
            Tracker
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === "history"
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700"
              }
            `}
          >
            Tracker History
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "tracker" && <Tracker csrfToken={csrfToken} />}
        {activeTab === "history" && <TrackerHistory csrfToken={csrfToken} />}
      </div>
    </div>
  );
};

export default TrackingManagement;
