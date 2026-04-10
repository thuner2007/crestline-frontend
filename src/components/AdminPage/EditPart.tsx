import { useEffect, useState } from 'react';
import storage from '@/lib/storage';
import { AlertCircle, Plus, Trash, Upload, X } from 'lucide-react';
import { FieldPath, useForm } from 'react-hook-form';
import { Tab } from '@headlessui/react';
import NextImage from 'next/image';
import useAxios from '@/useAxios';

// Type definitions
interface Translation {
  title: string;
  description?: string;
  language?: string;
}

interface BaseCustomizationOption {
  type: 'color' | 'inputfield' | 'dropdown' | 'powdercoatColors' | 'filamentColor';
  translations: {
    de: Translation;
    en: Translation;
    fr: Translation;
    it: Translation;
  };
  priceAdjustment?: number; // Added for parts
}

interface InputFieldOption extends BaseCustomizationOption {
  type: 'inputfield';
  max?: number;
}

interface DropdownOption extends BaseCustomizationOption {
  type: 'dropdown';
  items: {
    id: string;
    priceAdjustment: number; // Price adjustment for this specific item
    translations: {
      de: Translation;
      en: Translation;
      fr: Translation;
      it: Translation;
    };
  }[];
}

interface ColorOption extends BaseCustomizationOption {
  type: 'color';
}

interface PowdercoatColorsOption extends BaseCustomizationOption {
  type: 'powdercoatColors';
}

interface FilamentColorOption extends BaseCustomizationOption {
  type: 'filamentColor';
  filamentTypeId?: string;
}

interface FilamentType {
  id: string;
  name: string;
  description: string;
  active: boolean;
}

type CustomizationOption =
  | InputFieldOption
  | DropdownOption
  | ColorOption
  | PowdercoatColorsOption
  | FilamentColorOption;

interface PartGroup {
  id: string;
  createdAt: string;
  image: string | null;
  translations?: Array<{
    language: string;
    title: string;
  }>;
}

interface FormData {
  price: number;
  initialPrice?: number;
  quantity: number;
  type: string;
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
  customizationOptions: {
    options: CustomizationOption[];
  };
  images: string[];
  sortingRank: number;
  active: boolean;
  groups: string[];
  keywords: string[];
  shippingReady:
    | 'now'
    | 'in_1_3_days'
    | 'in_4_7_days'
    | 'in_8_14_days'
    | 'unknown'
    | 'pre_order';
  shippingDate?: string;
  translations: {
    en: Translation;
    de: Translation;
    fr: Translation;
    it: Translation;
  };
}

interface Part {
  id: string;
  price: string;
  initialPrice?: string;
  quantity: number;
  type?: string;
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
  images: string[];
  videos?: string[];
  active: boolean;
  sortingRank: number;
  translations: {
    language: string;
    title: string;
    description: string;
  }[];
  createdAt: string;
  updatedAt: string;
  shippingReady:
    | 'now'
    | 'in_1_3_days'
    | 'in_4_7_days'
    | 'in_8_14_days'
    | 'unknown'
    | 'pre_order';
  shippingDate?: string;
  customizationOptions?: {
    options: CustomizationOption[];
  };
  keywords?: string[];
  groups?: PartGroup[];
}

interface Props {
  csrfToken: string;
  part: Part;
  onClose: () => void;
  onUpdate: (updatedPart: Part) => void;
}

// Helper function to generate a unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

