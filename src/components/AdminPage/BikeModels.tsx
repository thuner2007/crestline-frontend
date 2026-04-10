"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import useAxios from "@/useAxios";

interface BikeModel {
  id: string;
  manufacturer: string;
  model: string;
  year: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    parts: number;
  };
}

interface BikeModelsProps {
  csrfToken: string | null;
}

export default function BikeModels({ csrfToken }: BikeModelsProps) {
  const [bikeModels, setBikeModels] = useState<BikeModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingModel, setEditingModel] = useState<BikeModel | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [filterManufacturer, setFilterManufacturer] = useState("");
  const [manufacturers, setManufacturers] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    manufacturer: "",
    model: "",
    year: "",
    active: true,
  });

  const axiosInstance = useAxios();

  const fetchBikeModels = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (filterManufacturer) params.append("manufacturer", filterManufacturer);

      const { data } = await axiosInstance.get<BikeModel[]>(
        `/bike-models?${params.toString()}`
      );
      setBikeModels(data);
    } catch (error) {
      console.error("Failed to fetch bike models:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchManufacturers = async () => {
    try {
      const { data } = await axiosInstance.get<string[]>(
        "/bike-models/manufacturers"
      );
      setManufacturers(data);
    } catch (error) {
      console.error("Failed to fetch manufacturers:", error);
    }
  };

  useEffect(() => {
    fetchBikeModels();
    fetchManufacturers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterManufacturer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        manufacturer: formData.manufacturer,
        model: formData.model,
        year: formData.year ? parseInt(formData.year) : null,
        active: formData.active,
      };

      if (editingModel) {
        await axiosInstance.patch(`/bike-models/${editingModel.id}`, payload, {
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken || "",
          },
        });
      } else {
        await axiosInstance.post("/bike-models", payload, {
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken || "",
          },
        });
      }

      setShowModal(false);
      setEditingModel(null);
      setFormData({ manufacturer: "", model: "", year: "", active: true });
      fetchBikeModels();
      fetchManufacturers();
    } catch (error) {
      console.error("Failed to save bike model:", error);
      alert("Failed to save bike model");
    }
  };

  const handleEdit = (model: BikeModel) => {
    setEditingModel(model);
    setFormData({
      manufacturer: model.manufacturer,
      model: model.model,
      year: model.year?.toString() || "",
      active: model.active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this bike model?")) return;

    try {
      await axiosInstance.delete(`/bike-models/${id}`, {
        headers: {
          "X-CSRF-Token": csrfToken || "",
        },
      });
      fetchBikeModels();
      fetchManufacturers();
    } catch (error) {
      console.error("Failed to delete bike model:", error);
      alert("Failed to delete bike model");
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await axiosInstance.patch(`/bike-models/${id}/toggle-active`, {}, {
        headers: {
          "X-CSRF-Token": csrfToken || "",
        },
      });
      fetchBikeModels();
    } catch (error) {
      console.error("Failed to toggle bike model status:", error);
      alert("Failed to toggle bike model status");
    }
  };

  const openAddModal = () => {
    setEditingModel(null);
    setFormData({ manufacturer: "", model: "", year: "", active: true });
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Bike Models</h2>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <Plus className="h-5 w-5" />
          Add Bike Model
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as "all" | "active" | "inactive")}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Manufacturer
          </label>
          <select
            value={filterManufacturer}
            onChange={(e) => setFilterManufacturer(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Manufacturers</option>
            {manufacturers.map((mfr) => (
              <option key={mfr} value={mfr}>
                {mfr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bike Models Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Manufacturer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Model
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Year
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Parts
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bikeModels.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No bike models found
                </td>
              </tr>
            ) : (
              bikeModels.map((model) => (
                <tr key={model.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {model.manufacturer}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {model.model}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {model.year || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {model._count?.parts || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        model.active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {model.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleToggleActive(model.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title={model.active ? "Deactivate" : "Activate"}
                      >
                        {model.active ? (
                          <ToggleRight className="h-5 w-5" />
                        ) : (
                          <ToggleLeft className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(model)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(model.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">
              {editingModel ? "Edit Bike Model" : "Add Bike Model"}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manufacturer *
                  </label>
                  <input
                    type="text"
                    value={formData.manufacturer}
                    onChange={(e) =>
                      setFormData({ ...formData, manufacturer: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model *
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) =>
                      setFormData({ ...formData, model: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year (optional)
                  </label>
                  <input
                    type="number"
                    min="1900"
                    max="2100"
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({ ...formData, year: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) =>
                      setFormData({ ...formData, active: e.target.checked })
                    }
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="active"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Active
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingModel(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  {editingModel ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
