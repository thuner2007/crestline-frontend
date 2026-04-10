"use client";

import { useState, useEffect } from "react";
import { Bike, X } from "lucide-react";
import useAxios from "@/useAxios";

interface BikeModel {
  id: string;
  manufacturer: string;
  model: string;
  year: number | null;
  active: boolean;
}

interface BikeSelectorProps {
  selectedBikeId: string | null;
  onBikeSelect: (bikeId: string | null) => void;
  locale?: string;
}

export default function BikeSelector({
  selectedBikeId,
  onBikeSelect,
  locale = "en",
}: BikeSelectorProps) {
  const [bikeModels, setBikeModels] = useState<BikeModel[]>([]);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const axiosInstance = useAxios();

  const selectedBike = bikeModels.find((b) => b.id === selectedBikeId);

  // Fetch selected bike details if we have a bike ID but no bike data
  useEffect(() => {
    const fetchSelectedBike = async () => {
      if (selectedBikeId && !selectedBike) {
        try {
          const { data } = await axiosInstance.get<BikeModel>(
            `/bike-models/${selectedBikeId}`
          );
          setBikeModels((prev) => {
            // Only add if not already in the list
            if (!prev.find((b) => b.id === data.id)) {
              return [...prev, data];
            }
            return prev;
          });
        } catch (error) {
          console.error("Failed to fetch selected bike:", error);
        }
      }
    };

    fetchSelectedBike();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBikeId]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedBikeId = localStorage.getItem("selectedBikeId");
    if (savedBikeId && !selectedBikeId) {
      onBikeSelect(savedBikeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const fetchBikeModels = async (manufacturer?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ status: "active" });
      if (manufacturer) {
        params.append("manufacturer", manufacturer);
      }
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

  useEffect(() => {
    fetchManufacturers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedManufacturer) {
      fetchBikeModels(selectedManufacturer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedManufacturer]);

  const handleManufacturerChange = (manufacturer: string) => {
    setSelectedManufacturer(manufacturer);
    onBikeSelect(null); // Reset bike selection when manufacturer changes
  };

  const handleBikeSelect = (bikeId: string) => {
    onBikeSelect(bikeId);
    localStorage.setItem("selectedBikeId", bikeId);
  };

  const handleClearSelection = () => {
    onBikeSelect(null);
    localStorage.removeItem("selectedBikeId");
    setSelectedManufacturer("");
    setBikeModels([]);
  };

  const getTranslation = (key: string): string => {
    const translations: Record<string, Record<string, string>> = {
      selectYourBike: {
        en: "Select Your Bike",
        de: "Wähle dein Motorrad",
        fr: "Sélectionnez votre moto",
        it: "Seleziona la tua moto",
      },
      manufacturer: {
        en: "Manufacturer",
        de: "Hersteller",
        fr: "Fabricant",
        it: "Produttore",
      },
      model: {
        en: "Model",
        de: "Modell",
        fr: "Modèle",
        it: "Modello",
      },
      selectManufacturer: {
        en: "Select manufacturer...",
        de: "Hersteller wählen...",
        fr: "Sélectionner le fabricant...",
        it: "Seleziona produttore...",
      },
      selectModel: {
        en: "Select model...",
        de: "Modell wählen...",
        fr: "Sélectionner le modèle...",
        it: "Seleziona modello...",
      },
      clearSelection: {
        en: "Clear",
        de: "Löschen",
        fr: "Effacer",
        it: "Cancella",
      },
      showingPartsFor: {
        en: "Showing parts for",
        de: "Zeige Teile für",
        fr: "Affichage des pièces pour",
        it: "Mostrando parti per",
      },
    };

    return translations[key]?.[locale] || translations[key]?.["en"] || key;
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4 md:p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Bike className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
        </div>
        <h3 className="text-lg md:text-xl font-semibold text-gray-900">
          {getTranslation("selectYourBike")}
        </h3>
      </div>

      {selectedBike ? (
        <div className="bg-white rounded-lg p-4 border-2 border-purple-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">
                {getTranslation("showingPartsFor")}:
              </p>
              <p className="text-lg font-bold text-purple-700">
                {selectedBike.manufacturer} {selectedBike.model}
                {selectedBike.year && ` (${selectedBike.year})`}
              </p>
            </div>
            <button
              onClick={handleClearSelection}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
              {getTranslation("clearSelection")}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Manufacturer Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {getTranslation("manufacturer")}
            </label>
            <select
              value={selectedManufacturer}
              onChange={(e) => handleManufacturerChange(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900"
            >
              <option value="">
                {getTranslation("selectManufacturer")}
              </option>
              {manufacturers.map((mfr) => (
                <option key={mfr} value={mfr}>
                  {mfr}
                </option>
              ))}
            </select>
          </div>

          {/* Model Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {getTranslation("model")}
            </label>
            <select
              value={selectedBikeId || ""}
              onChange={(e) => handleBikeSelect(e.target.value)}
              disabled={!selectedManufacturer || loading}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">
                {getTranslation("selectModel")}
              </option>
              {bikeModels.map((bike) => (
                <option key={bike.id} value={bike.id}>
                  {bike.model}
                  {bike.year && ` (${bike.year})`}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
