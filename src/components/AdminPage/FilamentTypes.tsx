"use client";

import { useState, useEffect, useCallback } from "react";
import useAxios from "@/useAxios";
import { Trash2, Plus, Edit2, Save, X, RefreshCw, Power } from "lucide-react";

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface FilamentTypesProps {
  csrfToken: string;
}

interface FilamentType {
  id: string;
  name: string;
  description: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface FormData {
  name: string;
  description: string;
  active: boolean;
}

const FilamentTypes = ({ csrfToken }: FilamentTypesProps) => {
  const axios = useAxios();
  const [filamentTypes, setFilamentTypes] = useState<FilamentType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    active: true,
  });

  const fetchFilamentTypes = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.get<FilamentType[]>("/filament-types", {
        headers: {
          "X-CSRF-Token": csrfToken,
        },
      });
      setFilamentTypes(Array.isArray(response.data) ? response.data : []);
    } catch (err: unknown) {
      const axiosErr = err as ApiError;
      setError(
        axiosErr.response?.data?.message || "Failed to fetch filament types",
      );
    } finally {
      setLoading(false);
    }
  }, [axios, csrfToken]);

  useEffect(() => {
    fetchFilamentTypes();
  }, [fetchFilamentTypes]);

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setError("Please enter a filament type name");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await axios.post("/filament-types", formData, {
        headers: {
          "X-CSRF-Token": csrfToken,
        },
      });
      setSuccess("Filament type created successfully");
      setFormData({ name: "", description: "", active: true });
      setShowAddForm(false);
      fetchFilamentTypes();
    } catch (err: unknown) {
      const axiosErr = err as ApiError;
      setError(
        axiosErr.response?.data?.message || "Failed to create filament type",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string) => {
    const filament = filamentTypes.find((f) => f.id === id);
    if (!filament) return;

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await axios.put(
        `/filament-types/${id}`,
        {
          name: filament.name,
          description: filament.description,
        },
        {
          headers: {
            "X-CSRF-Token": csrfToken,
          },
        },
      );
      setSuccess("Filament type updated successfully");
      setEditingId(null);
      fetchFilamentTypes();
    } catch (err: unknown) {
      const axiosErr = err as ApiError;
      setError(
        axiosErr.response?.data?.message || "Failed to update filament type",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await axios.patch(`/filament-types/${id}/toggle`, null, {
        headers: {
          "X-CSRF-Token": csrfToken,
        },
      });
      setSuccess("Status toggled successfully");
      fetchFilamentTypes();
    } catch (err: unknown) {
      const axiosErr = err as ApiError;
      setError(axiosErr.response?.data?.message || "Failed to toggle status");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this filament type?")) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await axios.delete(`/filament-types/${id}`, {
        headers: {
          "X-CSRF-Token": csrfToken,
        },
      });
      setSuccess("Filament type deleted successfully");
      fetchFilamentTypes();
    } catch (err: unknown) {
      const axiosErr = err as ApiError;
      setError(
        axiosErr.response?.data?.message || "Failed to delete filament type",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (filament: FilamentType) => {
    setEditingId(filament.id);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    fetchFilamentTypes(); // Reset changes
  };

  const handleFieldChange = (
    id: string,
    field: keyof FilamentType,
    value: string,
  ) => {
    setFilamentTypes((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f)),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Filament Types Management</h3>
        <div className="flex gap-2">
          <button
            onClick={fetchFilamentTypes}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Add Filament Type
          </button>
        </div>
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

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold mb-3">Add New Filament Type</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., ABS, PLA+"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Brief description of this filament type"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, active: e.target.checked }))
                }
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <label
                htmlFor="active"
                className="text-sm font-medium text-gray-700"
              >
                Active
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Create
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({ name: "", description: "", active: true });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filament Types List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading && filamentTypes.length === 0 ? (
          <p className="p-4 text-gray-500">Loading...</p>
        ) : filamentTypes.length === 0 ? (
          <p className="p-4 text-gray-500">No filament types available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filamentTypes.map((filament) => (
                  <tr key={filament.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {editingId === filament.id ? (
                        <input
                          type="text"
                          value={filament.name}
                          onChange={(e) =>
                            handleFieldChange(
                              filament.id,
                              "name",
                              e.target.value,
                            )
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      ) : (
                        <span className="font-medium text-gray-900">
                          {filament.name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === filament.id ? (
                        <textarea
                          value={filament.description}
                          onChange={(e) =>
                            handleFieldChange(
                              filament.id,
                              "description",
                              e.target.value,
                            )
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                          rows={2}
                        />
                      ) : (
                        <span className="text-sm text-gray-600">
                          {filament.description || "-"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(filament.id)}
                        disabled={loading}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                          filament.active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        } hover:opacity-80 disabled:opacity-50`}
                      >
                        <Power className="h-3 w-3" />
                        {filament.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {editingId === filament.id ? (
                          <>
                            <button
                              onClick={() => handleUpdate(filament.id)}
                              disabled={loading}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-md disabled:opacity-50"
                              title="Save changes"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-2 text-gray-600 hover:bg-gray-50 rounded-md"
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(filament)}
                              disabled={loading}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-md disabled:opacity-50"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(filament.id)}
                              disabled={loading}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilamentTypes;
