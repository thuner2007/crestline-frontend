"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { AlertCircle, Upload, X } from "lucide-react";
import NextImage from "next/image";
import storage from "@/lib/storage";
import useAxios from "@/useAxios";

interface FormData {
  name: string;
  description: string;
  price: number;
  active: boolean;
}

interface Props {
  csrfToken: string;
}

const AddPowdercoatService: React.FC<Props> = ({ csrfToken }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const axiosInstance = useAxios();
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: "",
      description: "",
      price: 50.0,
      active: true,
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check if adding these files would exceed 20 images
    if (imageFiles.length + files.length > 20) {
      setError("Maximum 20 images allowed per service");
      return;
    }

    setUploading(true);
    try {
      // Store the image files for later submission
      const newFiles = Array.from(files);
      setImageFiles((prev) => [...prev, ...newFiles]);

      // Create temporary URLs for preview
      const previewUrls = newFiles.map((file) => URL.createObjectURL(file));
      setUploadedImages((prev) => [...prev, ...previewUrls]);
    } catch (err) {
      console.error("Error handling images:", err);
      setError("Failed to process images");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...uploadedImages];
    const newFiles = [...imageFiles];

    // Revoke the URL to free up memory
    URL.revokeObjectURL(newImages[index]);

    newImages.splice(index, 1);
    newFiles.splice(index, 1);

    setUploadedImages(newImages);
    setImageFiles(newFiles);
  };

  const onSubmit = async (data: FormData) => {
    if (imageFiles.length === 0) {
      setError("At least one image is required");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Create FormData object for submitting both data and files
      const formData = new FormData();

      // Append each image file
      imageFiles.forEach((file) => {
        formData.append("images", file);
      });

      // Handle form fields
      formData.append("name", data.name);
      formData.append("description", data.description);
      formData.append("price", data.price.toString());
      formData.append("active", Boolean(data.active).toString());

      // Log the form data for debugging
      console.log("Form data before submission:");
      for (const [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
      }

      // Submit the form with all data and images
      await axiosInstance.post<{ success: boolean }>(
        "/powdercoatservice",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${storage.getItem("access_token")}`,
            "X-CSRF-Token": csrfToken,
          },
        }
      );

      setSuccess("Powdercoat service created successfully!");
      reset();
      // Clean up image previews
      uploadedImages.forEach((url) => URL.revokeObjectURL(url));
      setUploadedImages([]);
      setImageFiles([]);
    } catch (err: unknown) {
      console.error("Error creating powdercoat service:", err);

      // Type guard for axios-like errors
      if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "status" in err.response
      ) {
        const message =
          err.response &&
          typeof err.response === "object" &&
          "data" in err.response &&
          err.response.data &&
          typeof err.response.data === "object" &&
          "message" in err.response.data
            ? String((err.response.data as { message: unknown }).message)
            : "";
        setError(message || "Failed to create powdercoat service");
      } else if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code === "NETWORK_ERROR"
      ) {
        setError("Network error. Please check your connection.");
      } else {
        setError("Failed to create powdercoat service");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Add New Powdercoat Service</h2>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 flex items-center gap-3">
          <AlertCircle className="text-red-500" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg bg-amber-500/10 p-4 flex items-center gap-3">
          <AlertCircle className="text-amber-400" />
          <p className="text-amber-300">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-700">
          <h3 className="text-lg font-medium mb-4">Service Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div className="md:col-span-2">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-zinc-300 mb-1"
              >
                Service Name *
              </label>
              <input
                id="name"
                type="text"
                className={`w-full rounded-md border ${
                  errors.name ? "border-red-300" : "border-zinc-700"
                } px-3 py-2`}
                {...register("name", {
                  required: "Service name is required",
                })}
                placeholder="Enter service name (e.g., Premium Powdercoating)"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label
                htmlFor="description"
                className="block text-sm font-medium text-zinc-300 mb-1"
              >
                Description *
              </label>
              <textarea
                id="description"
                rows={4}
                className={`w-full rounded-md border ${
                  errors.description ? "border-red-300" : "border-zinc-700"
                } px-3 py-2`}
                {...register("description", {
                  required: "Description is required",
                })}
                placeholder="Describe the powdercoat service details, process, and benefits..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Price */}
            <div>
              <label
                htmlFor="price"
                className="block text-sm font-medium text-zinc-300 mb-1"
              >
                Price (CHF) *
              </label>
              <input
                id="price"
                type="number"
                step="0.01"
                min="0"
                className={`w-full rounded-md border ${
                  errors.price ? "border-red-300" : "border-zinc-700"
                } px-3 py-2`}
                {...register("price", {
                  required: "Price is required",
                  min: { value: 0, message: "Price must be positive" },
                })}
              />
              {errors.price && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.price.message}
                </p>
              )}
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-center">
              <div className="flex items-center h-full">
                <input
                  id="active"
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-700 text-amber-400 focus:ring-purple-600"
                  {...register("active")}
                />
                <label htmlFor="active" className="ml-2 text-sm text-zinc-300">
                  Active (visible to customers)
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Images Section */}
        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-700">
          <h3 className="text-lg font-medium mb-4">Service Images *</h3>

          <div className="space-y-4">
            <div className="border-2 border-dashed border-zinc-700 rounded-lg p-6 text-center">
              <input
                type="file"
                id="images"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <label htmlFor="images" className="cursor-pointer">
                <div className="flex flex-col items-center">
                  <Upload className="h-12 w-12 text-zinc-500" />
                  <p className="mt-2 text-sm text-zinc-400">
                    Click to upload images
                  </p>
                  <p className="text-xs text-zinc-400">
                    PNG, JPG, GIF up to 500MB each (max 20 images)
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    At least one image is required
                  </p>
                </div>
              </label>
            </div>

            {uploading && (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
              </div>
            )}

            {uploadedImages.length > 0 && (
              <div>
                <h4 className="font-medium text-zinc-200 mb-3">
                  Uploaded Images ({uploadedImages.length}/20)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="relative">
                      <div className="aspect-square relative overflow-hidden rounded-lg border border-zinc-700">
                        <NextImage
                          src={image}
                          alt={`Preview ${index + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || imageFiles.length === 0}
            className="px-6 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:bg-zinc-600 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              "Create Powdercoat Service"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddPowdercoatService;
