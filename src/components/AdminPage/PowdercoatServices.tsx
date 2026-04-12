'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  AlertCircle,
  Edit,
  Trash2,
  Upload,
  X,
  Search,
  Filter,
  Eye,
  EyeOff,
} from 'lucide-react';
import NextImage from 'next/image';
import storage from '@/lib/storage';
import useAxios from '@/useAxios';

interface PowdercoatService {
  id: string;
  name: string;
  description: string;
  price: string;
  active: boolean;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

interface EditFormData {
  name: string;
  description: string;
  price: number;
  active: boolean;
}

interface Props {
  csrfToken: string;
}

interface Meta {
  total: number;
  limit: number;
  skip: number;
  totalPages: number;
}

interface ServicesResponse {
  data?: PowdercoatService[];
  meta?: Meta;
}

const PowdercoatServices: React.FC<Props> = ({ csrfToken }) => {
  const [services, setServices] = useState<PowdercoatService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [processingServiceId, setProcessingServiceId] = useState<string | null>(
    null
  );

  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [serviceToDelete, setServiceToDelete] =
    useState<PowdercoatService | null>(null);

  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<PowdercoatService | null>(
    null
  );
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const axiosInstance = useAxios();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<EditFormData>();

  // Fetch services
  const fetchServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (includeInactive) {
        params.append('includeInactive', 'true');
      }

      const response = await axiosInstance.get<
        PowdercoatService[] | ServicesResponse
      >(`/powdercoatservice?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${storage.getItem('access_token')}`,
          'X-CSRF-Token': csrfToken,
        },
      });

      // Handle both array response and object with data property
      const servicesData = Array.isArray(response.data)
        ? response.data
        : response.data.data || [];

      // Process images to ensure they have full URLs and filter out invalid ones
      const processedServices = servicesData.map((service) => ({
        ...service,
        images: service.images
          .map((img: string) => {
            if (img.startsWith('http')) {
              return img;
            } else {
              return `https://minio-api.cwx-dev.com/powdercoat-services/${img}`;
            }
          })
          .filter((img: string) => {
            // Only allow images from configured domains
            try {
              const url = new URL(img);
              return url.hostname === 'minio-api.cwx-dev.com';
            } catch {
              return false;
            }
          }),
      }));

      setServices(processedServices);
    } catch (err: unknown) {
      console.error('Error fetching powdercoat services:', err);
      if (
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data &&
        typeof err.response.data === 'object' &&
        'message' in err.response.data &&
        typeof err.response.data.message === 'string'
      ) {
        setError(err.response.data.message);
      } else {
        setError('Failed to load powdercoat services');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeInactive]);

  // Toggle service active status
  const toggleServiceActive = async (id: string) => {
    setProcessingServiceId(id);
    try {
      await axiosInstance.patch(
        `/powdercoatservice/${id}/toggle-active`,
        {},
        {
          headers: {
            Authorization: `Bearer ${storage.getItem('access_token')}`,
            'X-CSRF-Token': csrfToken,
          },
        }
      );

      // Update local state
      setServices(
        services.map((service) =>
          service.id === id ? { ...service, active: !service.active } : service
        )
      );

      const service = services.find((s) => s.id === id);
      if (service) {
        setSuccessMessage(
          `Service "${service.name}" ${
            !service.active ? 'activated' : 'deactivated'
          } successfully`
        );
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error('Error toggling service active status:', err);
      setError('Failed to update service status');
    } finally {
      setProcessingServiceId(null);
    }
  };

  // Delete service
  const deleteService = async () => {
    if (!serviceToDelete) return;

    setProcessingServiceId(serviceToDelete.id);
    try {
      await axiosInstance.delete(`/powdercoatservice/${serviceToDelete.id}`, {
        headers: {
          Authorization: `Bearer ${storage.getItem('access_token')}`,
          'X-CSRF-Token': csrfToken,
        },
      });

      setServices(services.filter((s) => s.id !== serviceToDelete.id));
      setSuccessMessage(
        `Service "${serviceToDelete.name}" deleted successfully`
      );
      setShowDeleteModal(false);
      setServiceToDelete(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error('Error deleting service:', err);
      setError('Failed to delete service');
    } finally {
      setProcessingServiceId(null);
    }
  };

  // Handle edit modal
  const openEditModal = (service: PowdercoatService) => {
    setServiceToEdit(service);
    setExistingImages([...service.images]);
    setUploadedImages([]);
    setNewImageFiles([]);

    // Set form values
    setValue('name', service.name);
    setValue('description', service.description);
    setValue('price', parseFloat(service.price));
    setValue('active', service.active);

    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setServiceToEdit(null);
    setExistingImages([]);
    setUploadedImages([]);
    setNewImageFiles([]);
    reset();
  };

  // Handle image upload for editing
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check if adding these files would exceed 20 images total
    if (existingImages.length + newImageFiles.length + files.length > 20) {
      setError('Maximum 20 images allowed per service');
      return;
    }

    setUploading(true);
    try {
      const newFiles = Array.from(files);
      setNewImageFiles((prev) => [...prev, ...newFiles]);

      // Create temporary URLs for preview
      const previewUrls = newFiles.map((file) => URL.createObjectURL(file));
      setUploadedImages((prev) => [...prev, ...previewUrls]);
    } catch (err) {
      console.error('Error handling images:', err);
      setError('Failed to process images');
    } finally {
      setUploading(false);
    }
  };

  const removeExistingImage = (index: number) => {
    const newExistingImages = [...existingImages];
    newExistingImages.splice(index, 1);
    setExistingImages(newExistingImages);
  };

  const removeNewImage = (index: number) => {
    const newImages = [...uploadedImages];
    const newFiles = [...newImageFiles];

    // Revoke the URL to free up memory
    URL.revokeObjectURL(newImages[index]);

    newImages.splice(index, 1);
    newFiles.splice(index, 1);

    setUploadedImages(newImages);
    setNewImageFiles(newFiles);
  };

  // Update service
  const onSubmitEdit = async (data: EditFormData) => {
    if (!serviceToEdit) return;

    if (existingImages.length + newImageFiles.length === 0) {
      setError('At least one image is required');
      return;
    }

    setProcessingServiceId(serviceToEdit.id);
    try {
      const formData = new FormData();

      // Append new image files
      newImageFiles.forEach((file) => {
        formData.append('images', file);
      });

      // Append existing images as JSON string
      if (existingImages.length > 0) {
        formData.append('existingImages', JSON.stringify(existingImages));
      }

      // Append other form data
      formData.append('name', data.name);
      formData.append('description', data.description);
      formData.append('price', data.price.toString());
      formData.append('active', Boolean(data.active).toString());

      const response = await axiosInstance.patch<PowdercoatService>(
        `/powdercoatservice/${serviceToEdit.id}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${storage.getItem('access_token')}`,
            'X-CSRF-Token': csrfToken,
          },
        }
      );

      // Update local state
      const updatedService = {
        ...response.data,
        images: response.data.images.map((img: string) => {
          if (img.startsWith('http')) {
            return img;
          } else {
            return `https://minio-api.cwx-dev.com/powdercoat-services/${img}`;
          }
        }),
      };

      setServices(
        services.map((service) =>
          service.id === serviceToEdit.id ? updatedService : service
        )
      );

      setSuccessMessage(`Service "${data.name}" updated successfully`);
      closeEditModal();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error('Error updating service:', err);
      setError('Failed to update service');
    } finally {
      setProcessingServiceId(null);
    }
  };

  // Filter services based on search term
  const filteredServices = services.filter(
    (service) =>
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled by filteredServices
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-semibold">Powdercoat Services</h2>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="flex flex-1 sm:flex-none gap-2 w-full sm:w-auto">
            <form
              onSubmit={handleSearch}
              className="relative flex-1 sm:flex-auto"
            >
              <input
                type="text"
                placeholder="Search services..."
                className="pl-9 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="h-4 w-4 absolute left-3 top-3 text-zinc-500" />
              <button type="submit" className="sr-only">
                Search
              </button>
            </form>

            <div className="relative inline-block">
              <button
                className="px-3 sm:px-4 py-2 border rounded-md bg-zinc-900 flex items-center gap-1 whitespace-nowrap"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filter</span>
              </button>
              {isFilterOpen && (
                <div className="mt-1 absolute right-0 w-56 bg-zinc-900 rounded-md shadow-lg z-10 border">
                  <div className="p-2 space-y-1">
                    <label className="flex items-center px-2 py-1 hover:bg-zinc-800 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeInactive}
                        onChange={(e) => setIncludeInactive(e.target.checked)}
                        className="mr-2"
                      />
                      Include inactive services
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="bg-amber-500/10 border border-purple-400 text-amber-300 p-3 rounded-md">
          {successMessage}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
        </div>
      ) : (
        <>
          {/* Services grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredServices.length > 0 ? (
              filteredServices.map((service) => (
                <div
                  key={service.id}
                  className={`border rounded-lg overflow-hidden bg-zinc-900 ${
                    !service.active ? 'opacity-75' : ''
                  }`}
                >
                  <div className="h-48 sm:h-40 relative overflow-hidden">
                    {service.images && service.images.length > 0 ? (
                      (() => {
                        try {
                          const imageUrl = service.images[0];
                          const url = new URL(imageUrl);
                          // Only render if from allowed domain
                          if (url.hostname === 'minio-api.cwx-dev.com') {
                            return (
                              <NextImage
                                width={400}
                                height={400}
                                src={imageUrl}
                                alt={service.name}
                                className="object-cover w-full h-full"
                                unoptimized={true}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = '/512x512.png';
                                }}
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                priority={
                                  filteredServices.findIndex(
                                    (s) => s.id === service.id
                                  ) < 4
                                }
                              />
                            );
                          }
                        } catch (e) {
                          console.warn(
                            'Invalid image URL:',
                            service.images[0],
                            e
                          );
                        }
                        // Fallback for invalid URLs
                        return (
                          <div className="w-full h-full bg-zinc-700 flex items-center justify-center">
                            <span className="text-zinc-400">Invalid image</span>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="w-full h-full bg-zinc-700 flex items-center justify-center">
                        <span className="text-zinc-400">No image</span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 sm:p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-sm sm:text-base text-zinc-100 line-clamp-2">
                        {service.name}
                      </h3>
                      <div className="flex items-center gap-1 ml-2">
                        {service.active ? (
                          <div
                            className="w-2 h-2 bg-green-500 rounded-full"
                            title="Active"
                          />
                        ) : (
                          <div
                            className="w-2 h-2 bg-red-500 rounded-full"
                            title="Inactive"
                          />
                        )}
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-zinc-400 line-clamp-2">
                      {service.description}
                    </p>

                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className="font-semibold text-amber-400">
                        CHF {parseFloat(service.price).toFixed(2)}
                      </span>
                      <span className="text-zinc-400">
                        {new Date(service.updatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="pt-2 flex justify-between border-t mt-2">
                      <button
                        onClick={() => toggleServiceActive(service.id)}
                        disabled={processingServiceId === service.id}
                        className={`p-2 rounded-md ${
                          service.active
                            ? 'text-orange-600 hover:bg-orange-50'
                            : 'text-green-600 hover:bg-green-50'
                        } disabled:opacity-50`}
                        title={service.active ? 'Deactivate' : 'Activate'}
                      >
                        {service.active ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={() => openEditModal(service)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          setServiceToDelete(service);
                          setShowDeleteModal(true);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full flex justify-center items-center h-64 bg-zinc-800 rounded-lg">
                <p className="text-zinc-400">No services found</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && serviceToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-lg max-w-md w-full p-4 sm:p-6">
            <h3 className="text-md sm:text-lg font-medium text-zinc-100 mb-3 sm:mb-4">
              Confirm Deletion
            </h3>
            <p className="text-sm sm:text-base text-zinc-400 mb-4 sm:mb-6">
              Are you sure you want to delete the service &quot;
              {serviceToDelete.name}&quot;? This action cannot be undone.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setServiceToDelete(null);
                }}
                className="px-3 sm:px-4 py-2 border border-zinc-700 rounded-md text-zinc-300 hover:bg-zinc-800 text-sm sm:text-base"
                disabled={processingServiceId === serviceToDelete?.id}
              >
                Cancel
              </button>

              <button
                onClick={deleteService}
                className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center text-sm sm:text-base"
                disabled={processingServiceId === serviceToDelete?.id}
              >
                {processingServiceId === serviceToDelete?.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit service modal */}
      {showEditModal && serviceToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-zinc-900 border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-medium text-zinc-100">
                Edit Service: {serviceToEdit.name}
              </h3>
              <button
                onClick={closeEditModal}
                className="text-zinc-500 hover:text-zinc-400"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit(onSubmitEdit)}
              className="p-6 space-y-6"
            >
              {/* Service Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-zinc-100">
                  Service Information
                </h4>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Service Name *
                  </label>
                  <input
                    type="text"
                    className={`w-full rounded-md border ${
                      errors.name ? 'border-red-300' : 'border-zinc-700'
                    } px-3 py-2`}
                    {...register('name', {
                      required: 'Service name is required',
                    })}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Description *
                  </label>
                  <textarea
                    rows={3}
                    className={`w-full rounded-md border ${
                      errors.description ? 'border-red-300' : 'border-zinc-700'
                    } px-3 py-2`}
                    {...register('description', {
                      required: 'Description is required',
                    })}
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.description.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                      Price (CHF) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={`w-full rounded-md border ${
                        errors.price ? 'border-red-300' : 'border-zinc-700'
                      } px-3 py-2`}
                      {...register('price', {
                        required: 'Price is required',
                        min: { value: 0, message: 'Price must be positive' },
                      })}
                    />
                    {errors.price && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.price.message}
                      </p>
                    )}
                  </div>

                  <div className="flex items-end">
                    <div className="flex items-center h-full pb-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-zinc-700 text-amber-400 focus:ring-purple-600"
                        {...register('active')}
                      />
                      <label className="ml-2 text-sm text-zinc-300">
                        Active (visible to customers)
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Images Section */}
              <div className="space-y-4">
                <h4 className="font-medium text-zinc-100">Images</h4>

                {/* Existing Images */}
                {existingImages.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-zinc-300 mb-2">
                      Current Images ({existingImages.length})
                    </h5>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {existingImages.map((image, index) => {
                        // Validate image URL before rendering
                        try {
                          const url = new URL(image);
                          if (url.hostname !== 'minio-api.cwx-dev.com') {
                            console.warn(
                              'Skipping image from unauthorized domain:',
                              image
                            );
                            return null;
                          }
                        } catch (e) {
                          console.warn('Invalid image URL:', image, e);
                          return null;
                        }

                        return (
                          <div key={index} className="relative">
                            <div className="aspect-square relative overflow-hidden rounded border">
                              <NextImage
                                src={image}
                                alt={`Existing ${index + 1}`}
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) 33vw, 25vw"
                                onError={(e) => {
                                  console.warn('Failed to load image:', image);
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeExistingImage(index)}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 text-xs hover:bg-red-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Upload New Images */}
                <div>
                  <div className="border-2 border-dashed border-zinc-700 rounded-lg p-4 text-center">
                    <input
                      type="file"
                      id="edit-images"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <label htmlFor="edit-images" className="cursor-pointer">
                      <div className="flex flex-col items-center">
                        <Upload className="h-8 w-8 text-zinc-500" />
                        <p className="mt-2 text-xs text-zinc-400">
                          Add more images
                        </p>
                        <p className="text-xs text-zinc-400">
                          Total limit: 20 images
                        </p>
                      </div>
                    </label>
                  </div>

                  {uploading && (
                    <div className="flex justify-center mt-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-amber-500"></div>
                    </div>
                  )}

                  {uploadedImages.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-sm font-medium text-zinc-300 mb-2">
                        New Images ({uploadedImages.length})
                      </h5>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {uploadedImages.map((image, index) => (
                          <div key={index} className="relative">
                            <div className="aspect-square relative overflow-hidden rounded border">
                              <NextImage
                                src={image}
                                alt={`New ${index + 1}`}
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) 33vw, 25vw"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeNewImage(index)}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 text-xs hover:bg-red-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-zinc-400">
                  Total images: {existingImages.length + newImageFiles.length}
                  /20
                  {existingImages.length + newImageFiles.length === 0 &&
                    ' (At least one image required)'}
                </p>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 border border-zinc-700 rounded-md text-zinc-300 hover:bg-zinc-800"
                  disabled={processingServiceId === serviceToEdit.id}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    processingServiceId === serviceToEdit.id ||
                    existingImages.length + newImageFiles.length === 0
                  }
                  className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:bg-zinc-600 disabled:cursor-not-allowed flex items-center"
                >
                  {processingServiceId === serviceToEdit.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    'Update Service'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PowdercoatServices;
