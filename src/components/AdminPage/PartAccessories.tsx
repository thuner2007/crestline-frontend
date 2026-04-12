"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import useAxios from "@/useAxios";
import { Search, Save, Package } from "lucide-react";

interface PartAccessoriesProps {
  csrfToken: string | null;
}

interface Part {
  id: string;
  translations: Array<{
    language: string;
    title: string;
  }>;
  price: string;
  images: string[];
  accessories?: Array<{
    id: string;
    translations: Array<{
      language: string;
      title: string;
    }>;
  }>;
}

interface PartResponse {
  data: Part[];
  meta?: {
    total: number;
    limit: number;
    skip: number;
    totalPages: number;
  };
}

export default function PartAccessories({ csrfToken }: PartAccessoriesProps) {
  const axiosInstance = useAxios();
  const [parts, setParts] = useState<Part[]>([]);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [availableParts, setAvailableParts] = useState<Part[]>([]);
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [accessorySearchTerm, setAccessorySearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Fetch all parts
  const fetchParts = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get<PartResponse>(
        "/parts?status=all&amount=10000",
      );
      const partsData = response.data?.data || [];
      const partsArray = Array.isArray(partsData) ? partsData : [];
      setParts(partsArray);
      setAvailableParts(partsArray);
    } catch (error) {
      console.error("Error fetching parts:", error);
      setMessage({ type: "error", text: "Failed to fetch parts" });
      setParts([]);
      setAvailableParts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When a part is selected, load its current accessories
  useEffect(() => {
    if (selectedPart?.accessories) {
      const accessoryIds = selectedPart.accessories.map((acc) => acc.id);
      setSelectedAccessories(accessoryIds);
    } else {
      setSelectedAccessories([]);
    }
  }, [selectedPart]);

  const handlePartSelect = (part: Part) => {
    setSelectedPart(part);
    setSearchTerm("");
    setMessage(null);
  };

  const handleToggleAccessory = (accessoryId: string) => {
    setSelectedAccessories((prev) => {
      if (prev.includes(accessoryId)) {
        return prev.filter((id) => id !== accessoryId);
      } else {
        return [...prev, accessoryId];
      }
    });
  };

  const handleSaveAccessories = async () => {
    if (!selectedPart) return;

    setSaving(true);
    setMessage(null);

    try {
      await axiosInstance.post(
        `/parts/${selectedPart.id}/accessories`,
        { accessoryIds: selectedAccessories },
        {
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken || "",
          },
        },
      );

      setMessage({
        type: "success",
        text: "Accessories updated successfully!",
      });

      // Refresh the parts list to get updated accessories
      await fetchParts();

      // Update the selected part with new data
      const updatedPart = parts.find((p) => p.id === selectedPart.id);
      if (updatedPart) {
        setSelectedPart(updatedPart);
      }
    } catch (error) {
      console.error("Error saving accessories:", error);
      setMessage({ type: "error", text: "Failed to save accessories" });
    } finally {
      setSaving(false);
    }
  };

  const getPartTitle = (part: Part) => {
    const enTranslation = part.translations.find((t) => t.language === "en");
    return enTranslation?.title || "Unnamed Part";
  };

  const filteredParts = parts.filter((part) =>
    getPartTitle(part).toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredAvailableParts = availableParts.filter((part) => {
    if (selectedPart && part.id === selectedPart.id) return false; // Don't show the selected part itself
    return getPartTitle(part)
      .toLowerCase()
      .includes(accessorySearchTerm.toLowerCase());
  });

  const getImageUrl = (part: Part) => {
    const firstImage = part.images?.[0];
    if (!firstImage) return "/512x512.png";
    return firstImage.startsWith("http")
      ? firstImage
      : `https://minio-api.cwx-dev.com/parts/${firstImage}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">
          Part Accessories
        </h2>
        <p className="text-zinc-400">
          Manage which parts are shown as accessories for each part
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-md ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel: Select Part */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-zinc-100">
                Select Part
              </h3>
              <span className="text-sm text-zinc-400">
                {filteredParts.length} part
                {filteredParts.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search parts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-zinc-700 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="border border-zinc-700 rounded-lg overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-zinc-400">
                  Loading parts...
                </div>
              ) : filteredParts.length === 0 ? (
                <div className="p-8 text-center text-zinc-400">
                  No parts found
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {filteredParts.map((part) => (
                    <button
                      key={part.id}
                      onClick={() => handlePartSelect(part)}
                      className={`w-full p-3 flex items-center gap-3 hover:bg-zinc-800 transition-colors text-left ${
                        selectedPart?.id === part.id
                          ? "bg-amber-500/5 border-l-4 border-amber-500"
                          : ""
                      }`}
                    >
                      <Image
                        src={getImageUrl(part)}
                        alt={getPartTitle(part)}
                        width={48}
                        height={48}
                        className="w-12 h-12 object-cover rounded"
                        unoptimized={true}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/512x512.png";
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-zinc-100 truncate">
                          {getPartTitle(part)}
                        </div>
                        <div className="text-sm text-zinc-400">
                          CHF {parseFloat(part.price).toFixed(2)}
                        </div>
                        {part.accessories && part.accessories.length > 0 && (
                          <div className="text-xs text-amber-400 mt-1">
                            {part.accessories.length} accessory(ies) linked
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Manage Accessories */}
        <div className="space-y-4">
          {selectedPart ? (
            <>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Package className="h-6 w-6 text-amber-400" />
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-100">
                      Accessories for: {getPartTitle(selectedPart)}
                    </h3>
                    <p className="text-sm text-zinc-400">
                      Select parts to show as accessories
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-zinc-300">
                    Available Parts
                  </span>
                  <span className="text-sm text-zinc-400">
                    {filteredAvailableParts.length} part
                    {filteredAvailableParts.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search available parts..."
                    value={accessorySearchTerm}
                    onChange={(e) => setAccessorySearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-zinc-700 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                <div className="border border-zinc-700 rounded-lg overflow-hidden">
                  <div className="max-h-80 overflow-y-auto">
                    {filteredAvailableParts.length === 0 ? (
                      <div className="p-8 text-center text-zinc-400">
                        No parts available
                      </div>
                    ) : (
                      <div className="divide-y divide-zinc-800">
                        {filteredAvailableParts.map((part) => {
                          const isSelected = selectedAccessories.includes(
                            part.id,
                          );
                          return (
                            <button
                              key={part.id}
                              onClick={() => handleToggleAccessory(part.id)}
                              className={`w-full p-3 flex items-center gap-3 hover:bg-zinc-800 transition-colors text-left ${
                                isSelected ? "bg-green-50" : ""
                              }`}
                            >
                              <Image
                                src={getImageUrl(part)}
                                alt={getPartTitle(part)}
                                width={40}
                                height={40}
                                className="w-10 h-10 object-cover rounded"
                                unoptimized={true}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = "/512x512.png";
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-zinc-100 truncate text-sm">
                                  {getPartTitle(part)}
                                </div>
                                <div className="text-xs text-zinc-400">
                                  CHF {parseFloat(part.price).toFixed(2)}
                                </div>
                              </div>
                              <div>
                                {isSelected ? (
                                  <div className="flex items-center justify-center w-6 h-6 bg-green-600 rounded-full">
                                    <svg
                                      className="w-4 h-4 text-white"
                                      fill="none"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path d="M5 13l4 4L19 7"></path>
                                    </svg>
                                  </div>
                                ) : (
                                  <div className="w-6 h-6 border-2 border-zinc-700 rounded-full"></div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-zinc-700">
                <div className="text-sm text-zinc-400">
                  {selectedAccessories.length} accessory(ies) selected
                </div>
                <button
                  onClick={handleSaveAccessories}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 disabled:bg-zinc-600 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Accessories
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="border-2 border-dashed border-zinc-700 rounded-lg p-12 text-center">
              <Package className="h-12 w-12 text-zinc-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-100 mb-2">
                No Part Selected
              </h3>
              <p className="text-zinc-400">
                Select a part from the left to manage its accessories
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
