"use client";

import { useState, useEffect } from "react";
import { X, Bike } from "lucide-react";
import useAxios from "@/useAxios";

interface BikeModel {
  id: string;
  manufacturer: string;
  model: string;
  year: number | null;
  active: boolean;
}

interface AssignBikeModelsProps {
  partId: string;
  partTitle: string;
  currentBikeModels?: BikeModel[];
  onClose: () => void;
  onSuccess: () => void;
  csrfToken: string | null;
}

export default function AssignBikeModels({
  partId,
  partTitle,
  currentBikeModels = [],
  onClose,
  onSuccess,
  csrfToken,
}: AssignBikeModelsProps) {
  const [bikeModels, setBikeModels] = useState<BikeModel[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    currentBikeModels.map((bm) => bm.id)
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const axiosInstance = useAxios();

  useEffect(() => {
    fetchBikeModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBikeModels = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get<BikeModel[]>(
        "/bike-models?status=active"
      );
      setBikeModels(data);
    } catch (error) {
      console.error("Failed to fetch bike models:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await axiosInstance.post(
        `/parts/${partId}/bike-models`,
        {
          bikeModelIds: selectedIds,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken || "",
          },
        }
      );
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to assign bike models:", error);
      alert("Failed to assign bike models");
    } finally {
      setSaving(false);
    }
  };

  const filteredBikeModels = bikeModels.filter(
    (bm) =>
      bm.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bm.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-zinc-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Bike className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-zinc-100">
                Assign Bike Models
              </h3>
              <p className="text-sm text-zinc-400 mt-1">{partTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-400"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-zinc-700">
          <input
            type="text"
            placeholder="Search by manufacturer or model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Bike Models List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
            </div>
          ) : filteredBikeModels.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              No bike models found
            </div>
          ) : (
            <div className="space-y-2">
              {filteredBikeModels.map((bikeModel) => {
                const isSelected = selectedIds.includes(bikeModel.id);
                return (
                  <div
                    key={bikeModel.id}
                    onClick={() => handleToggle(bikeModel.id)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? "border-amber-500 bg-amber-500/5"
                        : "border-zinc-700 hover:border-zinc-700 hover:bg-zinc-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                            isSelected
                              ? "border-amber-500 bg-amber-500"
                              : "border-zinc-700"
                          }`}
                        >
                          {isSelected && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-100">
                            {bikeModel.manufacturer} {bikeModel.model}
                          </p>
                          {bikeModel.year && (
                            <p className="text-sm text-zinc-400">
                              Year: {bikeModel.year}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-700 flex items-center justify-between">
          <div className="text-sm text-zinc-400">
            {selectedIds.length} bike model{selectedIds.length !== 1 ? "s" : ""}{" "}
            selected
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-zinc-700 rounded-lg text-zinc-300 hover:bg-zinc-800"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
