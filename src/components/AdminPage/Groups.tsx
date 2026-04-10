import { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  X,
  Save,
  Loader,
} from 'lucide-react';
import storage from '@/lib/storage';
import { Group } from '@/types/groups/group.type';
import { Subgroup } from '@/types/groups/subgroup.type';
import useAxios from '@/useAxios';

interface GroupsProps {
  csrfToken: string;
}

interface Translation {
  language: string;
  title: string;
}

interface GroupFormData {
  translations: {
    en: { title: string };
    de: { title: string };
    fr: { title: string };
    it: { title: string };
  };
}

interface SubgroupFormData {
  groupId: string;
  translations: {
    en: { title: string };
    de: { title: string };
    fr: { title: string };
    it: { title: string };
  };
}

const Groups: React.FC<GroupsProps> = ({ csrfToken }) => {
  // State for groups data
  const [groups, setGroups] = useState<Group[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // State for modals
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);
  const [showAddSubgroupModal, setShowAddSubgroupModal] = useState(false);
  const [showEditSubgroupModal, setShowEditSubgroupModal] = useState(false);
  const [showDeleteSubgroupModal, setShowDeleteSubgroupModal] = useState(false);

  const axiosInstance = useAxios();

  // Selected items for edit/delete operations
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedSubgroup, setSelectedSubgroup] = useState<Subgroup | null>(
    null
  );

  // Form data
  const [groupFormData, setGroupFormData] = useState<GroupFormData>({
    translations: {
      en: { title: '' },
      de: { title: '' },
      fr: { title: '' },
      it: { title: '' },
    },
  });

  const [subgroupFormData, setSubgroupFormData] = useState<SubgroupFormData>({
    groupId: '',
    translations: {
      en: { title: '' },
      de: { title: '' },
      fr: { title: '' },
      it: { title: '' },
    },
  });

  // Process state
  const [processing, setProcessing] = useState(false);

  // Fetch groups data
  const fetchGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get<Group[]>('/groups/all', {
        headers: {
          Authorization: `Bearer ${storage.getItem('access_token')}`,
          'X-CSRF-Token': csrfToken,
        },
      });
      setGroups(response.data);
    } catch (err: unknown) {
      console.error('Error fetching groups:', err);
      // Type guard for axios-like errors
      if (
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'status' in err.response
      ) {
        const message =
          err.response &&
          typeof err.response === 'object' &&
          'data' in err.response &&
          err.response.data &&
          typeof err.response.data === 'object' &&
          'message' in err.response.data
            ? String((err.response.data as { message: unknown }).message)
            : '';
        setError(message || 'Failed to load groups');
      } else if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'NETWORK_ERROR'
      ) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to load groups');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle group expansion
  const toggleGroupExpansion = (groupId: string) => {
    const newExpandedGroups = new Set(expandedGroups);
    if (newExpandedGroups.has(groupId)) {
      newExpandedGroups.delete(groupId);
    } else {
      newExpandedGroups.add(groupId);
    }
    setExpandedGroups(newExpandedGroups);
  };

  // Handle add group
  const handleAddGroup = async () => {
    setProcessing(true);
    try {
      await axiosInstance.post<{ success: boolean }>(
        '/groups',
        {
          translations: groupFormData.translations,
        },
        {
          headers: {
            Authorization: `Bearer ${storage.getItem('access_token')}`,
            'X-CSRF-Token': csrfToken,
          },
        }
      );

      setSuccessMessage('Group added successfully');
      setShowAddGroupModal(false);
      setGroupFormData({
        translations: {
          en: { title: '' },
          de: { title: '' },
          fr: { title: '' },
          it: { title: '' },
        },
      });
      fetchGroups();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error('Error adding group:', err);
      // Type guard for axios-like errors
      if (
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'status' in err.response
      ) {
        const message =
          err.response &&
          typeof err.response === 'object' &&
          'data' in err.response &&
          err.response.data &&
          typeof err.response.data === 'object' &&
          'message' in err.response.data
            ? String((err.response.data as { message: unknown }).message)
            : '';
        setError(message || 'Failed to add group');
      } else if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'NETWORK_ERROR'
      ) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to add group');
      }
    } finally {
      setProcessing(false);
    }
  };

  // Handle update group
  const handleUpdateGroup = async () => {
    if (!selectedGroup) return;

    setProcessing(true);
    try {
      await axiosInstance.put<{ success: boolean }>(
        `/groups/${selectedGroup.id}`,
        {
          translations: groupFormData.translations,
        },
        {
          headers: {
            Authorization: `Bearer ${storage.getItem('access_token')}`,
            'X-CSRF-Token': csrfToken,
          },
        }
      );

      setSuccessMessage('Group updated successfully');
      setShowEditGroupModal(false);
      fetchGroups();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error('Error updating group:', err);
      // Type guard for axios-like errors
      if (
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'status' in err.response
      ) {
        const message =
          err.response &&
          typeof err.response === 'object' &&
          'data' in err.response &&
          err.response.data &&
          typeof err.response.data === 'object' &&
          'message' in err.response.data
            ? String((err.response.data as { message: unknown }).message)
            : '';
        setError(message || 'Failed to update group');
      } else if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'NETWORK_ERROR'
      ) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to update group');
      }
    } finally {
      setProcessing(false);
    }
  };

  // Handle delete group
  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;

    setProcessing(true);
    try {
      await axiosInstance.delete<{ success: boolean }>(
        `/groups/${selectedGroup.id}`,
        {
          headers: {
            Authorization: `Bearer ${storage.getItem('access_token')}`,
            'X-CSRF-Token': csrfToken,
          },
        }
      );

      setSuccessMessage('Group deleted successfully');
      setShowDeleteGroupModal(false);
      fetchGroups();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error('Error deleting group:', err);
      // Type guard for axios-like errors
      if (
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'status' in err.response
      ) {
        const message =
          err.response &&
          typeof err.response === 'object' &&
          'data' in err.response &&
          err.response.data &&
          typeof err.response.data === 'object' &&
          'message' in err.response.data
            ? String((err.response.data as { message: unknown }).message)
            : '';
        setError(message || 'Failed to delete group');
      } else if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'NETWORK_ERROR'
      ) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to delete group');
      }
    } finally {
      setProcessing(false);
    }
  };

  // Handle add subgroup
  const handleAddSubgroup = async () => {
    setProcessing(true);
    try {
      await axiosInstance.post<{ success: boolean }>(
        '/groups/subgroup',
        {
          groupId: subgroupFormData.groupId,
          translations: {
            en: { name: subgroupFormData.translations.en.title },
            de: { name: subgroupFormData.translations.de.title },
            fr: { name: subgroupFormData.translations.fr.title },
            it: { name: subgroupFormData.translations.it.title },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${storage.getItem('access_token')}`,
            'X-CSRF-Token': csrfToken,
          },
        }
      );

      setSuccessMessage('Subgroup added successfully');
      setShowAddSubgroupModal(false);
      setSubgroupFormData({
        groupId: '',
        translations: {
          en: { title: '' },
          de: { title: '' },
          fr: { title: '' },
          it: { title: '' },
        },
      });
      fetchGroups();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error('Error adding subgroup:', err);
      // Type guard for axios-like errors
      if (
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'status' in err.response
      ) {
        const message =
          err.response &&
          typeof err.response === 'object' &&
          'data' in err.response &&
          err.response.data &&
          typeof err.response.data === 'object' &&
          'message' in err.response.data
            ? String((err.response.data as { message: unknown }).message)
            : '';
        setError(message || 'Failed to add subgroup');
      } else if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'NETWORK_ERROR'
      ) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to add subgroup');
      }
    } finally {
      setProcessing(false);
    }
  };

  // Handle update subgroup
  const handleUpdateSubgroup = async () => {
    if (!selectedSubgroup) return;

    setProcessing(true);
    try {
      await axiosInstance.put<{ success: boolean }>(
        `/groups/subgroups/${selectedSubgroup.id}`,
        {
          groupId: subgroupFormData.groupId,
          translations: {
            en: { name: subgroupFormData.translations.en.title },
            de: { name: subgroupFormData.translations.de.title },
            fr: { name: subgroupFormData.translations.fr.title },
            it: { name: subgroupFormData.translations.it.title },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${storage.getItem('access_token')}`,
            'X-CSRF-Token': csrfToken,
          },
        }
      );

      setSuccessMessage('Subgroup updated successfully');
      setShowEditSubgroupModal(false);
      fetchGroups();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error('Error updating subgroup:', err);
      // Type guard for axios-like errors
      if (
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'status' in err.response
      ) {
        const message =
          err.response &&
          typeof err.response === 'object' &&
          'data' in err.response &&
          err.response.data &&
          typeof err.response.data === 'object' &&
          'message' in err.response.data
            ? String((err.response.data as { message: unknown }).message)
            : '';
        setError(message || 'Failed to update subgroup');
      } else if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'NETWORK_ERROR'
      ) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to update subgroup');
      }
    } finally {
      setProcessing(false);
    }
  };

  // Handle delete subgroup
  const handleDeleteSubgroup = async () => {
    if (!selectedSubgroup) return;

    setProcessing(true);
    try {
      await axiosInstance.delete<{ success: boolean }>(
        `/groups/subgroups/${selectedSubgroup.id}`,
        {
          headers: {
            Authorization: `Bearer ${storage.getItem('access_token')}`,
            'X-CSRF-Token': csrfToken,
          },
        }
      );

      setSuccessMessage('Subgroup deleted successfully');
      setShowDeleteSubgroupModal(false);
      fetchGroups();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error('Error deleting subgroup:', err);

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
        setError('Failed to delete subgroup');
      }
    } finally {
      setLoading(false);
    }
  };

  // Open edit group modal
  const openEditGroupModal = (group: Group) => {
    setSelectedGroup(group);

    // Initialize form data with current group data
    const formData: GroupFormData = {
      translations: {
        en: { title: '' },
        de: { title: '' },
        fr: { title: '' },
        it: { title: '' },
      },
    };

    // Map translations from the group to the form data
    group.translations.forEach((translation) => {
      if (['en', 'de', 'fr', 'it'].includes(translation.language)) {
        formData.translations[
          translation.language as 'en' | 'de' | 'fr' | 'it'
        ].title = translation.title;
      }
    });

    setGroupFormData(formData);
    setShowEditGroupModal(true);
  };

  // Open delete group modal
  const openDeleteGroupModal = (group: Group) => {
    setSelectedGroup(group);
    setShowDeleteGroupModal(true);
  };

  // Open edit subgroup modal
  const openEditSubgroupModal = (subgroup: Subgroup, groupId: string) => {
    setSelectedSubgroup(subgroup);

    // Initialize form data with current subgroup data
    const formData: SubgroupFormData = {
      groupId: groupId,
      translations: {
        en: { title: '' },
        de: { title: '' },
        fr: { title: '' },
        it: { title: '' },
      },
    };

    // Map translations from the subgroup to the form data
    subgroup.translations.forEach((translation) => {
      if (['en', 'de', 'fr', 'it'].includes(translation.language)) {
        formData.translations[
          translation.language as 'en' | 'de' | 'fr' | 'it'
        ].title = translation.title;
      }
    });

    setSubgroupFormData(formData);
    setShowEditSubgroupModal(true);
  };

  // Open delete subgroup modal
  const openDeleteSubgroupModal = (subgroup: Subgroup) => {
    setSelectedSubgroup(subgroup);
    setShowDeleteSubgroupModal(true);
  };

  // Open add subgroup modal
  const openAddSubgroupModal = (groupId: string) => {
    setSubgroupFormData({
      groupId: groupId,
      translations: {
        en: { title: '' },
        de: { title: '' },
        fr: { title: '' },
        it: { title: '' },
      },
    });
    setShowAddSubgroupModal(true);
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
        <h2 className='text-xl font-semibold'>Groups Management</h2>
        <button
          onClick={() => setShowAddGroupModal(true)}
          className='px-4 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-800 flex items-center'
        >
          <Plus className='h-4 w-4 mr-1' />
          Add Group
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
        <div className='space-y-4'>
          {groups.length > 0 ? (
            groups.map((group) => (
              <div key={group.id} className='border rounded-lg overflow-hidden'>
                {/* Group Header */}
                <div className='bg-gray-50 px-4 py-3 flex items-center justify-between'>
                  <div className='flex items-center'>
                    <button
                      onClick={() => toggleGroupExpansion(group.id)}
                      className='mr-2 text-gray-500 hover:text-gray-700'
                      aria-label={
                        expandedGroups.has(group.id) ? 'Collapse' : 'Expand'
                      }
                    >
                      {expandedGroups.has(group.id) ? (
                        <ChevronUp className='h-5 w-5' />
                      ) : (
                        <ChevronDown className='h-5 w-5' />
                      )}
                    </button>
                    <h3 className='font-medium text-gray-900'>
                      {getTranslatedTitle(group.translations)}
                    </h3>
                    <div className='ml-4 text-sm text-gray-500'>
                      {group.subgroups.length} subgroups
                    </div>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <button
                      onClick={() => openAddSubgroupModal(group.id)}
                      className='p-2 text-purple-700 hover:text-purple-900'
                      aria-label='Add Subgroup'
                      title='Add Subgroup'
                    >
                      <Plus className='h-4 w-4' />
                    </button>
                    <button
                      onClick={() => openEditGroupModal(group)}
                      className='p-2 text-blue-600 hover:text-blue-800'
                      aria-label='Edit Group'
                      title='Edit Group'
                    >
                      <Edit className='h-4 w-4' />
                    </button>
                    <button
                      onClick={() => openDeleteGroupModal(group)}
                      className='p-2 text-red-600 hover:text-red-800'
                      aria-label='Delete Group'
                      title='Delete Group'
                    >
                      <Trash2 className='h-4 w-4' />
                    </button>
                  </div>
                </div>

                {/* Subgroups Collapsible Section */}
                {expandedGroups.has(group.id) && (
                  <div className='p-4 bg-white'>
                    {group.subgroups.length > 0 ? (
                      <div className='space-y-2'>
                        {group.subgroups.map((subgroup) => (
                          <div
                            key={subgroup.id}
                            className='border rounded-md p-3 flex justify-between items-center bg-gray-50'
                          >
                            <div>
                              <h4 className='font-medium'>
                                {getTranslatedTitle(subgroup.translations)}
                              </h4>
                              <div className='mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500'>
                                <div>
                                  <span className='font-semibold'>DE:</span>{' '}
                                  {getTranslatedTitle(
                                    subgroup.translations,
                                    'de'
                                  )}
                                </div>
                                <div>
                                  <span className='font-semibold'>FR:</span>{' '}
                                  {getTranslatedTitle(
                                    subgroup.translations,
                                    'fr'
                                  )}
                                </div>
                                <div>
                                  <span className='font-semibold'>IT:</span>{' '}
                                  {getTranslatedTitle(
                                    subgroup.translations,
                                    'it'
                                  )}
                                </div>
                                <div>
                                  <span className='font-semibold'>EN:</span>{' '}
                                  {getTranslatedTitle(
                                    subgroup.translations,
                                    'en'
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className='flex items-center space-x-2'>
                              <button
                                onClick={() =>
                                  openEditSubgroupModal(subgroup, group.id)
                                }
                                className='p-2 text-blue-600 hover:text-blue-800'
                                aria-label='Edit Subgroup'
                                title='Edit Subgroup'
                              >
                                <Edit className='h-4 w-4' />
                              </button>
                              <button
                                onClick={() =>
                                  openDeleteSubgroupModal(subgroup)
                                }
                                className='p-2 text-red-600 hover:text-red-800'
                                aria-label='Delete Subgroup'
                                title='Delete Subgroup'
                              >
                                <Trash2 className='h-4 w-4' />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className='text-center py-4 text-gray-500'>
                        No subgroups found for this group
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className='text-center py-12 bg-gray-50 rounded-lg'>
              <p className='text-gray-500'>No groups found</p>
              <button
                onClick={() => setShowAddGroupModal(true)}
                className='mt-4 px-4 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-800'
              >
                Create Your First Group
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Group Modal */}
      {showAddGroupModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-lg max-w-md w-full p-6'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-lg font-medium text-gray-900'>
                Add New Group
              </h3>
              <button
                onClick={() => setShowAddGroupModal(false)}
                className='text-gray-400 hover:text-gray-500'
              >
                <X className='h-5 w-5' />
              </button>
            </div>

            <div className='space-y-4'>
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
                  value={groupFormData.translations.en.title}
                  onChange={(e) =>
                    setGroupFormData({
                      ...groupFormData,
                      translations: {
                        ...groupFormData.translations,
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
                  value={groupFormData.translations.de.title}
                  onChange={(e) =>
                    setGroupFormData({
                      ...groupFormData,
                      translations: {
                        ...groupFormData.translations,
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
                  value={groupFormData.translations.fr.title}
                  onChange={(e) =>
                    setGroupFormData({
                      ...groupFormData,
                      translations: {
                        ...groupFormData.translations,
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
                  value={groupFormData.translations.it.title}
                  onChange={(e) =>
                    setGroupFormData({
                      ...groupFormData,
                      translations: {
                        ...groupFormData.translations,
                        it: { title: e.target.value },
                      },
                    })
                  }
                />
              </div>
            </div>

            <div className='mt-6 flex justify-end space-x-3'>
              <button
                onClick={() => setShowAddGroupModal(false)}
                className='px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50'
              >
                Cancel
              </button>
              <button
                onClick={handleAddGroup}
                className='px-4 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-800 disabled:bg-gray-400 flex items-center'
                disabled={processing || !groupFormData.translations.en.title}
              >
                {processing ? (
                  <>
                    <Loader className='h-4 w-4 animate-spin mr-2' />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className='h-4 w-4 mr-1' />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {showEditGroupModal && selectedGroup && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-lg max-w-md w-full p-6'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-lg font-medium text-gray-900'>Edit Group</h3>
              <button
                onClick={() => setShowEditGroupModal(false)}
                className='text-gray-400 hover:text-gray-500'
              >
                <X className='h-5 w-5' />
              </button>
            </div>

            <div className='space-y-4'>
              {/* English Title (required) */}
              <div>
                <label
                  htmlFor='edit-title-en'
                  className='block text-sm font-medium text-gray-700'
                >
                  English Title <span className='text-red-500'>*</span>
                </label>
                <input
                  id='edit-title-en'
                  type='text'
                  className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-600 focus:ring-purple-600'
                  value={groupFormData.translations.en.title}
                  onChange={(e) =>
                    setGroupFormData({
                      ...groupFormData,
                      translations: {
                        ...groupFormData.translations,
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
                  htmlFor='edit-title-de'
                  className='block text-sm font-medium text-gray-700'
                >
                  German Title
                </label>
                <input
                  id='edit-title-de'
                  type='text'
                  className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-600 focus:ring-purple-600'
                  value={groupFormData.translations.de.title}
                  onChange={(e) =>
                    setGroupFormData({
                      ...groupFormData,
                      translations: {
                        ...groupFormData.translations,
                        de: { title: e.target.value },
                      },
                    })
                  }
                />
              </div>

              {/* French Title */}
              <div>
                <label
                  htmlFor='edit-title-fr'
                  className='block text-sm font-medium text-gray-700'
                >
                  French Title
                </label>
                <input
                  id='edit-title-fr'
                  type='text'
                  className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-600 focus:ring-purple-600'
                  value={groupFormData.translations.fr.title}
                  onChange={(e) =>
                    setGroupFormData({
                      ...groupFormData,
                      translations: {
                        ...groupFormData.translations,
                        fr: { title: e.target.value },
                      },
                    })
                  }
                />
              </div>

              {/* Italian Title */}
              <div>
                <label
                  htmlFor='edit-title-it'
                  className='block text-sm font-medium text-gray-700'
                >
                  Italian Title
                </label>
                <input
                  id='edit-title-it'
                  type='text'
                  className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-600 focus:ring-purple-600'
                  value={groupFormData.translations.it.title}
                  onChange={(e) =>
                    setGroupFormData({
                      ...groupFormData,
                      translations: {
                        ...groupFormData.translations,
                        it: { title: e.target.value },
                      },
                    })
                  }
                />
              </div>
            </div>

            <div className='mt-6 flex justify-end space-x-3'>
              <button
                onClick={() => setShowEditGroupModal(false)}
                className='px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50'
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateGroup}
                className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center'
                disabled={processing || !groupFormData.translations.en.title}
              >
                {processing ? (
                  <>
                    <Loader className='h-4 w-4 animate-spin mr-2' />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className='h-4 w-4 mr-1' />
                    Update
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Group Modal */}
      {showDeleteGroupModal && selectedGroup && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-lg max-w-md w-full p-6'>
            <h3 className='text-lg font-medium text-gray-900 mb-4'>
              Confirm Deletion
            </h3>
            <p className='text-gray-600 mb-6'>
              Are you sure you want to delete the group &quot;
              {getTranslatedTitle(selectedGroup.translations)}&quot;?
              {selectedGroup.subgroups.length > 0 && (
                <span className='block text-red-600 mt-2 font-semibold'>
                  Warning: This will also delete{' '}
                  {selectedGroup.subgroups.length} subgroup(s) associated with
                  this group.
                </span>
              )}
            </p>

            <div className='flex justify-end space-x-3'>
              <button
                onClick={() => setShowDeleteGroupModal(false)}
                className='px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50'
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteGroup}
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

      {/* Add Subgroup Modal */}
      {showAddSubgroupModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-lg max-w-md w-full p-6'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-lg font-medium text-gray-900'>
                Add New Subgroup
              </h3>
              <button
                onClick={() => setShowAddSubgroupModal(false)}
                className='text-gray-400 hover:text-gray-500'
              >
                <X className='h-5 w-5' />
              </button>
            </div>

            <div className='space-y-4'>
              {/* Select parent group - disabled when coming from a specific group */}
              <div>
                <label
                  htmlFor='parent-group'
                  className='block text-sm font-medium text-gray-700'
                >
                  Parent Group
                </label>
                <select
                  id='parent-group'
                  className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-600 focus:ring-purple-600 bg-gray-100'
                  value={subgroupFormData.groupId}
                  disabled={true}
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {getTranslatedTitle(group.translations)}
                    </option>
                  ))}
                </select>
              </div>

              {/* English Title (required) */}
              <div>
                <label
                  htmlFor='subgroup-title-en'
                  className='block text-sm font-medium text-gray-700'
                >
                  English Title <span className='text-red-500'>*</span>
                </label>
                <input
                  id='subgroup-title-en'
                  type='text'
                  className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-600 focus:ring-purple-600'
                  value={subgroupFormData.translations.en.title}
                  onChange={(e) =>
                    setSubgroupFormData({
                      ...subgroupFormData,
                      translations: {
                        ...subgroupFormData.translations,
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
                  htmlFor='subgroup-title-de'
                  className='block text-sm font-medium text-gray-700'
                >
                  German Title
                </label>
                <input
                  id='subgroup-title-de'
                  type='text'
                  className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-600 focus:ring-purple-600'
                  value={subgroupFormData.translations.de.title}
                  onChange={(e) =>
                    setSubgroupFormData({
                      ...subgroupFormData,
                      translations: {
                        ...subgroupFormData.translations,
                        de: { title: e.target.value },
                      },
                    })
                  }
                />
              </div>

              {/* French Title */}
              <div>
                <label
                  htmlFor='subgroup-title-fr'
                  className='block text-sm font-medium text-gray-700'
                >
                  French Title
                </label>
                <input
                  id='subgroup-title-fr'
                  type='text'
                  className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-600 focus:ring-purple-600'
                  value={subgroupFormData.translations.fr.title}
                  onChange={(e) =>
                    setSubgroupFormData({
                      ...subgroupFormData,
                      translations: {
                        ...subgroupFormData.translations,
                        fr: { title: e.target.value },
                      },
                    })
                  }
                />
              </div>

              {/* Italian Title */}
              <div>
                <label
                  htmlFor='subgroup-title-it'
                  className='block text-sm font-medium text-gray-700'
                >
                  Italian Title
                </label>
                <input
                  id='subgroup-title-it'
                  type='text'
                  className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-600 focus:ring-purple-600'
                  value={subgroupFormData.translations.it.title}
                  onChange={(e) =>
                    setSubgroupFormData({
                      ...subgroupFormData,
                      translations: {
                        ...subgroupFormData.translations,
                        it: { title: e.target.value },
                      },
                    })
                  }
                />
              </div>
            </div>

            <div className='mt-6 flex justify-end space-x-3'>
              <button
                onClick={() => setShowAddSubgroupModal(false)}
                className='px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50'
              >
                Cancel
              </button>
              <button
                onClick={handleAddSubgroup}
                className='px-4 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-800 disabled:bg-gray-400 flex items-center'
                disabled={processing || !subgroupFormData.translations.en.title}
              >
                {processing ? (
                  <>
                    <Loader className='h-4 w-4 animate-spin mr-2' />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className='h-4 w-4 mr-1' />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subgroup Modal */}
      {showEditSubgroupModal && selectedSubgroup && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-lg max-w-md w-full p-6'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-lg font-medium text-gray-900'>
                Edit Subgroup
              </h3>
              <button
                onClick={() => setShowEditSubgroupModal(false)}
                className='text-gray-400 hover:text-gray-500'
              >
                <X className='h-5 w-5' />
              </button>
            </div>

            <div className='space-y-4'>
              {/* Select parent group */}
              <div>
                <label
                  htmlFor='edit-parent-group'
                  className='block text-sm font-medium text-gray-700'
                >
                  Parent Group
                </label>
                <select
                  id='edit-parent-group'
                  className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-600 focus:ring-purple-600'
                  value={subgroupFormData.groupId}
                  onChange={(e) =>
                    setSubgroupFormData({
                      ...subgroupFormData,
                      groupId: e.target.value,
                    })
                  }
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {getTranslatedTitle(group.translations)}
                    </option>
                  ))}
                </select>
              </div>

              {/* English Title (required) */}
              <div>
                <label
                  htmlFor='edit-subgroup-title-en'
                  className='block text-sm font-medium text-gray-700'
                >
                  English Title <span className='text-red-500'>*</span>
                </label>
                <input
                  id='edit-subgroup-title-en'
                  type='text'
                  className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-600 focus:ring-purple-600'
                  value={subgroupFormData.translations.en.title}
                  onChange={(e) =>
                    setSubgroupFormData({
                      ...subgroupFormData,
                      translations: {
                        ...subgroupFormData.translations,
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
                  htmlFor='edit-subgroup-title-de'
                  className='block text-sm font-medium text-gray-700'
                >
                  German Title
                </label>
                <input
                  id='edit-subgroup-title-de'
                  type='text'
                  className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-600 focus:ring-purple-600'
                  value={subgroupFormData.translations.de.title}
                  onChange={(e) =>
                    setSubgroupFormData({
                      ...subgroupFormData,
                      translations: {
                        ...subgroupFormData.translations,
                        de: { title: e.target.value },
                      },
                    })
                  }
                />
              </div>

              {/* French Title */}
              <div>
                <label
                  htmlFor='edit-subgroup-title-fr'
                  className='block text-sm font-medium text-gray-700'
                >
                  French Title
                </label>
                <input
                  id='edit-subgroup-title-fr'
                  type='text'
                  className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-600 focus:ring-purple-600'
                  value={subgroupFormData.translations.fr.title}
                  onChange={(e) =>
                    setSubgroupFormData({
                      ...subgroupFormData,
                      translations: {
                        ...subgroupFormData.translations,
                        fr: { title: e.target.value },
                      },
                    })
                  }
                />
              </div>

              {/* Italian Title */}
              <div>
                <label
                  htmlFor='edit-subgroup-title-it'
                  className='block text-sm font-medium text-gray-700'
                >
                  Italian Title
                </label>
                <input
                  id='edit-subgroup-title-it'
                  type='text'
                  className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-600 focus:ring-purple-600'
                  value={subgroupFormData.translations.it.title}
                  onChange={(e) =>
                    setSubgroupFormData({
                      ...subgroupFormData,
                      translations: {
                        ...subgroupFormData.translations,
                        it: { title: e.target.value },
                      },
                    })
                  }
                />
              </div>
            </div>

            <div className='mt-6 flex justify-end space-x-3'>
              <button
                onClick={() => setShowEditSubgroupModal(false)}
                className='px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50'
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSubgroup}
                className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center'
                disabled={processing || !subgroupFormData.translations.en.title}
              >
                {processing ? (
                  <>
                    <Loader className='h-4 w-4 animate-spin mr-2' />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className='h-4 w-4 mr-1' />
                    Update
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Subgroup Modal */}
      {showDeleteSubgroupModal && selectedSubgroup && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-lg max-w-md w-full p-6'>
            <h3 className='text-lg font-medium text-gray-900 mb-4'>
              Confirm Deletion
            </h3>
            <p className='text-gray-600 mb-6'>
              Are you sure you want to delete the subgroup &quot;
              {getTranslatedTitle(selectedSubgroup.translations)}&quot;? This
              action cannot be undone.
            </p>

            <div className='flex justify-end space-x-3'>
              <button
                onClick={() => setShowDeleteSubgroupModal(false)}
                className='px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50'
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubgroup}
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

export default Groups;
