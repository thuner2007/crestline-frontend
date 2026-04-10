import { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  X,
  Save,
  Loader,
  Upload,
  ImageIcon,
} from 'lucide-react';
import storage from '@/lib/storage';
import useAxios from '@/useAxios';
import Image from 'next/image';

interface PartGroupsProps {
  csrfToken: string;
}

interface Translation {
  language: string;
  title: string;
}

interface PartGroup {
  id: string;
  name?: string;
  image?: string;
  translations: Translation[];
  createdAt: string;
}

interface PartGroupFormData {
  name?: string;
  image?: string;
  translations: {
    en: { title: string };
    de: { title: string };
    fr: { title: string };
    it: { title: string };
  };
}

const PartGroups: React.FC<PartGroupsProps> = ({ csrfToken }) => {
  // State for part groups data
  const [partGroups, setPartGroups] = useState<PartGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // State for modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);

  const processImageUrl = (imageUrl: string | undefined): string | null => {
    if (!imageUrl) return null;

    if (imageUrl.startsWith('http')) {
      return imageUrl;
    } else {
      return `https://minio-api.cwx-dev.com/part-groups/${imageUrl}`; // Changed from "parts" to "part-groups"
    }
  };

  const axiosInstance = useAxios();

  // Selected items for edit/delete operations
  const [selectedPartGroup, setSelectedPartGroup] = useState<PartGroup | null>(
    null
  );

  // Form data
  const [formData, setFormData] = useState<PartGroupFormData>({
    name: '',
    image: '',
    translations: {
      en: { title: '' },
      de: { title: '' },
      fr: { title: '' },
      it: { title: '' },
    },
  });

  // Image upload
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Process state
  const [processing, setProcessing] = useState(false);

  // Fetch part groups data
  const fetchPartGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get<PartGroup[]>(
        '/groups/part-groups',
        {
          headers: {
            Authorization: `Bearer ${storage.getItem('access_token')}`,
            'X-CSRF-Token': csrfToken,
          },
        }
      );
      setPartGroups(response.data);
    } catch (err: unknown) {
      console.error('Error fetching part groups:', err);

      // Type guard for axios-like errors
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
      } else if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'NETWORK_ERROR'
      ) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to load part groups');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setImageFile(file); // Store the file object for later upload

    // Just create preview URL without uploading
    setImagePreview(URL.createObjectURL(file));
  };

  // Handle add part group
  const handleAddPartGroup = async () => {
    setProcessing(true);
    try {
      const formDataToSend = new FormData();

      // Add the image file if it exists
      if (imageFile) {
        formDataToSend.append('image', imageFile);
      } else if (formData.image) {
        // If we have an image URL but no file (like in edit mode)
        formDataToSend.append('image', formData.image);
      }

      // Add other fields as JSON string
      formDataToSend.append('name', formData.name || '');
      formDataToSend.append(
        'translations',
        JSON.stringify(formData.translations)
      );

      await axiosInstance.post<{ success: boolean }>(
        '/groups/part-group',
        formDataToSend,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${storage.getItem('access_token')}`,
            'X-CSRF-Token': csrfToken,
          },
        }
      );

      setSuccessMessage('Part group added successfully');
      setShowAddModal(false);
      resetForm();
      fetchPartGroups();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error('Error adding part group:', err);

      // Type guard for axios-like errors
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
      } else if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'NETWORK_ERROR'
      ) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to add part group');
      }
    } finally {
      setProcessing(false);
    }
  };

  // Handle update part group
  const handleUpdatePartGroup = async () => {
    if (!selectedPartGroup) return;

    setProcessing(true);
    try {
      const formDataToSend = new FormData();

      // Add the image file if it exists
      if (imageFile) {
        formDataToSend.append('image', imageFile);
      } else if (formData.image) {
        // If we have an image URL but no file
        formDataToSend.append('image', formData.image);
      }

      // Add other fields as JSON string
      formDataToSend.append('name', formData.name || '');
      formDataToSend.append(
        'translations',
        JSON.stringify(formData.translations)
      );

      await axiosInstance.put<{ success: boolean }>(
        `/groups/part-group/${selectedPartGroup.id}`,
        formDataToSend,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${storage.getItem('access_token')}`,
            'X-CSRF-Token': csrfToken,
          },
        }
      );

      setSuccessMessage('Part group updated successfully');
      setShowEditModal(false);
      resetForm();
      fetchPartGroups();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error('Error updating part group:', err);

      // Type guard for axios-like errors
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
      } else if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'NETWORK_ERROR'
      ) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to update part group');
      }
    } finally {
      setProcessing(false);
    }
  };

  // Handle delete part group
  const handleDeletePartGroup = async () => {
    if (!selectedPartGroup) return;

    setProcessing(true);
    try {
      await axiosInstance.delete<{ success: boolean }>(
        `/groups/part-group/${selectedPartGroup.id}`,
        {
          headers: {
            Authorization: `Bearer ${storage.getItem('access_token')}`,
            'X-CSRF-Token': csrfToken,
          },
        }
      );

      setSuccessMessage('Part group deleted successfully');
      setShowDeleteModal(false);
      fetchPartGroups();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error('Error deleting part group:', err);

      // Type guard for axios-like errors
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
      } else if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'NETWORK_ERROR'
      ) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to delete part group');
      }
    } finally {
      setProcessing(false);
    }
  };

  // Open edit modal
  const openEditModal = (partGroup: PartGroup) => {
    setSelectedPartGroup(partGroup);

    // Initialize form data with current part group data
    const formDataInit: PartGroupFormData = {
      name: partGroup.name || '',
      image: partGroup.image || '',
      translations: {
        en: { title: '' },
        de: { title: '' },
        fr: { title: '' },
        it: { title: '' },
      },
    };

    // Map translations from the part group to the form data
    partGroup.translations.forEach((translation) => {
      if (['en', 'de', 'fr', 'it'].includes(translation.language)) {
        formDataInit.translations[
          translation.language as 'en' | 'de' | 'fr' | 'it'
        ].title = translation.title;
      }
    });

    setFormData(formDataInit);
    setImagePreview(partGroup.image ? processImageUrl(partGroup.image) : null);
    setShowEditModal(true);
  };

  // Open delete modal
  const openDeleteModal = (partGroup: PartGroup) => {
    setSelectedPartGroup(partGroup);
    setShowDeleteModal(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      image: '',
      translations: {
        en: { title: '' },
        de: { title: '' },
        fr: { title: '' },
        it: { title: '' },
      },
    });
    setImagePreview(null);
    setImageFile(null);
  };

  // Get translated title
  const getTranslatedTitle = (
    translations: Translation[],
    lang: string = 'en'
  ) => {
    const translation = translations.find((t) => t.language === lang);
    return translation ? translation.title : 'Untitled';
  };

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <h2 className='text-xl font-semibold'>Part Groups Management</h2>
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className='px-4 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-800 flex items-center'
        >
          <Plus className='h-4 w-4 mr-1' />
          Add Part Group
        </button>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className='bg-purple-100 border border-purple-400 text-purple-800 p-3 rounded-md'>
          {successMessage}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className='bg-red-50 border border-red-200 text-red-700 p-3 rounded-md flex items-center gap-2'>
          <AlertCircle className='h-5 w-5' />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className='flex justify-center items-center h-64'>
          <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600'></div>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {partGroups.length > 0 ? (
            partGroups.map((partGroup) => (
              <div
                key={partGroup.id}
                className='border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow'
              >
                <div className='h-48 bg-gray-100 relative'>
                  {partGroup.image && !imageErrors[partGroup.id] ? (
                    <Image
                      src={processImageUrl(partGroup.image) || ''}
                      alt={getTranslatedTitle(partGroup.translations)}
                      fill
                      className='object-cover'
                      onError={() => {
                        // Set this image ID to have an error
                        setImageErrors((prev) => ({
                          ...prev,
                          [partGroup.id]: true,
                        }));
                      }}
                      unoptimized={true}
                    />
                  ) : (
                    <div className='absolute inset-0 flex items-center justify-center'>
                      <ImageIcon className='h-12 w-12 text-gray-400' />
                    </div>
                  )}
                </div>
                <div className='p-4'>
                  <h3 className='font-medium text-gray-900'>
                    {getTranslatedTitle(partGroup.translations)}
                  </h3>
                  <div className='mt-2 text-sm text-gray-500 flex flex-col gap-1'>
                    <div>
                      <span className='font-semibold'>DE:</span>{' '}
                      {getTranslatedTitle(partGroup.translations, 'de')}
                    </div>
                    <div>
                      <span className='font-semibold'>FR:</span>{' '}
                      {getTranslatedTitle(partGroup.translations, 'fr')}
                    </div>
                    <div>
                      <span className='font-semibold'>IT:</span>{' '}
                      {getTranslatedTitle(partGroup.translations, 'it')}
                    </div>
                  </div>
                  <div className='mt-4 flex justify-end space-x-2'>
                    <button
                      onClick={() => openEditModal(partGroup)}
                      className='p-2 text-blue-600 hover:text-blue-800'
                      aria-label='Edit Part Group'
                      title='Edit Part Group'
                    >
                      <Edit className='h-4 w-4' />
                    </button>
                    <button
                      onClick={() => openDeleteModal(partGroup)}
                      className='p-2 text-red-600 hover:text-red-800'
                      aria-label='Delete Part Group'
                      title='Delete Part Group'
                    >
                      <Trash2 className='h-4 w-4' />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className='col-span-full text-center py-12 bg-gray-50 rounded-lg'>
              <p className='text-gray-500'>No part groups found</p>
              <button
                onClick={() => {
                  setImagePreview(null);
                  setFormData({ ...formData, image: '' });
                  setImageFile(null);
                }}
                className='mt-4 px-4 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-800'
              >
                Create Your First Part Group
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal (shared UI) */}
      {(showAddModal || showEditModal) && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-lg max-w-md w-full p-6'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-lg font-medium text-gray-900'>
                {showAddModal ? 'Add New Part Group' : 'Edit Part Group'}
              </h3>
              <button
                onClick={() => {
                  if (showAddModal) {
                    setShowAddModal(false);
                  } else {
                    setShowEditModal(false);
                  }
                }}
                className='text-gray-400 hover:text-gray-500'
              >
                <X className='h-5 w-5' />
              </button>
            </div>

            <div className='space-y-4'>
              {/* Name field (optional) */}
              <div>
                <label
                  htmlFor='name'
                  className='block text-sm font-medium text-gray-700'
                >
                  Internal Name (Optional)
                </label>
                <input
                  id='name'
                  type='text'
                  className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-600 focus:ring-purple-600'
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value,
                    })
                  }
                />
                <p className='text-xs text-gray-500 mt-1'>
                  Internal reference name (not visible to users)
                </p>
              </div>

              {/* Image Upload */}
              <div>
                <label
                  htmlFor='image'
                  className='block text-sm font-medium text-gray-700 mb-1'
                >
                  Group Image
                </label>

                {imagePreview ? (
                  <div className='relative h-48 bg-gray-100 rounded-md mb-2'>
                    <Image
                      src={imagePreview}
                      alt='Preview'
                      fill
                      className='object-cover rounded-md'
                      unoptimized={true}
                      onError={() => {
                        setImagePreview(null);
                        setError('Failed to load image preview');
                      }}
                    />
                    <button
                      onClick={() => {
                        setImagePreview(null);
                        setFormData({ ...formData, image: '' });
                      }}
                      className='absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full'
                      title='Remove Image'
                    >
                      <X className='h-4 w-4' />
                    </button>
                  </div>
                ) : (
                  <div className='flex items-center justify-center h-48 bg-gray-100 rounded-md mb-2'>
                    <ImageIcon className='h-12 w-12 text-gray-400' />
                  </div>
                )}

                <div className='flex items-center'>
                  <label className='flex-1 cursor-pointer bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 hover:bg-gray-50 text-sm text-center'>
                    <span className='flex justify-center items-center'>
                      <Upload className='h-4 w-4 mr-1' />
                      {imagePreview ? 'Change Image' : 'Upload Image'}
                    </span>
                    <input
                      type='file'
                      className='sr-only'
                      onChange={handleImageUpload}
                      accept='image/*'
                    />
                  </label>
                </div>
              </div>

              {/* English Title (required) */}
              <div>
                <label
                  htmlFor='title-en'
                  className='block text-sm font-medium text-gray-700'
                >
                  English Title <span className='text-red-500'>*</span>
                </label>
                <input
                  id='title-en'
                  type='text'
                  className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-600 focus:ring-purple-600'
                  value={formData.translations.en.title}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      translations: {
                        ...formData.translations,
                        en: { title: e.target.value },
                      },
                    })
                  }
                  required
                />
              </div>

              {/* German Title */}
              <div>
                <label
                  htmlFor='title-de'
                  className='block text-sm font-medium text-gray-700'
                >
                  German Title
                </label>
                <input
                  id='title-de'
                  type='text'
                  className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-600 focus:ring-purple-600'
                  value={formData.translations.de.title}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      translations: {
                        ...formData.translations,
                        de: { title: e.target.value },
                      },
                    })
                  }
                />
              </div>

              {/* French Title */}
              <div>
                <label
                  htmlFor='title-fr'
                  className='block text-sm font-medium text-gray-700'
                >
                  French Title
                </label>
                <input
                  id='title-fr'
                  type='text'
                  className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-600 focus:ring-purple-600'
                  value={formData.translations.fr.title}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      translations: {
                        ...formData.translations,
                        fr: { title: e.target.value },
                      },
                    })
                  }
                />
              </div>

              {/* Italian Title */}
              <div>
                <label
                  htmlFor='title-it'
                  className='block text-sm font-medium text-gray-700'
                >
                  Italian Title
                </label>
                <input
                  id='title-it'
                  type='text'
                  className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-600 focus:ring-purple-600'
                  value={formData.translations.it.title}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      translations: {
                        ...formData.translations,
                        it: { title: e.target.value },
                      },
                    })
                  }
                />
              </div>
            </div>

            <div className='mt-6 flex justify-end space-x-3'>
              <button
                onClick={() => {
                  if (showAddModal) {
                    handleAddPartGroup();
                  } else {
                    handleUpdatePartGroup();
                  }
                }}
                className='px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50'
              >
                Cancel
              </button>
              <button
                onClick={
                  showAddModal ? handleAddPartGroup : handleUpdatePartGroup
                }
                className={`px-4 py-2 ${
                  showAddModal
                    ? 'bg-purple-700 hover:bg-purple-800'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white rounded-md disabled:bg-gray-400 flex items-center`}
                disabled={processing || !formData.translations.en.title}
              >
                {processing ? (
                  <>
                    <Loader className='h-4 w-4 animate-spin mr-2' />
                    {showAddModal ? 'Creating...' : 'Updating...'}
                  </>
                ) : (
                  <>
                    <Save className='h-4 w-4 mr-1' />
                    {showAddModal ? 'Create' : 'Update'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedPartGroup && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-lg max-w-md w-full p-6'>
            <h3 className='text-lg font-medium text-gray-900 mb-4'>
              Confirm Deletion
            </h3>
            <p className='text-gray-600 mb-6'>
              Are you sure you want to delete the part group &quot;
              {getTranslatedTitle(selectedPartGroup.translations)}&quot;? This
              action cannot be undone.
            </p>

            <div className='flex justify-end space-x-3'>
              <button
                onClick={() => setShowDeleteModal(false)}
                className='px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50'
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePartGroup}
                className='px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 flex items-center'
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader className='h-4 w-4 animate-spin mr-2' />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className='h-4 w-4 mr-1' />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartGroups;
