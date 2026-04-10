"use client";

import { useState, useEffect } from "react";
import useAxios from "@/useAxios";
import { Trash2, Plus, Save, RefreshCw } from "lucide-react";

interface FilamentColorsProps {
  csrfToken: string;
}

interface FilamentColor {
  id: string;
  color: string;
}

interface FilamentType {
  id: string;
  name: string;
  description: string;
  active: boolean;
}

interface ColorsResponse {
  colors?: FilamentColor[];
}

const FilamentColors = ({ csrfToken }: FilamentColorsProps) => {
  const axios = useAxios();
  const [filamentTypes, setFilamentTypes] = useState<FilamentType[]>([]);
  const [selectedFilament, setSelectedFilament] = useState<string>("");
  const [colors, setColors] = useState<FilamentColor[]>([]);
  const [newColor, setNewColor] = useState("");
  const [bulkColors, setBulkColors] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Helper function to convert color names to CSS values
  const getColorStyle = (colorName: string): string => {
    // If it's already a hex code, use it
    if (colorName.startsWith("#")) {
      return colorName;
    }

    // Handle transparent- prefix
    if (colorName.startsWith("transparent-")) {
      const baseColor = colorName.replace("transparent-", "");
      // Map common color names to their RGBA values with transparency
      const transparentColorMap: Record<string, string> = {
        red: "rgba(239, 68, 68, 0.5)",
        blue: "rgba(59, 130, 246, 0.5)",
        green: "rgba(34, 197, 94, 0.5)",
        yellow: "rgba(234, 179, 8, 0.5)",
        purple: "rgba(168, 85, 247, 0.5)",
        pink: "rgba(236, 72, 153, 0.5)",
        orange: "rgba(249, 115, 22, 0.5)",
        black: "rgba(0, 0, 0, 0.5)",
        white: "rgba(255, 255, 255, 0.8)",
        gray: "rgba(107, 114, 128, 0.5)",
        cyan: "rgba(6, 182, 212, 0.5)",
        lime: "rgba(132, 204, 22, 0.5)",
        indigo: "rgba(99, 102, 241, 0.5)",
      };
      return transparentColorMap[baseColor] || baseColor;
    }

    // Return the color name as-is for CSS standard colors
    return colorName;
  };

  // Fetch filament types
  useEffect(() => {
    fetchFilamentTypes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch colors when filament type changes
  useEffect(() => {
    if (selectedFilament) {
      fetchColors();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilament]);

  const fetchFilamentTypes = async () => {
    try {
      setLoading(true);
      const response = await axios.get<FilamentType[]>("/filament-types", {
        headers: {
          "X-CSRF-Token": csrfToken,
        },
      });
      const types = Array.isArray(response.data) ? response.data : [];
      setFilamentTypes(types);
      if (types.length > 0) {
        setSelectedFilament(types[0].name);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || "Failed to fetch filament types");
    } finally {
      setLoading(false);
    }
  };

  const fetchColors = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.get<ColorsResponse | FilamentColor[]>(
        `/available-colors/filament/${selectedFilament}`,
        {
          headers: {
            "X-CSRF-Token": csrfToken,
          },
        },
      );
      const colorsList = Array.isArray(response.data)
        ? response.data
        : (response.data as ColorsResponse).colors || [];
      setColors(colorsList);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || "Failed to fetch colors");
    } finally {
      setLoading(false);
    }
  };

  const handleAddColor = async () => {
    if (!newColor.trim()) {
      setError("Please enter a color name");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await axios.post(
        `/available-colors/filament/${selectedFilament}`,
        { color: newColor.trim() },
        {
          headers: {
            "X-CSRF-Token": csrfToken,
          },
        },
      );
      setSuccess("Color added successfully");
      setNewColor("");
      fetchColors();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || "Failed to add color");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteColor = async (colorId: string) => {
    if (!confirm("Are you sure you want to delete this color?")) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await axios.delete(
        `/available-colors/filament/${selectedFilament}/${colorId}`,
        {
          headers: {
            "X-CSRF-Token": csrfToken,
          },
        },
      );
      setSuccess("Color deleted successfully");
      fetchColors();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || "Failed to delete color");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpdate = async () => {
    if (!bulkColors.trim()) {
      setError("Please enter colors (comma-separated)");
      return;
    }

    const colorArray = bulkColors
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (colorArray.length === 0) {
      setError("Please enter at least one color");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await axios.put(
        `/available-colors/filament/${selectedFilament}`,
        { colors: colorArray },
        {
          headers: {
            "X-CSRF-Token": csrfToken,
          },
        },
      );
      setSuccess("Colors updated successfully");
      setBulkColors("");
      fetchColors();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || "Failed to update colors");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Filament Colors Management</h3>
        <button
          onClick={fetchColors}
          disabled={loading || !selectedFilament}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filament Type Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Filament Type
        </label>
        <select
          value={selectedFilament}
          onChange={(e) => setSelectedFilament(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          disabled={loading}
        >
          {filamentTypes.map((type) => (
            <option key={type.id} value={type.name}>
              {type.name}
            </option>
          ))}
        </select>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          {success}
        </div>
      )}

      {/* Add Single Color */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold mb-3">Add Single Color</h4>
        <div className="flex gap-2">
          <input
            type="text"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            placeholder="Enter color name (e.g., transparent-blue)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={loading || !selectedFilament}
            onKeyPress={(e) => e.key === "Enter" && handleAddColor()}
          />
          <button
            onClick={handleAddColor}
            disabled={loading || !selectedFilament}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>

      {/* Bulk Update */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold mb-3">Bulk Update Colors</h4>
        <p className="text-sm text-gray-600 mb-2">
          Enter comma-separated color names. This will replace all existing
          colors.
        </p>
        <div className="space-y-2">
          <textarea
            value={bulkColors}
            onChange={(e) => setBulkColors(e.target.value)}
            placeholder="black, white, red, blue, transparent-green"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            rows={3}
            disabled={loading || !selectedFilament}
          />
          <button
            onClick={handleBulkUpdate}
            disabled={loading || !selectedFilament}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Update All Colors
          </button>
        </div>
      </div>

      {/* Current Colors */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold mb-3">
          Current Colors for {selectedFilament}
        </h4>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : colors.length === 0 ? (
          <p className="text-gray-500">No colors available</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {colors.map((colorItem) => (
              <div
                key={colorItem.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded border border-gray-300"
                    style={{
                      backgroundColor: getColorStyle(colorItem.color),
                    }}
                    title={colorItem.color}
                  />
                  <div>
                    <span className="font-medium text-sm">{colorItem.color}</span>
                    <p className="text-xs text-gray-400">ID: {colorItem.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteColor(colorItem.id)}
                  disabled={loading}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
                  title="Delete color"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilamentColors;