const EditPart: React.FC<Props> = ({ csrfToken, part, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const axiosInstance = useAxios();
  const [customizationOptions, setCustomizationOptions] = useState<
    CustomizationOption[]
  >([]);
  const [optionType, setOptionType] = useState<
    'color' | 'inputfield' | 'dropdown' | 'powdercoatColors' | 'filamentColor'
  >('inputfield');
  const [filamentTypes, setFilamentTypes] = useState<FilamentType[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [videosToDelete, setVideosToDelete] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 4; // Reduced to 4 steps (no variations for parts)

  const [partGroups, setPartGroups] = useState<
    { id: string; translations: Translation[] }[]
  >([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState<string>('');

  // Store original values for comparison
  const [originalValues, setOriginalValues] = useState<{
    price: number;
    initialPrice?: number;
    quantity: number;
    type: string;
    weight?: number;
    width?: number;
    height?: number;
    length?: number;
    sortingRank: number;
    active: boolean;
    groups: string[];
    keywords: string[];
    shippingReady: string;
    shippingDate?: string;
    translations: FormData['translations'];
    customizationOptions: CustomizationOption[];
    images: string[];
    videos?: string[];
  } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      price: parseFloat(part.price) || 10.0,
      initialPrice: part.initialPrice
        ? parseFloat(part.initialPrice)
        : undefined,
      quantity: part.quantity || 100,
      type: part.type || '',
      weight: part.weight || undefined,
      width: part.width || undefined,
      height: part.height || undefined,
      length: part.length || undefined,
      customizationOptions: { options: [] },
      images: [],
      sortingRank: part.sortingRank || 0,
      active: part.active || true,
      groups: part.groups?.map(g => g.id) || [],
      keywords: part.keywords || [],
      shippingReady: part.shippingReady || 'unknown',
      shippingDate: part.shippingDate || '',
      translations: {
        en: { title: '', description: '' },
        de: { title: '', description: '' },
        fr: { title: '', description: '' },
        it: { title: '', description: '' },
      },
    },
  });

  // Initialize form with existing part data
  useEffect(() => {
    if (part) {
      // Set basic fields
      setValue('price', parseFloat(part.price) || 10.0);
      setValue(
        'initialPrice',
        part.initialPrice ? parseFloat(part.initialPrice) : undefined
      );
      setValue('quantity', part.quantity || 100);
      setValue('type', part.type || '');
      setValue('weight', part.weight || undefined);
      setValue('width', part.width || undefined);
      setValue('height', part.height || undefined);
      setValue('length', part.length || undefined);
      setValue('sortingRank', part.sortingRank || 0);
      setValue('active', part.active || true);
      setValue('groups', part.groups?.map(g => g.id) || []);
      setValue('shippingReady', part.shippingReady || 'unknown');
      setValue(
        'shippingDate',
        part.shippingDate
          ? new Date(part.shippingDate).toISOString().slice(0, 16)
          : ''
      );

      // Set keywords
      setKeywords(part.keywords || []);

      // Set images
      setUploadedImages(part.images || []);

      // Set videos
      setUploadedVideos(part.videos || []);

      // Set translations
      const translations = {
        en: { title: '', description: '' },
        de: { title: '', description: '' },
        fr: { title: '', description: '' },
        it: { title: '', description: '' },
      };

      part.translations.forEach((translation) => {
        const lang = translation.language as keyof typeof translations;
        if (translations[lang]) {
          translations[lang] = {
            title: translation.title || '',
            description: translation.description || '',
          };
        }
      });

      setValue('translations', translations);

      // Set customization options (deep clone to avoid mutating the original part object)
      const customizationOptionsFromPart: CustomizationOption[] = JSON.parse(
        JSON.stringify(part.customizationOptions?.options || [])
      );
      console.log("[EditPart] part.customizationOptions received:", JSON.stringify(part.customizationOptions, null, 2));
      console.log("[EditPart] setting customizationOptions:", JSON.stringify(customizationOptionsFromPart, null, 2));
      setCustomizationOptions(customizationOptionsFromPart);

      // Store original values for comparison
      setOriginalValues({
        price: parseFloat(part.price) || 10.0,
        initialPrice: part.initialPrice
          ? parseFloat(part.initialPrice)
          : undefined,
        quantity: part.quantity || 100,
        type: part.type || '',
        weight: part.weight || undefined,
        width: part.width || undefined,
        height: part.height || undefined,
        length: part.length || undefined,
        sortingRank: part.sortingRank || 0,
        active: part.active || true,
        groups: part.groups?.map(g => g.id) || [],
        keywords: part.keywords || [],
        shippingReady: part.shippingReady || 'unknown',
        shippingDate: part.shippingDate || '',
        translations,
        customizationOptions: customizationOptionsFromPart,
        images: part.images || [],
        videos: part.videos || [],
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [part.id]);

  // Function to go to the next step
  const goToNextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Function to go to the previous step
  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Fetch groups and filament types
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch filament types
        const filamentTypesResponse = await axiosInstance.get<FilamentType[]>(
          '/filament-types',
          {
            headers: {
              'X-CSRF-Token': csrfToken,
            },
          }
        );
        const types = Array.isArray(filamentTypesResponse.data)
          ? filamentTypesResponse.data
          : [];
        setFilamentTypes(types);

        const [partGroupsResponse] = await Promise.all([
          axiosInstance.get<{ id: string; translations: Translation[] }[]>(
            '/groups/part-groups'
          ),
        ]);
        setPartGroups(partGroupsResponse.data);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      // Store the image files for later submission
      const newFiles = Array.from(files);
      setImageFiles((prev) => [...prev, ...newFiles]);

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

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      // Store the video files for later submission
      const newFiles = Array.from(files);
      setVideoFiles((prev) => [...prev, ...newFiles]);

      // Create temporary URLs for preview
      const previewUrls = newFiles.map((file) => URL.createObjectURL(file));
      setUploadedVideos((prev) => [...prev, ...previewUrls]);
    } catch (err) {
      console.error('Error handling videos:', err);
      setError('Failed to process videos');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const imageToRemove = uploadedImages[index];

    // If it's an existing image (URL), add to delete list
    if (imageToRemove && imageToRemove.startsWith('http')) {
      setImagesToDelete((prev) => [...prev, imageToRemove]);
    }

    // Remove from uploaded images
    const newImages = [...uploadedImages];
    newImages.splice(index, 1);
    setUploadedImages(newImages);

    // Remove from image files if it exists
    if (index < imageFiles.length) {
      const newFiles = [...imageFiles];
      newFiles.splice(index, 1);
      setImageFiles(newFiles);
    }
  };

  const removeVideo = (index: number) => {
    const videoToRemove = uploadedVideos[index];

    // If it's an existing video (URL), add to delete list
    if (videoToRemove && videoToRemove.startsWith('http')) {
      setVideosToDelete((prev) => [...prev, videoToRemove]);
    }

    // Remove from uploaded videos
    const newVideos = [...uploadedVideos];
    newVideos.splice(index, 1);
    setUploadedVideos(newVideos);

    // Remove from video files if it exists
    if (index < videoFiles.length) {
      const newFiles = [...videoFiles];
      newFiles.splice(index, 1);
      setVideoFiles(newFiles);
    }
  };

  const addCustomizationOption = () => {
    let newOption: CustomizationOption;

    if (optionType === 'inputfield') {
      newOption = {
        type: 'inputfield',
        translations: {
          en: { title: '', description: '' },
          de: { title: '', description: '' },
          fr: { title: '', description: '' },
          it: { title: '', description: '' },
        },
        priceAdjustment: 0,
        max: 50,
      };
    } else if (optionType === 'dropdown') {
      newOption = {
        type: 'dropdown',
        translations: {
          en: { title: '', description: '' },
          de: { title: '', description: '' },
          fr: { title: '', description: '' },
          it: { title: '', description: '' },
        },
        priceAdjustment: 0,
        items: [
          {
            id: generateId(),
            priceAdjustment: 0,
            translations: {
              en: { title: 'Option 1' },
              de: { title: 'Option 1' },
              fr: { title: 'Option 1' },
              it: { title: 'Option 1' },
            },
          },
        ],
      };
    } else if (optionType === 'powdercoatColors') {
      newOption = {
        type: 'powdercoatColors',
        translations: {
          en: { title: '', description: '' },
          de: { title: '', description: '' },
          fr: { title: '', description: '' },
          it: { title: '', description: '' },
        },
        priceAdjustment: 0,
      };
    } else if (optionType === 'filamentColor') {
      newOption = {
        type: 'filamentColor',
        translations: {
          en: { title: '', description: '' },
          de: { title: '', description: '' },
          fr: { title: '', description: '' },
          it: { title: '', description: '' },
        },
        priceAdjustment: 0,
        filamentTypeId: filamentTypes.length > 0 ? filamentTypes[0].name : '',
      };
    } else {
      newOption = {
        type: 'color',
        translations: {
          en: { title: '', description: '' },
          de: { title: '', description: '' },
          fr: { title: '', description: '' },
          it: { title: '', description: '' },
        },
        priceAdjustment: 0,
      };
    }

    setCustomizationOptions([...customizationOptions, newOption]);
  };

  const removeCustomizationOption = (index: number) => {
    const newOptions = [...customizationOptions];
    newOptions.splice(index, 1);
    setCustomizationOptions(newOptions);
  };

  const updateOptionTranslation = (
    optionIndex: number,
    language: string,
    field: 'title' | 'description',
    value: string
  ) => {
    const updatedOptions = [...customizationOptions];
    (updatedOptions[optionIndex].translations as Record<string, Translation>)[
      language
    ][field] = value;
    setCustomizationOptions(updatedOptions);
  };

  const updateOptionPriceAdjustment = (
    optionIndex: number,
    priceAdjustment: number
  ) => {
    const updatedOptions = [...customizationOptions];
    updatedOptions[optionIndex].priceAdjustment = priceAdjustment;
    setCustomizationOptions(updatedOptions);
  };

  const addDropdownItem = (optionIndex: number) => {
    const updatedOptions = [...customizationOptions];
    const option = updatedOptions[optionIndex] as DropdownOption;

    if (!option.items) {
      option.items = [];
    }

    option.items.push({
      id: generateId(),
      priceAdjustment: 0,
      translations: {
        en: { title: `Option ${option.items.length + 1}` },
        de: { title: `Option ${option.items.length + 1}` },
        fr: { title: `Option ${option.items.length + 1}` },
        it: { title: `Option ${option.items.length + 1}` },
      },
    });

    setCustomizationOptions(updatedOptions);
  };

  const removeDropdownItem = (optionIndex: number, itemIndex: number) => {
    const updatedOptions = [...customizationOptions];
    const option = updatedOptions[optionIndex] as DropdownOption;

    if (option.items && option.items.length > itemIndex) {
      option.items.splice(itemIndex, 1);
      setCustomizationOptions(updatedOptions);
    }
  };

  const updateDropdownItemTranslation = (
    optionIndex: number,
    itemIndex: number,
    language: string,
    value: string
  ) => {
    const updatedOptions = [...customizationOptions];
    const option = updatedOptions[optionIndex] as DropdownOption;

    if (option.items && option.items.length > itemIndex) {
      if (language === 'en') {
        option.items[itemIndex].translations.en.title = value;
      } else if (language === 'de') {
        option.items[itemIndex].translations.de.title = value;
      } else if (language === 'fr') {
        option.items[itemIndex].translations.fr.title = value;
      } else if (language === 'it') {
        option.items[itemIndex].translations.it.title = value;
      }

      setCustomizationOptions(updatedOptions);
    }
  };

  const updateDropdownItemPriceAdjustment = (
    optionIndex: number,
    itemIndex: number,
    priceAdjustment: number
  ) => {
    const updatedOptions = [...customizationOptions];
    const option = updatedOptions[optionIndex] as DropdownOption;

    if (option.items && option.items.length > itemIndex) {
      option.items[itemIndex].priceAdjustment = priceAdjustment;
      setCustomizationOptions(updatedOptions);
    }
  };

  const updateInputFieldMax = (optionIndex: number, max: number) => {
    const updatedOptions = [...customizationOptions];
    const option = updatedOptions[optionIndex] as InputFieldOption;
    option.max = max;
    setCustomizationOptions(updatedOptions);
  };

  const updateFilamentTypeId = (
    optionIndex: number,
    filamentTypeId: string
  ) => {
    const updatedOptions = [...customizationOptions];
    const option = updatedOptions[optionIndex] as FilamentColorOption;
    option.filamentTypeId = filamentTypeId;
    setCustomizationOptions(updatedOptions);
  };

  // Keyword management functions
  const addKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (index: number) => {
    const newKeywords = [...keywords];
    newKeywords.splice(index, 1);
    setKeywords(newKeywords);
  };

  const handleKeywordInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  // Helper function to check if arrays are equal
  const arraysEqual = (a: string[], b: string[]): boolean => {
    if (a.length !== b.length) return false;
    return a.every((val, index) => val === b[index]);
  };

  // Helper function to check if translation objects are equal
  const translationsEqual = (
    a: FormData['translations'],
    b: FormData['translations']
  ): boolean => {
    const languages = ['en', 'de', 'fr', 'it'] as const;
    return languages.every(
      (lang) =>
        a[lang].title === b[lang].title &&
        a[lang].description === b[lang].description
    );
  };

  // Helper function to check if customization options are equal
  const customizationOptionsEqual = (
    a: CustomizationOption[],
    b: CustomizationOption[]
  ): boolean => {
    return JSON.stringify(a) === JSON.stringify(b);
  };

  // Helper function to check if images are equal
  const imagesEqual = (a: string[], b: string[]): boolean => {
    if (a.length !== b.length) return false;
    return a.every((img, index) => img === b[index]);
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!originalValues) {
        setError('Original values not loaded');
        return;
      }

      // Create FormData object for submitting only changed data and files
      const formData = new FormData();
      let hasChanges = false;

      // Add new image files if any
      if (imageFiles.length > 0) {
        imageFiles.forEach((file) => {
          formData.append('files', file);
        });
        hasChanges = true;
      }

      // Add new video files if any
      if (videoFiles.length > 0) {
        videoFiles.forEach((file) => {
          formData.append('files', file);
        });
        hasChanges = true;
      }

      // Check for image changes (existing images)
      const currentImages = uploadedImages.filter(
        (img) => !img.startsWith('blob:') && !imagesToDelete.includes(img)
      );

      if (!imagesEqual(currentImages, originalValues.images)) {
        if (currentImages.length > 0) {
          // Send existing images as comma-separated string
          const existingImagesString = currentImages.join(',');
          formData.append('existingImages', existingImagesString);
        }
        // If currentImages is empty, don't append existingImages (backend will delete all)
        hasChanges = true;
      }

      // Check for video changes (existing videos)
      const currentVideos = uploadedVideos.filter(
        (vid) => !vid.startsWith('blob:') && !videosToDelete.includes(vid)
      );

      const originalVideos = originalValues.videos || [];
      if (!imagesEqual(currentVideos, originalVideos)) {
        if (currentVideos.length > 0) {
          // Send existing videos as comma-separated string
          const existingVideosString = currentVideos.join(',');
          formData.append('existingVideos', existingVideosString);
        }
        // If currentVideos is empty, don't append existingVideos (backend will delete all)
        hasChanges = true;
      }

      // Check for price changes
      if (data.price !== originalValues.price) {
        formData.append('price', data.price.toString());
        hasChanges = true;
      }

      // Check for initial price changes
      if (data.initialPrice !== originalValues.initialPrice) {
        if (data.initialPrice && data.initialPrice > 0) {
          formData.append('initialPrice', data.initialPrice.toString());
        } else {
          formData.append('initialPrice', '');
        }
        hasChanges = true;
      }

      // Check for quantity changes
      if (data.quantity !== originalValues.quantity) {
        formData.append(
          'quantity',
          parseInt(data.quantity.toString()).toString()
        );
        hasChanges = true;
      }

      // Check for type changes
      if (data.type !== originalValues.type) {
        formData.append('type', data.type);
        hasChanges = true;
      }

      // Check for weight changes
      if (data.weight !== originalValues.weight) {
        if (data.weight !== undefined && data.weight > 0) {
          formData.append('weight', data.weight.toString());
        } else {
          formData.append('weight', '');
        }
        hasChanges = true;
      }

      // Check for width changes
      if (data.width !== originalValues.width) {
        if (data.width !== undefined && data.width > 0) {
          formData.append('width', data.width.toString());
        } else {
          formData.append('width', '');
        }
        hasChanges = true;
      }

      // Check for height changes
      if (data.height !== originalValues.height) {
        if (data.height !== undefined && data.height > 0) {
          formData.append('height', data.height.toString());
        } else {
          formData.append('height', '');
        }
        hasChanges = true;
      }

      // Check for length changes
      if (data.length !== originalValues.length) {
        if (data.length !== undefined && data.length > 0) {
          formData.append('length', data.length.toString());
        } else {
          formData.append('length', '');
        }
        hasChanges = true;
      }

      // Check for sorting rank changes
      if (data.sortingRank !== originalValues.sortingRank) {
        formData.append(
          'sortingRank',
          parseInt(data.sortingRank.toString()).toString()
        );
        hasChanges = true;
      }

      // Check for active status changes
      if (data.active !== originalValues.active) {
        formData.append('active', Boolean(data.active).toString());
        hasChanges = true;
      }

      // Check for shipping ready changes
      if (data.shippingReady !== originalValues.shippingReady) {
        formData.append('shippingReady', data.shippingReady);
        hasChanges = true;
      }

      // Check for shipping date changes
      if (data.shippingDate !== originalValues.shippingDate) {
        if (data.shippingDate) {
          const isoDate = new Date(data.shippingDate).toISOString();
          formData.append('shippingDate', isoDate);
        } else {
          formData.append('shippingDate', '');
        }
        hasChanges = true;
      }

      // Check for groups changes
      // Normalize current groups to IDs for comparison
      const currentGroupIds = Array.isArray(data.groups)
        ? data.groups
            .map((group) => {
              if (typeof group === 'string') {
                return group;
              } else if (group && typeof group === 'object' && 'id' in group) {
                return (group as { id: string }).id;
              }
              return null;
            })
            .filter((id): id is string => Boolean(id))
        : [];

      if (!arraysEqual(currentGroupIds, originalValues.groups)) {
        if (currentGroupIds.length > 0) {
          const groupsString = currentGroupIds.join(',');
          formData.append('groups', groupsString);
        } else {
          formData.append('groups', '');
        }
        hasChanges = true;
      }

      // Check for keywords changes
      if (!arraysEqual(keywords, originalValues.keywords)) {
        formData.append('keywords', JSON.stringify(keywords));
        hasChanges = true;
      }

      // Check for translation changes
      if (!translationsEqual(data.translations, originalValues.translations)) {
        formData.append('translations', JSON.stringify(data.translations));
        hasChanges = true;
      }

      // Check for customization options changes
      if (
        !customizationOptionsEqual(
          customizationOptions,
          originalValues.customizationOptions
        )
      ) {
        formData.append(
          'customizationOptions',
          JSON.stringify({ options: customizationOptions })
        );
        hasChanges = true;
      }

      // If no changes detected, show message and return
      if (!hasChanges) {
        setSuccess('No changes detected - nothing to update');
        setTimeout(() => setSuccess(null), 3000);
        return;
      }

      // Log the form data for debugging
      console.log('Changed fields being submitted:');
      for (const [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
      }

      // Submit the form with only changed data and images as FormData
      const response = await axiosInstance.patch<Part>(
        `/parts/update/${part.id}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${storage.getItem('access_token')}`,
            'X-CSRF-Token': csrfToken,
          },
        }
      );

      setSuccess('Part updated successfully!');
      onUpdate(response.data);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: unknown) {
      console.error('Error updating part:', err);

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
        setError(message || 'Failed to update part');
      } else if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'NETWORK_ERROR'
      ) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to update part');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Edit Part</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 flex items-center gap-3">
              <AlertCircle className="text-red-500" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-lg bg-purple-100 p-4 flex items-center gap-3">
              <AlertCircle className="text-purple-600" />
              <p className="text-purple-800">{success}</p>
            </div>
          )}

          <form id="edit-part-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Step progress indicator */}
            <div className="flex justify-between mb-6">
              {['Basic Info', 'Translations', 'Images', 'Customization'].map(
                (step, index) => (
                  <div
                    key={step}
                    className={`flex flex-col items-center ${
                      index <= currentStep ? 'text-purple-700' : 'text-gray-400'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full ${
                        index <= currentStep ? 'bg-purple-700' : 'bg-gray-200'
                      } flex items-center justify-center text-white mb-1`}
                    >
                      {index + 1}
                    </div>
                    <span className="text-xs">{step}</span>
                  </div>
                )
              )}
            </div>

            <Tab.Group selectedIndex={currentStep} onChange={setCurrentStep}>
              <Tab.List className="sr-only">
                <Tab>Basic Information</Tab>
                <Tab>Translations</Tab>
                <Tab>Images</Tab>
                <Tab>Customization</Tab>
              </Tab.List>

              <Tab.Panels className="mt-4">
                {/* Basic Information Panel */}
                <Tab.Panel className="rounded-xl bg-white p-6 border border-gray-200">
                  <h3 className="text-lg font-medium mb-4">
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Price */}
                    <div>
                      <label
                        htmlFor="price"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Price (CHF)
                      </label>
                      <input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        className={`w-full rounded-md border ${
                          errors.price ? 'border-red-300' : 'border-gray-300'
                        } px-3 py-2`}
                        {...register('price', {
                          required: 'This field is required',
                          min: { value: 0, message: 'Price must be positive' },
                        })}
                      />
                      {errors.price && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.price.message}
                        </p>
                      )}
                    </div>

                    {/* Initial Price (optional) */}
                    <div>
                      <label
                        htmlFor="initialPrice"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Initial Price (CHF) - Optional
                      </label>
                      <input
                        id="initialPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        className={`w-full rounded-md border ${
                          errors.initialPrice
                            ? 'border-red-300'
                            : 'border-gray-300'
                        } px-3 py-2`}
                        {...register('initialPrice', {
                          min: {
                            value: 0,
                            message: 'Initial price must be positive',
                          },
                        })}
                        placeholder="Enter original price if on sale"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        If entered, this will show as crossed out with the
                        current price highlighted as a discount
                      </p>
                      {errors.initialPrice && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.initialPrice.message}
                        </p>
                      )}
                    </div>

                    {/* Quantity */}
                    <div>
                      <label
                        htmlFor="quantity"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Quantity in Stock
                      </label>
                      <input
                        id="quantity"
                        type="number"
                        className={`w-full rounded-md border ${
                          errors.quantity ? 'border-red-300' : 'border-gray-300'
                        } px-3 py-2`}
                        {...register('quantity', {
                          required: 'This field is required',
                          min: {
                            value: 0,
                            message: 'Quantity cannot be negative',
                          },
                        })}
                      />
                      {errors.quantity && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.quantity.message}
                        </p>
                      )}
                    </div>

                    {/* Type */}
                    <div>
                      <label
                        htmlFor="type"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Type
                      </label>
                      <input
                        id="type"
                        type="text"
                        className={`w-full rounded-md border ${
                          errors.type ? 'border-red-300' : 'border-gray-300'
                        } px-3 py-2`}
                        {...register('type', {
                          required: 'This field is required',
                        })}
                      />
                      {errors.type && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.type.message}
                        </p>
                      )}
                    </div>

                    {/* Sorting Rank */}
                    <div>
                      <label
                        htmlFor="sortingRank"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Sorting Rank
                      </label>
                      <input
                        id="sortingRank"
                        type="number"
                        className={`w-full rounded-md border ${
                          errors.sortingRank
                            ? 'border-red-300'
                            : 'border-gray-300'
                        } px-3 py-2`}
                        {...register('sortingRank', {
                          required: 'This field is required',
                        })}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Higher numbers appear first in the listing
                      </p>
                    </div>

                    {/* Weight */}
                    <div>
                      <label
                        htmlFor="weight"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Weight (g) - Optional
                      </label>
                      <input
                        id="weight"
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                        {...register('weight', {
                          min: { value: 0, message: 'Weight must be positive' },
                        })}
                        placeholder="Weight in grams"
                      />
                      {errors.weight && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.weight.message}
                        </p>
                      )}
                    </div>

                    {/* Width */}
                    <div>
                      <label
                        htmlFor="width"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Width (cm) - Optional
                      </label>
                      <input
                        id="width"
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                        {...register('width', {
                          min: { value: 0, message: 'Width must be positive' },
                        })}
                        placeholder="Width in cm"
                      />
                      {errors.width && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.width.message}
                        </p>
                      )}
                    </div>

                    {/* Height */}
                    <div>
                      <label
                        htmlFor="height"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Height (cm) - Optional
                      </label>
                      <input
                        id="height"
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                        {...register('height', {
                          min: { value: 0, message: 'Height must be positive' },
                        })}
                        placeholder="Height in cm"
                      />
                      {errors.height && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.height.message}
                        </p>
                      )}
                    </div>

                    {/* Length */}
                    <div>
                      <label
                        htmlFor="length"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Length (cm) - Optional
                      </label>
                      <input
                        id="length"
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                        {...register('length', {
                          min: { value: 0, message: 'Length must be positive' },
                        })}
                        placeholder="Length in cm"
                      />
                      {errors.length && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.length.message}
                        </p>
                      )}
                    </div>

                    {/* Shipping Ready Status */}
                    <div>
                      <label
                        htmlFor="shippingReady"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Shipping Status
                      </label>
                      <select
                        id="shippingReady"
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                        {...register('shippingReady')}
                      >
                        <option value="now">Ready to ship</option>
                        <option value="in_1_3_days">Ships in 1-3 days</option>
                        <option value="in_4_7_days">Ships in 4-7 days</option>
                        <option value="in_8_14_days">Ships in 8-14 days</option>
                        <option value="pre_order">Pre-order</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    </div>

                    {/* Shipping Date for Pre-order */}
                    {watch('shippingReady') === 'pre_order' && (
                      <div>
                        <label
                          htmlFor="shippingDate"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Expected Shipping Date
                        </label>
                        <input
                          type="datetime-local"
                          id="shippingDate"
                          className="w-full rounded-md border border-gray-300 px-3 py-2"
                          {...register('shippingDate')}
                        />
                      </div>
                    )}

                    {/* Groups */}
                    <div className="col-span-full">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Groups
                      </label>
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-1">
                            Part Groups
                          </h5>
                          {partGroups.map((group) => {
                            const enTranslation =
                              group.translations.find(
                                (t) => t.language === 'en'
                              ) || group.translations[0];
                            return (
                              <label
                                key={group.id}
                                className="flex items-center"
                              >
                                <input
                                  type="checkbox"
                                  value={group.id}
                                  className="h-4 w-4 rounded border-gray-300 text-purple-700 focus:ring-purple-600"
                                  {...register('groups')}
                                />
                                <span className="ml-2 text-sm text-gray-700">
                                  {enTranslation?.title || 'Untitled Group'}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Keywords */}
                    <div className="col-span-full">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Keywords
                      </label>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={keywordInput}
                            onChange={(e) => setKeywordInput(e.target.value)}
                            onKeyDown={handleKeywordInputKeyDown}
                            placeholder="Add a keyword..."
                            className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                          />
                          <button
                            type="button"
                            onClick={addKeyword}
                            className="px-4 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-800 flex items-center"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        {keywords.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {keywords.map((keyword, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800"
                              >
                                {keyword}
                                <button
                                  type="button"
                                  onClick={() => removeKeyword(index)}
                                  className="ml-1 text-purple-600 hover:text-purple-800"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-sm text-gray-500">
                          Keywords help users find your part more easily
                        </p>
                      </div>
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center">
                      <input
                        id="active"
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-purple-700 focus:ring-purple-600"
                        {...register('active')}
                      />
                      <label
                        htmlFor="active"
                        className="ml-2 text-sm text-gray-700"
                      >
                        Active (visible in shop)
                      </label>
                    </div>
                  </div>

                </Tab.Panel>

                {/* Translations Panel */}
                <Tab.Panel className="rounded-xl bg-white p-6 border border-gray-200">
                  <h3 className="text-lg font-medium mb-4">Translations</h3>
                  <div className="space-y-6">
                    {['en', 'de', 'fr', 'it'].map((language) => (
                      <div key={language} className="border-b pb-4">
                        <h3 className="font-medium text-gray-800 uppercase mb-3">
                          {language} Translation
                        </h3>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Title
                            </label>
                            <input
                              type="text"
                              className="w-full rounded-md border border-gray-300 px-3 py-2"
                              {...register(
                                `translations.${
                                  language as keyof FormData['translations']
                                }.title` as FieldPath<FormData>,
                                {
                                  required: 'Title is required',
                                }
                              )}
                            />
                            {errors.translations?.[
                              language as keyof FormData['translations']
                            ]?.title && (
                              <p className="mt-1 text-sm text-red-600">
                                {
                                  errors.translations[
                                    language as keyof FormData['translations']
                                  ]?.title?.message
                                }
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Description
                            </label>
                            <textarea
                              rows={3}
                              className="w-full rounded-md border border-gray-300 px-3 py-2"
                              {...register(
                                `translations.${
                                  language as keyof FormData['translations']
                                }.description` as FieldPath<FormData>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                </Tab.Panel>

                {/* Images Panel */}
                <Tab.Panel className="rounded-xl bg-white p-6 border border-gray-200">
                  <h3 className="text-lg font-medium mb-4">Upload Images & Videos</h3>
                  <div className="space-y-8">
                    {/* Images Upload */}
                    <div>
                      <h4 className="font-medium text-gray-800 mb-3">Images</h4>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
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
                            <Upload className="h-12 w-12 text-gray-400" />
                            <p className="mt-2 text-sm text-gray-600">
                              Click to upload images
                            </p>
                            <p className="text-xs text-gray-500">
                              PNG, JPG, GIF up to 10MB each
                            </p>
                          </div>
                        </label>
                      </div>

                      {uploading && (
                        <div className="flex justify-center mt-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
                        </div>
                      )}

                      {uploadedImages.length > 0 && (
                        <div className="mt-4">
                          <h3 className="font-medium text-gray-800 mb-3">
                            Images
                          </h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {uploadedImages.map((image, index) => (
                              <div key={index} className="relative">
                                <NextImage
                                  src={image}
                                  alt={`Part image ${index + 1}`}
                                  width={150}
                                  height={150}
                                  className="w-full h-32 object-cover rounded-lg border"
                                  unoptimized={true}
                                />
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

                    {/* Videos Upload */}
                    <div>
                      <h4 className="font-medium text-gray-800 mb-3">Videos (Optional)</h4>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          id="videos"
                          multiple
                          accept="video/*"
                          className="hidden"
                          onChange={handleVideoUpload}
                        />
                        <label htmlFor="videos" className="cursor-pointer">
                          <div className="flex flex-col items-center">
                            <Upload className="h-12 w-12 text-gray-400" />
                            <p className="mt-2 text-sm text-gray-600">
                              Click to upload videos
                            </p>
                            <p className="text-xs text-gray-500">
                              MP4, WebM, Ogg up to 100MB each
                            </p>
                          </div>
                        </label>
                      </div>

                      {uploadedVideos.length > 0 && (
                        <div className="mt-4">
                          <h3 className="font-medium text-gray-800 mb-3">
                            Videos
                          </h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {uploadedVideos.map((video, index) => (
                              <div key={index} className="relative">
                                <div className="w-full h-32 bg-black rounded-lg border flex items-center justify-center">
                                  <video
                                    src={video}
                                    controls
                                    className="max-h-32 max-w-full rounded"
                                    preload="metadata"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeVideo(index)}
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

                </Tab.Panel>

                {/* Customization Panel */}
                <Tab.Panel className="rounded-xl bg-white p-6 border border-gray-200">
                  <h3 className="text-lg font-medium mb-4">
                    Customization Options
                  </h3>
                  <div className="space-y-6">
                    <div className="flex items-end space-x-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Option Type
                        </label>
                        <select
                          className="w-full rounded-md border border-gray-300 px-3 py-2"
                          value={optionType}
                          onChange={(e) =>
                            setOptionType(
                              e.target.value as
                                | 'color'
                                | 'inputfield'
                                | 'dropdown'
                                | 'powdercoatColors'
                                | 'filamentColor'
                            )
                          }
                        >
                          <option value="inputfield">Input Field</option>
                          <option value="color">Color Picker</option>
                          <option value="powdercoatColors">
                            Powdercoat Colors
                          </option>
                          <option value="filamentColor">
                            Filament Color
                          </option>
                          <option value="dropdown">Dropdown</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={addCustomizationOption}
                        className="px-4 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-800 flex items-center"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Option
                      </button>
                    </div>

                    {customizationOptions.length > 0 ? (
                      <div className="space-y-6">
                        {customizationOptions.map((option, optionIndex) => (
                          <div
                            key={optionIndex}
                            className="border rounded-lg p-4 bg-gray-50 relative"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                removeCustomizationOption(optionIndex)
                              }
                              className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                            >
                              <Trash className="h-4 w-4" />
                            </button>

                            <div className="space-y-4">
                              {/* Option type badge */}
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-700 capitalize">
                                  {option.type} Option
                                </span>
                              </div>

                              {/* Price adjustment */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Price Adjustment (CHF)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="w-32 rounded-md border border-gray-300 px-3 py-2"
                                  value={option.priceAdjustment || 0}
                                  onChange={(e) =>
                                    updateOptionPriceAdjustment(
                                      optionIndex,
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                />
                              </div>

                              {/* Input field specific options */}
                              {option.type === 'inputfield' && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Maximum Characters
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    className="w-32 rounded-md border border-gray-300 px-3 py-2"
                                    value={
                                      (option as InputFieldOption).max || 50
                                    }
                                    onChange={(e) =>
                                      updateInputFieldMax(
                                        optionIndex,
                                        parseInt(e.target.value) || 50
                                      )
                                    }
                                  />
                                </div>
                              )}

                              {/* Translations for option */}
                              <div className="space-y-3">
                                <h4 className="text-sm font-medium text-gray-700">
                                  Option Translations
                                </h4>
                                {['en', 'de', 'fr', 'it'].map((lang) => (
                                  <div
                                    key={lang}
                                    className="grid grid-cols-2 gap-3"
                                  >
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">
                                        {lang.toUpperCase()} Title
                                      </label>
                                      <input
                                        type="text"
                                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                                        value={
                                          (
                                            option.translations as Record<
                                              string,
                                              Translation
                                            >
                                          )[lang]?.title || ''
                                        }
                                        onChange={(e) =>
                                          updateOptionTranslation(
                                            optionIndex,
                                            lang,
                                            'title',
                                            e.target.value
                                          )
                                        }
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">
                                        {lang.toUpperCase()} Description
                                      </label>
                                      <input
                                        type="text"
                                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                                        value={
                                          (
                                            option.translations as Record<
                                              string,
                                              Translation
                                            >
                                          )[lang]?.description || ''
                                        }
                                        onChange={(e) =>
                                          updateOptionTranslation(
                                            optionIndex,
                                            lang,
                                            'description',
                                            e.target.value
                                          )
                                        }
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Dropdown specific options */}
                              {option.type === 'dropdown' && (
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-medium text-gray-700">
                                      Dropdown Items
                                    </h4>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        addDropdownItem(optionIndex)
                                      }
                                      className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
                                    >
                                      Add Item
                                    </button>
                                  </div>
                                  {(option as DropdownOption).items?.map(
                                    (item, itemIndex) => (
                                      <div
                                        key={item.id}
                                        className="border rounded p-3 bg-white relative"
                                      >
                                        <button
                                          type="button"
                                          onClick={() =>
                                            removeDropdownItem(
                                              optionIndex,
                                              itemIndex
                                            )
                                          }
                                          className="absolute top-1 right-1 text-red-500 hover:text-red-700"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                        <div className="space-y-2">
                                          <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                              Price Adjustment (CHF)
                                            </label>
                                            <input
                                              type="number"
                                              step="0.01"
                                              className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
                                              value={item.priceAdjustment || 0}
                                              onChange={(e) =>
                                                updateDropdownItemPriceAdjustment(
                                                  optionIndex,
                                                  itemIndex,
                                                  parseFloat(e.target.value) ||
                                                    0
                                                )
                                              }
                                            />
                                          </div>
                                          {['en', 'de', 'fr', 'it'].map(
                                            (lang) => (
                                              <div key={lang}>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                  {lang.toUpperCase()} Title
                                                </label>
                                                <input
                                                  type="text"
                                                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                                                  value={
                                                    (
                                                      item.translations as Record<
                                                        string,
                                                        Translation
                                                      >
                                                    )[lang]?.title || ''
                                                  }
                                                  onChange={(e) =>
                                                    updateDropdownItemTranslation(
                                                      optionIndex,
                                                      itemIndex,
                                                      lang,
                                                      e.target.value
                                                    )
                                                  }
                                                />
                                              </div>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              )}

                              {option.type === 'filamentColor' && (
                                <div className="space-y-3">
                                  <div className="text-sm text-gray-600">
                                    <p className="font-medium mb-2">
                                      Filament Color
                                    </p>
                                    <p className="text-xs">
                                      This option will display all available
                                      filament colors for the selected filament
                                      type. Colors are managed in the
                                      &quot;Filament Colors&quot; section of the
                                      admin panel.
                                    </p>
                                  </div>

                                  <div className="mt-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Filament Type
                                    </label>
                                    <select
                                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                                      value={
                                        (
                                          option as FilamentColorOption
                                        ).filamentTypeId || ''
                                      }
                                      onChange={(e) =>
                                        updateFilamentTypeId(
                                          optionIndex,
                                          e.target.value
                                        )
                                      }
                                    >
                                      {filamentTypes.map((type) => (
                                        <option key={type.id} value={type.name}>
                                          {type.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              )}

                              {option.type === 'powdercoatColors' && (
                                <div className="space-y-3">
                                  <div className="text-sm text-gray-600">
                                    <p className="font-medium mb-2">
                                      Powdercoat Colors
                                    </p>
                                    <p className="text-xs">
                                      This option will display all available
                                      powdercoat colors for the customer to
                                      choose from. Colors are managed in the
                                      &quot;Powdercoat Colors&quot; section of
                                      the admin panel.
                                    </p>
                                  </div>

                                  <div className="mt-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Price Adjustment per Color (CHF)
                                    </label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                                      value={option.priceAdjustment ?? 0}
                                      onChange={(e) =>
                                        updateOptionPriceAdjustment(
                                          optionIndex,
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                      Additional cost when customer selects a
                                      powdercoat color
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No customization options added yet. Add one using the
                        button above.
                      </div>
                    )}
                  </div>

                </Tab.Panel>
              </Tab.Panels>
            </Tab.Group>
          </form>
        </div>
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-between items-center">
          <button
            type="button"
            onClick={goToPreviousStep}
            disabled={currentStep === 0}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous Step
          </button>
          <div className="flex items-center gap-3">
            {currentStep < totalSteps - 1 && (
              <button
                type="button"
                onClick={goToNextStep}
                className="px-6 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-800"
              >
                Next Step
              </button>
            )}
            <button
              type="submit"
              form="edit-part-form"
              disabled={loading}
              className="px-6 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-800 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditPart;
