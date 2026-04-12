import { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Edit,
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Search,
  Package,
} from 'lucide-react';
import storage from '@/lib/storage';
import Image from 'next/image';
import { Sticker } from '@/types/sticker/sticker.type';
import useAxios from '@/useAxios';

interface VariationGroup {
  id: string;
  name: string;
  createdAt: string;
  stickers?: Sticker[];
}

interface Props {
  csrfToken: string;
}

interface StickerResponse {
  data: Sticker[];
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

const Variations: React.FC<Props> = ({ csrfToken }) => {
  // State management
  const [variations, setVariations] = useState<VariationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedVariations, setExpandedVariations] = useState<Set<string>>(
    new Set()
  );
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStickerModalOpen, setIsStickerModalOpen] = useState(false);

  // Form data
  const [newVariationName, setNewVariationName] = useState('');
  const [editingVariation, setEditingVariation] =
    useState<VariationGroup | null>(null);
  const [deletingVariation, setDeletingVariation] =
    useState<VariationGroup | null>(null);

  // Sticker management
  const [allStickers, setAllStickers] = useState<Sticker[]>([]);
  const [selectedVariationForStickers, setSelectedVariationForStickers] =
    useState<VariationGroup | null>(null);
  const [stickerSearchTerm, setStickerSearchTerm] = useState('');
  const [addingStickerIds, setAddingStickerIds] = useState<string[]>([]);
  const [removingStickerIds, setRemovingStickerIds] = useState<string[]>([]);

  const axiosInstance = useAxios();

  // Fetch all variations
  const fetchVariations = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get<VariationGroup[]>(
        '/variations',
        {
          headers: {
            Authorization: `Bearer ${storage.getItem('access_token')}`,
            'X-CSRF-Token': csrfToken,
          },
        }
      );
      setVariations(response.data);
    } catch (err: unknown) {
      console.error('Error fetching variations:', err);

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
        setError('Failed to load variations');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch stickers for a specific variation
  const fetchVariationStickers = async (variationId: string) => {
    try {
      const response = await axiosInstance.get<StickerResponse>(
        `/stickers/variation/${variationId}`, // Updated endpoint path
        {
          headers: {
            Authorization: `Bearer ${storage.getItem('access_token')}`,
            'X-CSRF-Token': csrfToken,
          },
        }
      );

      // Get stickers from the data property of the response
      const stickers = response.data.data || [];

      // Process images to ensure they have full URLs
      const processedStickers = stickers.map((sticker: Sticker) => ({
        ...sticker,
        images: sticker.images.map((img: string) => {
          if (img.startsWith('http')) {
            return img;
          } else {
            return `https://minio-api.cwx-dev.com/stickers/${img}`;
          }
        }),
      }));

      // Update the stickers for this variation in the variations array
      setVariations(
        variations.map((variation) =>
          variation.id === variationId
            ? { ...variation, stickers: processedStickers }
            : variation
        )
      );

      return processedStickers;
    } catch (err: unknown) {
      console.error(
        `Error fetching stickers for variation ${variationId}:`,
        err
      );
      throw err;
    }
  };

  // Fetch all stickers (for adding to variations)
  const fetchAllStickers = async () => {
    try {
      const response = await axiosInstance.get<StickerResponse>(
        '/stickers?amount=100&status=active',
        {
          headers: {
            Authorization: `Bearer ${storage.getItem('access_token')}`,
            'X-CSRF-Token': csrfToken,
          },
        }
      );

      // Process images to ensure they have full URLs
      const processedStickers = response.data.data.map((sticker: Sticker) => ({
        ...sticker,
        images: sticker.images.map((img: string) => {
          if (img.startsWith('http')) {
            return img;
          } else {
            return `https://minio-api.cwx-dev.com/stickers/${img}`;
          }
        }),
      }));

      setAllStickers(processedStickers);
    } catch {}
  };

  // Initial data fetch
  useEffect(() => {
    fetchVariations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle variation expansion
  const toggleVariationExpansion = async (variationId: string) => {
    const newExpandedVariations = new Set(expandedVariations);

    if (newExpandedVariations.has(variationId)) {
      newExpandedVariations.delete(variationId);
    } else {
      newExpandedVariations.add(variationId);

      // Fetch stickers for this variation if not loaded yet
      const variation = variations.find((v) => v.id === variationId);
      if (variation && !variation.stickers) {
        try {
          await fetchVariationStickers(variationId);
        } catch {
          // Error is already logged in fetchVariationStickers
        }
      }
    }

    setExpandedVariations(newExpandedVariations);
  };

  // Create a new variation
  const handleCreateVariation = async () => {
    if (!newVariationName.trim()) {
      setError('Variation name is required');
      return;
    }

    try {
      await axiosInstance.post<void>(
        '/variations',
        { name: newVariationName },
        {
          headers: {
            Authorization: `Bearer ${storage.getItem('access_token')}`,
            'X-CSRF-Token': csrfToken,
          },
        }
      );

      setNewVariationName('');
      setIsCreateModalOpen(false);
      setSuccess('Variation created successfully');
      setTimeout(() => setSuccess(null), 3000);
      fetchVariations();
    } catch (err: unknown) {
      console.error('Error creating variation:', err);

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
        setError('Failed to create variation');
      }
    }
  };

  // Update a variation
  const handleUpdateVariation = async () => {
    if (!editingVariation || !editingVariation.name.trim()) {
      setError('Variation name is required');
      return;
    }

    try {
      await axiosInstance.put<void>(
        `/variations/${editingVariation.id}`,
        { name: editingVariation.name },
        {
          headers: {
            Authorization: `Bearer ${storage.getItem('access_token')}`,
            'X-CSRF-Token': csrfToken,
          },
        }
      );

      setEditingVariation(null);
      setIsEditModalOpen(false);
      setSuccess('Variation updated successfully');
      setTimeout(() => setSuccess(null), 3000);
      fetchVariations();
    } catch (err: unknown) {
      console.error('Error updating variation:', err);

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
        setError('Failed to update variation');
      }
    }
  };

  // Delete a variation
  const handleDeleteVariation = async () => {
    if (!deletingVariation) return;

    try {
      await axiosInstance.delete<void>(`/variations/${deletingVariation.id}`, {
        headers: {
          Authorization: `Bearer ${storage.getItem('access_token')}`,
          'X-CSRF-Token': csrfToken,
        },
      });

      setDeletingVariation(null);
      setIsDeleteModalOpen(false);
      setSuccess('Variation deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
      fetchVariations();
    } catch (err: unknown) {
      console.error('Error deleting variation:', err);

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
        setError('Failed to delete variation');
      }
    }
  };

  // Open sticker management modal
  const openStickerModal = async (variation: VariationGroup) => {
    setSelectedVariationForStickers(variation);
    setIsStickerModalOpen(true);
    setStickerSearchTerm('');
    setAddingStickerIds([]);
    setRemovingStickerIds([]);

    // Fetch all stickers and the stickers for this variation
    await fetchAllStickers();
    if (!variation.stickers) {
      await fetchVariationStickers(variation.id);
    }
  };

  // Add a sticker to a variation
  const handleAddSticker = async (variationId: string, stickerId: string) => {
    try {
      setAddingStickerIds((prev) => [...prev, stickerId]);

      await axiosInstance.patch<void>(
        `/variations/${variationId}/add-sticker`,
        { stickerId },
        {
          headers: {
            Authorization: `Bearer ${storage.getItem('access_token')}`,
            'X-CSRF-Token': csrfToken,
          },
        }
      );

      // Refresh the stickers for this variation
      await fetchVariationStickers(variationId);
      setAddingStickerIds((prev) => prev.filter((id) => id !== stickerId));
    } catch (err: unknown) {
      console.error('Error adding sticker to variation:', err);

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
        setAddingStickerIds((prev) => prev.filter((id) => id !== stickerId));
      } else if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'NETWORK_ERROR'
      ) {
        setError('Network error. Please check your connection.');
        setAddingStickerIds((prev) => prev.filter((id) => id !== stickerId));
      } else {
        setError('Failed to add sticker to variation');
        setAddingStickerIds((prev) => prev.filter((id) => id !== stickerId));
      }
    }
  };

  // Remove a sticker from a variation
  const handleRemoveSticker = async (
    variationId: string,
    stickerId: string
  ) => {
    try {
      setRemovingStickerIds((prev) => [...prev, stickerId]);

      await axiosInstance.patch<void>(
        `/variations/${variationId}/remove-sticker`,
        { stickerId },
        {
          headers: {
            Authorization: `Bearer ${storage.getItem('access_token')}`,
            'X-CSRF-Token': csrfToken,
          },
        }
      );

      // Refresh the stickers for this variation
      await fetchVariationStickers(variationId);
      setRemovingStickerIds((prev) => prev.filter((id) => id !== stickerId));
    } catch (err: unknown) {
      console.error('Error removing sticker from variation:', err);

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
        setRemovingStickerIds((prev) => prev.filter((id) => id !== stickerId));
      } else if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'NETWORK_ERROR'
      ) {
        setError('Network error. Please check your connection.');
        setRemovingStickerIds((prev) => prev.filter((id) => id !== stickerId));
      } else {
        setError('Failed to remove sticker from variation');
        setRemovingStickerIds((prev) => prev.filter((id) => id !== stickerId));
      }
    }
  };

  // Helper function to get sticker title
  const getStickerTitle = (sticker: Sticker): string => {
    // Find English translation or fall back to first available
    const enTranslation = sticker.translations.find((t) => t.language === 'en');
    return (
      enTranslation?.title ||
      sticker.translations[0]?.title ||
      'Untitled Sticker'
    );
  };

  // Filter variations based on search term
  const filteredVariations = searchTerm
    ? variations.filter((variation) =>
        variation.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : variations;

  if (loading && variations.length === 0) {
    return (
      <div className='flex justify-center items-center h-64'>
        <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500'></div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <h2 className='text-xl font-semibold'>Variation Groups</h2>
        <div className='flex gap-2'>
          <form className='relative'>
            <input
              type='text'
              placeholder='Search variations...'
              className='pl-9 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className='h-4 w-4 absolute left-3 top-3 text-zinc-500' />
          </form>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className='px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 flex items-center gap-1'
          >
            <Plus className='h-4 w-4' />
            New Variation
          </button>
        </div>
      </div>

      {/* Success message */}
      {success && (
        <div className='bg-amber-500/10 border border-purple-400 text-amber-300 p-3 rounded-md'>
          {success}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className='bg-red-50 border border-red-200 text-red-700 p-3 rounded-md flex items-center gap-2'>
          <AlertCircle className='h-5 w-5' />
          <span>{error}</span>
        </div>
      )}

      {/* Variations list */}
      {filteredVariations.length === 0 ? (
        <div className='text-center py-12 bg-zinc-800 rounded-lg'>
          <p className='text-zinc-400'>No variations found</p>
        </div>
      ) : (
        <div className='space-y-4'>
          {filteredVariations.map((variation) => {
            const isExpanded = expandedVariations.has(variation.id);
            return (
              <div
                key={variation.id}
                className='border rounded-lg overflow-hidden bg-zinc-900'
              >
                {/* Variation Header - always visible */}
                <div className='p-4 flex justify-between items-center'>
                  <div
                    className='flex items-center gap-2 cursor-pointer flex-grow'
                    onClick={() => toggleVariationExpansion(variation.id)}
                  >
                    {isExpanded ? (
                      <ChevronUp className='h-5 w-5 text-zinc-400' />
                    ) : (
                      <ChevronDown className='h-5 w-5 text-zinc-400' />
                    )}
                    <h3 className='font-medium text-zinc-100'>
                      {variation.name}
                    </h3>
                  </div>

                  <div className='flex items-center gap-2'>
                    <button
                      onClick={() => {
                        setEditingVariation(variation);
                        setIsEditModalOpen(true);
                      }}
                      className='p-2 text-blue-600 hover:bg-blue-50 rounded-md'
                      title='Edit variation'
                    >
                      <Edit className='h-4 w-4' />
                    </button>
                    <button
                      onClick={() => openStickerModal(variation)}
                      className='p-2 text-amber-400 hover:bg-amber-500/5 rounded-md'
                      title='Manage stickers'
                    >
                      <Package className='h-4 w-4' />
                    </button>
                    <button
                      onClick={() => {
                        setDeletingVariation(variation);
                        setIsDeleteModalOpen(true);
                      }}
                      className='p-2 text-red-600 hover:bg-red-50 rounded-md'
                      title='Delete variation'
                    >
                      <Trash2 className='h-4 w-4' />
                    </button>
                  </div>
                </div>

                {/* Expanded content - shows stickers in this variation */}
                {isExpanded && variation.stickers && (
                  <div className='border-t border-zinc-700 p-4 bg-zinc-800'>
                    <h4 className='text-sm font-medium text-zinc-300 mb-3'>
                      Stickers in this variation ({variation.stickers.length})
                    </h4>

                    {variation.stickers.length === 0 ? (
                      <div className='text-center py-6 bg-zinc-900 rounded-md'>
                        <p className='text-zinc-400'>
                          No stickers in this variation
                        </p>
                        <button
                          onClick={() => openStickerModal(variation)}
                          className='mt-2 px-3 py-1 bg-amber-600 text-white text-sm rounded-md hover:bg-amber-700'
                        >
                          Add Stickers
                        </button>
                      </div>
                    ) : (
                      <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'>
                        {variation.stickers.map((sticker) => (
                          <div
                            key={sticker.id}
                            className='bg-zinc-900 rounded-md overflow-hidden border border-zinc-700 flex flex-col'
                          >
                            <div className='w-full h-32 relative bg-zinc-800'>
                              {sticker.images && sticker.images.length > 0 ? (
                                <Image
                                  src={sticker.images[0]}
                                  alt={getStickerTitle(sticker)}
                                  fill
                                  className='object-contain p-2'
                                  unoptimized={true}
                                />
                              ) : (
                                <div className='flex items-center justify-center h-full'>
                                  <span className='text-zinc-500 text-sm'>
                                    No image
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className='p-3'>
                              <h5 className='font-medium text-sm text-zinc-100 truncate'>
                                {getStickerTitle(sticker)}
                              </h5>

                              <button
                                onClick={() =>
                                  handleRemoveSticker(variation.id, sticker.id)
                                }
                                disabled={removingStickerIds.includes(
                                  sticker.id
                                )}
                                className='mt-2 w-full px-2 py-1 text-xs text-red-600 bg-red-50 rounded hover:bg-red-100 flex items-center justify-center gap-1'
                              >
                                {removingStickerIds.includes(sticker.id) ? (
                                  <div className='animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-red-600'></div>
                                ) : (
                                  <Trash2 className='h-3 w-3' />
                                )}
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create new variation */}
      {isCreateModalOpen && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-zinc-900 rounded-lg max-w-md w-full p-6'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-lg font-medium text-zinc-100'>
                Create New Variation
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className='text-zinc-500 hover:text-zinc-400'
              >
                <X className='h-5 w-5' />
              </button>
            </div>

            <div className='space-y-4'>
              <div>
                <label
                  htmlFor='variationName'
                  className='block text-sm font-medium text-zinc-300 mb-1'
                >
                  Variation Name
                </label>
                <input
                  type='text'
                  id='variationName'
                  value={newVariationName}
                  onChange={(e) => setNewVariationName(e.target.value)}
                  className='w-full rounded-md border border-zinc-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600'
                  placeholder='Enter variation name'
                />
              </div>

              <div className='flex justify-end space-x-3 pt-4'>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className='px-4 py-2 text-zinc-300 border border-zinc-700 rounded-md hover:bg-zinc-800'
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateVariation}
                  className='px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700'
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit variation */}
      {isEditModalOpen && editingVariation && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-zinc-900 rounded-lg max-w-md w-full p-6'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-lg font-medium text-zinc-100'>
                Edit Variation
              </h3>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingVariation(null);
                }}
                className='text-zinc-500 hover:text-zinc-400'
              >
                <X className='h-5 w-5' />
              </button>
            </div>

            <div className='space-y-4'>
              <div>
                <label
                  htmlFor='editVariationName'
                  className='block text-sm font-medium text-zinc-300 mb-1'
                >
                  Variation Name
                </label>
                <input
                  type='text'
                  id='editVariationName'
                  value={editingVariation.name}
                  onChange={(e) =>
                    setEditingVariation({
                      ...editingVariation,
                      name: e.target.value,
                    })
                  }
                  className='w-full rounded-md border border-zinc-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600'
                />
              </div>

              <div className='flex justify-end space-x-3 pt-4'>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingVariation(null);
                  }}
                  className='px-4 py-2 text-zinc-300 border border-zinc-700 rounded-md hover:bg-zinc-800'
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateVariation}
                  className='px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700'
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete confirmation */}
      {isDeleteModalOpen && deletingVariation && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-zinc-900 rounded-lg max-w-md w-full p-6'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-lg font-medium text-zinc-100'>
                Delete Variation
              </h3>
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletingVariation(null);
                }}
                className='text-zinc-500 hover:text-zinc-400'
              >
                <X className='h-5 w-5' />
              </button>
            </div>

            <div className='space-y-4'>
              <p className='text-zinc-400'>
                Are you sure you want to delete the variation &quot;
                {deletingVariation.name}&quot;? This action cannot be undone.
              </p>

              <div className='flex justify-end space-x-3 pt-4'>
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingVariation(null);
                  }}
                  className='px-4 py-2 text-zinc-300 border border-zinc-700 rounded-md hover:bg-zinc-800'
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteVariation}
                  className='px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700'
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Manage stickers */}
      {isStickerModalOpen && selectedVariationForStickers && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-zinc-900 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col'>
            <div className='p-4 border-b'>
              <div className='flex justify-between items-center'>
                <h3 className='text-lg font-medium text-zinc-100'>
                  Manage Stickers for &quot;{selectedVariationForStickers.name}
                  &quot;
                </h3>
                <button
                  onClick={() => setIsStickerModalOpen(false)}
                  className='text-zinc-500 hover:text-zinc-400'
                >
                  <X className='h-5 w-5' />
                </button>
              </div>
            </div>

            <div className='flex-1 overflow-auto p-4'>
              <div className='mb-4'>
                <input
                  type='text'
                  placeholder='Search stickers...'
                  value={stickerSearchTerm}
                  onChange={(e) => setStickerSearchTerm(e.target.value)}
                  className='w-full rounded-md border border-zinc-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600'
                />
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {/* Available stickers */}
                <div className='border rounded-lg p-4'>
                  <h4 className='font-medium text-zinc-200 mb-3'>
                    Available Stickers
                  </h4>

                  <div className='space-y-2 max-h-[50vh] overflow-y-auto pr-2'>
                    {allStickers
                      .filter(
                        (sticker) =>
                          // Filter by search term
                          getStickerTitle(sticker)
                            .toLowerCase()
                            .includes(stickerSearchTerm.toLowerCase()) &&
                          // Filter out stickers already in the variation
                          !(selectedVariationForStickers.stickers || []).some(
                            (s) => s.id === sticker.id
                          )
                      )
                      .map((sticker) => (
                        <div
                          key={sticker.id}
                          className='flex items-center gap-3 p-2 border rounded bg-zinc-900 hover:bg-zinc-800'
                        >
                          <div className='w-12 h-12 relative bg-zinc-800 rounded'>
                            {sticker.images && sticker.images.length > 0 ? (
                              <Image
                                src={sticker.images[0]}
                                alt={getStickerTitle(sticker)}
                                fill
                                className='object-contain p-1'
                                unoptimized={true}
                              />
                            ) : (
                              <div className='flex items-center justify-center h-full'>
                                <span className='text-zinc-500 text-xs'>
                                  No img
                                </span>
                              </div>
                            )}
                          </div>

                          <div className='flex-1 min-w-0'>
                            <p className='text-sm font-medium truncate'>
                              {getStickerTitle(sticker)}
                            </p>
                          </div>

                          <button
                            onClick={() =>
                              handleAddSticker(
                                selectedVariationForStickers.id,
                                sticker.id
                              )
                            }
                            disabled={addingStickerIds.includes(sticker.id)}
                            className='px-3 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700 flex items-center gap-1'
                          >
                            {addingStickerIds.includes(sticker.id) ? (
                              <div className='animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white'></div>
                            ) : (
                              <Plus className='h-3 w-3' />
                            )}
                            Add
                          </button>
                        </div>
                      ))}

                    {allStickers.filter(
                      (sticker) =>
                        getStickerTitle(sticker)
                          .toLowerCase()
                          .includes(stickerSearchTerm.toLowerCase()) &&
                        !(selectedVariationForStickers.stickers || []).some(
                          (s) => s.id === sticker.id
                        )
                    ).length === 0 && (
                      <div className='text-center py-4 text-zinc-400'>
                        No available stickers found
                      </div>
                    )}
                  </div>
                </div>

                {/* Current stickers in variation */}
                <div className='border rounded-lg p-4'>
                  <h4 className='font-medium text-zinc-200 mb-3'>
                    Stickers in Variation (
                    {(selectedVariationForStickers.stickers || []).length})
                  </h4>

                  <div className='space-y-2 max-h-[50vh] overflow-y-auto pr-2'>
                    {(selectedVariationForStickers.stickers || [])
                      .filter((sticker) =>
                        getStickerTitle(sticker)
                          .toLowerCase()
                          .includes(stickerSearchTerm.toLowerCase())
                      )
                      .map((sticker) => (
                        <div
                          key={sticker.id}
                          className='flex items-center gap-3 p-2 border rounded bg-zinc-900 hover:bg-zinc-800'
                        >
                          <div className='w-12 h-12 relative bg-zinc-800 rounded'>
                            {sticker.images && sticker.images.length > 0 ? (
                              <Image
                                src={sticker.images[0]}
                                alt={getStickerTitle(sticker)}
                                fill
                                className='object-contain p-1'
                                unoptimized={true}
                              />
                            ) : (
                              <div className='flex items-center justify-center h-full'>
                                <span className='text-zinc-500 text-xs'>
                                  No img
                                </span>
                              </div>
                            )}
                          </div>

                          <div className='flex-1 min-w-0'>
                            <p className='text-sm font-medium truncate'>
                              {getStickerTitle(sticker)}
                            </p>
                          </div>

                          <button
                            onClick={() =>
                              handleRemoveSticker(
                                selectedVariationForStickers.id,
                                sticker.id
                              )
                            }
                            disabled={removingStickerIds.includes(sticker.id)}
                            className='px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 flex items-center gap-1'
                          >
                            {removingStickerIds.includes(sticker.id) ? (
                              <div className='animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white'></div>
                            ) : (
                              <Trash2 className='h-3 w-3' />
                            )}
                            Remove
                          </button>
                        </div>
                      ))}

                    {(selectedVariationForStickers.stickers || []).filter(
                      (sticker) =>
                        getStickerTitle(sticker)
                          .toLowerCase()
                          .includes(stickerSearchTerm.toLowerCase())
                    ).length === 0 && (
                      <div className='text-center py-4 text-zinc-400'>
                        No stickers in this variation
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className='p-4 border-t bg-zinc-800 mt-auto'>
              <div className='flex justify-end'>
                <button
                  onClick={() => setIsStickerModalOpen(false)}
                  className='px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700'
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Variations;
