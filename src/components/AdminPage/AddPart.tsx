import { useEffect, useState } from "react";
import storage from "@/lib/storage";
import { AlertCircle, Plus, Trash, Upload, X } from "lucide-react";
import { FieldPath, useForm } from "react-hook-form";
import { Tab } from "@headlessui/react";
import Image from "next/image";
import useAxios from "@/useAxios";

// Type definitions
interface Translation {
  title: string;
  description?: string;
  language?: string;
}

interface BaseCustomizationOption {
  type:
    | "color"
    | "inputfield"
    | "dropdown"
    | "powdercoatColors"
    | "filamentColor";
  translations: {
    de: Translation;
    en: Translation;
    fr: Translation;
    it: Translation;
  };
  priceAdjustment?: number; // Added for parts
}

interface InputFieldOption extends BaseCustomizationOption {
  type: "inputfield";
  max?: number;
}

interface DropdownOption extends BaseCustomizationOption {
  type: "dropdown";
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
  type: "color";
}

interface PowdercoatColorsOption extends BaseCustomizationOption {
  type: "powdercoatColors";
}

interface FilamentColorOption extends BaseCustomizationOption {
  type: "filamentColor";
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
  translations: {
    en: Translation;
    de: Translation;
    fr: Translation;
    it: Translation;
  };
}

// Part interface for copying
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
  active: boolean;
  sortingRank: number;
  translations: {
    language: string;
    title: string;
    description: string;
  }[];
  customizationOptions?: {
    options: CustomizationOption[];
  };
  keywords?: string[];
  groups?: PartGroup[];
}

interface Props {
  csrfToken: string;
  initialData?: Part;
  onSuccess?: () => void;
}

// Helper function to generate a unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

const AddPart: React.FC<Props> = ({ csrfToken, initialData, onSuccess }) => {
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
    "color" | "inputfield" | "dropdown" | "powdercoatColors" | "filamentColor"
  >("inputfield");
  const [filamentTypes, setFilamentTypes] = useState<FilamentType[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 4; // Reduced to 4 steps (no variations for parts)

  const [partGroups, setPartGroups] = useState<
    { id: string; translations: Translation[] }[]
  >([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState<string>("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      price: 10.0,
      initialPrice: undefined,
      quantity: 100,
      type: "",
      weight: undefined,
      width: undefined,
      height: undefined,
      length: undefined,
      customizationOptions: { options: [] },
      images: [],
      sortingRank: 0,
      active: true,
      groups: [],
      keywords: [],
      translations: {
        en: { title: "", description: "" },
        de: { title: "", description: "" },
        fr: { title: "", description: "" },
        it: { title: "", description: "" },
      },
    },
  });

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
          "/filament-types",
          {
            headers: {
              "X-CSRF-Token": csrfToken,
            },
          },
        );
        const types = Array.isArray(filamentTypesResponse.data)
          ? filamentTypesResponse.data
          : [];
        setFilamentTypes(types);

        const [partGroupsResponse] = await Promise.all([
          axiosInstance.get<{ id: string; translations: Translation[] }[]>(
            "/groups/part-groups",
          ), // Add this line to fetch part groups
        ]);
        setPartGroups(partGroupsResponse.data); // Store part groups
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data");
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-fill form when copying from initialData
  useEffect(() => {
    if (initialData) {
      // Convert translations array to object format
      const translationsObj = initialData.translations.reduce(
        (acc, t) => ({
          ...acc,
          [t.language]: { title: t.title, description: t.description || "" },
        }),
        {} as {
          en: Translation;
          de: Translation;
          fr: Translation;
          it: Translation;
        },
      );

      // Reset form with initial data
      reset({
        price: parseFloat(initialData.price),
        initialPrice: initialData.initialPrice
          ? parseFloat(initialData.initialPrice)
          : undefined,
        quantity: initialData.quantity,
        type: initialData.type || "",
        weight: initialData.weight,
        width: initialData.width,
        height: initialData.height,
        length: initialData.length,
        sortingRank: initialData.sortingRank,
        active: initialData.active,
        groups: initialData.groups?.map(g => g.id) || [],
        keywords: [],
        translations: translationsObj,
        customizationOptions: { options: [] },
        images: [],
      });

      // Deep clone customization options to avoid reference issues
      const clonedOptions: CustomizationOption[] = initialData.customizationOptions?.options
        ? JSON.parse(JSON.stringify(initialData.customizationOptions.options))
        : [];
      console.log("[AddPart] initialData.customizationOptions received:", JSON.stringify(initialData.customizationOptions, null, 2));
      console.log("[AddPart] setting customizationOptions:", JSON.stringify(clonedOptions, null, 2));
      setCustomizationOptions(clonedOptions);

      // Set keywords
      if (initialData.keywords) {
        setKeywords([...initialData.keywords]);
      }

      // Set image URLs for preview (but not files, as we're creating a new item)
      if (initialData.images && initialData.images.length > 0) {
        setUploadedImages([...initialData.images]);
      }
    }
  }, [initialData, reset]);

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
      console.error("Error handling images:", err);
      setError("Failed to process images");
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
      console.error("Error handling videos:", err);
      setError("Failed to process videos");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...uploadedImages];
    newImages.splice(index, 1);
    setUploadedImages(newImages);

    const newFiles = [...imageFiles];
    newFiles.splice(index, 1);
    setImageFiles(newFiles);
  };

  const removeVideo = (index: number) => {
    const newVideos = [...uploadedVideos];
    newVideos.splice(index, 1);
    setUploadedVideos(newVideos);

    const newFiles = [...videoFiles];
    newFiles.splice(index, 1);
    setVideoFiles(newFiles);
  };

  const addCustomizationOption = () => {
    let newOption: CustomizationOption;

    if (optionType === "inputfield") {
      newOption = {
        type: "inputfield",
        translations: {
          en: { title: "", description: "" },
          de: { title: "", description: "" },
          fr: { title: "", description: "" },
          it: { title: "", description: "" },
        },
        priceAdjustment: 0,
        max: 50,
      };
    } else if (optionType === "dropdown") {
      newOption = {
        type: "dropdown",
        translations: {
          en: { title: "", description: "" },
          de: { title: "", description: "" },
          fr: { title: "", description: "" },
          it: { title: "", description: "" },
        },
        priceAdjustment: 0,
        items: [
          {
            id: generateId(),
            priceAdjustment: 0,
            translations: {
              en: { title: "Option 1" },
              de: { title: "Option 1" },
              fr: { title: "Option 1" },
              it: { title: "Option 1" },
            },
          },
        ],
      };
    } else if (optionType === "powdercoatColors") {
      newOption = {
        type: "powdercoatColors",
        translations: {
          en: { title: "", description: "" },
          de: { title: "", description: "" },
          fr: { title: "", description: "" },
          it: { title: "", description: "" },
        },
        priceAdjustment: 0,
      };
    } else if (optionType === "filamentColor") {
      newOption = {
        type: "filamentColor",
        translations: {
          en: { title: "", description: "" },
          de: { title: "", description: "" },
          fr: { title: "", description: "" },
          it: { title: "", description: "" },
        },
        priceAdjustment: 0,
        filamentTypeId: filamentTypes.length > 0 ? filamentTypes[0].name : "",
      };
    } else {
      newOption = {
        type: "color",
        translations: {
          en: { title: "", description: "" },
          de: { title: "", description: "" },
          fr: { title: "", description: "" },
          it: { title: "", description: "" },
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
    field: "title" | "description",
    value: string,
  ) => {
    const updatedOptions = [...customizationOptions];
    (updatedOptions[optionIndex].translations as Record<string, Translation>)[
      language
    ][field] = value;
    setCustomizationOptions(updatedOptions);
  };

  const updateOptionPriceAdjustment = (
    optionIndex: number,
    priceAdjustment: number,
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
    value: string,
  ) => {
    const updatedOptions = [...customizationOptions];
    const option = updatedOptions[optionIndex] as DropdownOption;

    if (option.items && option.items.length > itemIndex) {
      if (language === "en") {
        option.items[itemIndex].translations.en.title = value;
      } else if (language === "de") {
        option.items[itemIndex].translations.de.title = value;
      } else if (language === "fr") {
        option.items[itemIndex].translations.fr.title = value;
      } else if (language === "it") {
        option.items[itemIndex].translations.it.title = value;
      }

      setCustomizationOptions(updatedOptions);
    }
  };

  const updateDropdownItemPriceAdjustment = (
    optionIndex: number,
    itemIndex: number,
    priceAdjustment: number,
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
    filamentTypeId: string,
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
      setKeywordInput("");
    }
  };

  const removeKeyword = (index: number) => {
    const newKeywords = [...keywords];
    newKeywords.splice(index, 1);
    setKeywords(newKeywords);
  };

  const handleKeywordInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addKeyword();
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Create FormData object for submitting both data and files
      const formData = new FormData();

      // Append each image file
      imageFiles.forEach((file) => {
        formData.append("files", file);
      });

      // Append each video file
      videoFiles.forEach((file) => {
        formData.append("files", file);
      });

      // Handle groups array as a comma-separated string
      if (Array.isArray(data.groups) && data.groups.length > 0) {
        const groupsString = data.groups.join(",");
        formData.append("groups", groupsString);
      } else {
        formData.append("groups", "");
      }

      // Handle numeric values
      formData.append("price", data.price.toString());
      if (data.initialPrice && data.initialPrice > 0) {
        formData.append("initialPrice", data.initialPrice.toString());
      }
      formData.append(
        "quantity",
        parseInt(data.quantity.toString()).toString(),
      );
      formData.append(
        "sortingRank",
        parseInt(data.sortingRank.toString()).toString(),
      );

      // Handle string values
      formData.append("type", data.type);

      // Handle optional dimension values
      if (data.weight !== undefined && data.weight > 0) {
        formData.append("weight", data.weight.toString());
      }
      if (data.width !== undefined && data.width > 0) {
        formData.append("width", data.width.toString());
      }
      if (data.height !== undefined && data.height > 0) {
        formData.append("height", data.height.toString());
      }
      if (data.length !== undefined && data.length > 0) {
        formData.append("length", data.length.toString());
      }

      // Handle boolean values
      formData.append("active", Boolean(data.active).toString());

      // Add keywords as JSON string
      formData.append("keywords", JSON.stringify(keywords));

      // Add translations as JSON string
      formData.append("translations", JSON.stringify(data.translations));

      // Add customization options as JSON string
      formData.append(
        "customizationOptions",
        JSON.stringify({ options: customizationOptions }),
      );

      // Log the form data for debugging
      console.log("Form data before submission:");
      for (const [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
      }

      // Submit the form with all data and images
      await axiosInstance.post<{ success: boolean }>("/parts", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${storage.getItem("access_token")}`,
          "X-CSRF-Token": csrfToken,
        },
      });

      setSuccess("Part created successfully!");
      reset();
      setUploadedImages([]);
      setUploadedVideos([]);
      setImageFiles([]);
      setVideoFiles([]);
      setCustomizationOptions([]);
      setKeywords([]);
      setKeywordInput("");

      // Call onSuccess callback if provided
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (err: unknown) {
      console.error("Error creating part:", err);

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
        setError(message || "Failed to create part");
      } else if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code === "NETWORK_ERROR"
      ) {
        setError("Network error. Please check your connection.");
      } else {
        setError("Failed to create part");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">
        {initialData ? "Copy Part" : "Add New Part"}
      </h2>

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

      <form id="add-part-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Step progress indicator */}
        <div className="flex justify-between mb-6">
          {["Basic Info", "Translations", "Images", "Customization"].map(
            (step, index) => (
              <div
                key={step}
                className={`flex flex-col items-center ${
                  index <= currentStep ? "text-amber-400" : "text-zinc-500"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full ${
                    index <= currentStep ? "bg-amber-600" : "bg-zinc-700"
                  } flex items-center justify-center text-white mb-1`}
                >
                  {index + 1}
                </div>
                <span className="text-xs">{step}</span>
              </div>
            ),
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
            <Tab.Panel className="rounded-xl bg-zinc-900 p-6 border border-zinc-700">
              <h3 className="text-lg font-medium mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Price */}
                <div>
                  <label
                    htmlFor="price"
                    className="block text-sm font-medium text-zinc-300 mb-1"
                  >
                    Price (CHF)
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
                      required: "This field is required",
                      min: { value: 0, message: "Price must be positive" },
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
                    className="block text-sm font-medium text-zinc-300 mb-1"
                  >
                    Initial Price (CHF) - Optional
                  </label>
                  <input
                    id="initialPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    className={`w-full rounded-md border ${
                      errors.initialPrice ? "border-red-300" : "border-zinc-700"
                    } px-3 py-2`}
                    {...register("initialPrice", {
                      min: {
                        value: 0,
                        message: "Initial price must be positive",
                      },
                    })}
                    placeholder="Enter original price if on sale"
                  />
                  <p className="mt-1 text-xs text-zinc-400">
                    If entered, this will show as crossed out with the current
                    price highlighted as a discount
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
                    className="block text-sm font-medium text-zinc-300 mb-1"
                  >
                    Quantity in Stock
                  </label>
                  <input
                    id="quantity"
                    type="number"
                    className={`w-full rounded-md border ${
                      errors.quantity ? "border-red-300" : "border-zinc-700"
                    } px-3 py-2`}
                    {...register("quantity", {
                      required: "This field is required",
                      min: { value: 0, message: "Quantity cannot be negative" },
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
                    className="block text-sm font-medium text-zinc-300 mb-1"
                  >
                    Type
                  </label>
                  <input
                    id="type"
                    type="text"
                    className={`w-full rounded-md border ${
                      errors.type ? "border-red-300" : "border-zinc-700"
                    } px-3 py-2`}
                    {...register("type", {
                      required: "This field is required",
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
                    className="block text-sm font-medium text-zinc-300 mb-1"
                  >
                    Sorting Rank
                  </label>
                  <input
                    id="sortingRank"
                    type="number"
                    className={`w-full rounded-md border ${
                      errors.sortingRank ? "border-red-300" : "border-zinc-700"
                    } px-3 py-2`}
                    {...register("sortingRank", {
                      required: "This field is required",
                    })}
                  />
                  <p className="mt-1 text-xs text-zinc-400">
                    Higher numbers appear first in the listing
                  </p>
                </div>

                {/* Weight */}
                <div>
                  <label
                    htmlFor="weight"
                    className="block text-sm font-medium text-zinc-300 mb-1"
                  >
                    Weight (g) - Optional
                  </label>
                  <input
                    id="weight"
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full rounded-md border border-zinc-700 px-3 py-2"
                    {...register("weight", {
                      min: { value: 0, message: "Weight must be positive" },
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
                    className="block text-sm font-medium text-zinc-300 mb-1"
                  >
                    Width (cm) - Optional
                  </label>
                  <input
                    id="width"
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full rounded-md border border-zinc-700 px-3 py-2"
                    {...register("width", {
                      min: { value: 0, message: "Width must be positive" },
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
                    className="block text-sm font-medium text-zinc-300 mb-1"
                  >
                    Height (cm) - Optional
                  </label>
                  <input
                    id="height"
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full rounded-md border border-zinc-700 px-3 py-2"
                    {...register("height", {
                      min: { value: 0, message: "Height must be positive" },
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
                    className="block text-sm font-medium text-zinc-300 mb-1"
                  >
                    Length (cm) - Optional
                  </label>
                  <input
                    id="length"
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full rounded-md border border-zinc-700 px-3 py-2"
                    {...register("length", {
                      min: { value: 0, message: "Length must be positive" },
                    })}
                    placeholder="Length in cm"
                  />
                  {errors.length && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.length.message}
                    </p>
                  )}
                </div>

                {/* Groups */}
                <div className="col-span-full">
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Groups
                  </label>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <h5 className="text-sm font-medium text-zinc-300 mb-1">
                        Part Groups
                      </h5>
                      {partGroups.map((group) => {
                        // Find English translation for display
                        const translation =
                          group.translations.find((t) => t.language === "en")
                            ?.title || "Untitled";
                        return (
                          <div key={group.id} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`partGroup-${group.id}`}
                              value={group.id}
                              className="h-4 w-4 rounded border-zinc-700 text-amber-400 focus:ring-purple-600"
                              {...register("groups")}
                            />
                            <label
                              htmlFor={`partGroup-${group.id}`}
                              className="ml-2 text-sm text-zinc-300"
                            >
                              {translation}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Keywords */}
                <div className="col-span-full">
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
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
                        className="flex-1 rounded-md border border-zinc-700 px-3 py-2 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={addKeyword}
                        className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 flex items-center"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    {keywords.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {keywords.map((keyword, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-amber-500/10 text-amber-300"
                          >
                            {keyword}
                            <button
                              type="button"
                              onClick={() => removeKeyword(index)}
                              className="ml-2 text-amber-400 hover:text-amber-300"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-zinc-400">
                      Keywords help users find your part more easily
                    </p>
                  </div>
                </div>

                {/* Active Status */}
                <div className="flex items-center">
                  <input
                    id="active"
                    type="checkbox"
                    className="h-4 w-4 rounded border-zinc-700 text-amber-400 focus:ring-purple-600"
                    {...register("active")}
                  />
                  <label
                    htmlFor="active"
                    className="ml-2 text-sm text-zinc-300"
                  >
                    Active (visible in shop)
                  </label>
                </div>
              </div>

            </Tab.Panel>

            {/* Translations Panel */}
            <Tab.Panel className="rounded-xl bg-zinc-900 p-6 border border-zinc-700">
              <h3 className="text-lg font-medium mb-4">Translations</h3>
              <div className="space-y-6">
                {["en", "de", "fr", "it"].map((language) => (
                  <div key={language} className="border-b pb-4">
                    <h3 className="font-medium text-zinc-200 uppercase mb-3">
                      {language} Translation
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">
                          Title
                        </label>
                        <input
                          type="text"
                          className="w-full rounded-md border border-zinc-700 px-3 py-2"
                          {...register(
                            `translations.${language}.title` as FieldPath<FormData>,
                          )}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">
                          Description
                        </label>
                        <textarea
                          rows={3}
                          className="w-full rounded-md border border-zinc-700 px-3 py-2"
                          {...register(
                            `translations.${language}.description` as FieldPath<FormData>,
                          )}
                        ></textarea>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </Tab.Panel>

            {/* Images Panel */}
            <Tab.Panel className="rounded-xl bg-zinc-900 p-6 border border-zinc-700">
              <h3 className="text-lg font-medium mb-4">
                Upload Images & Videos
              </h3>
              <div className="space-y-8">
                {/* Images Upload */}
                <div>
                  <h4 className="font-medium text-zinc-200 mb-3">Images</h4>
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
                          PNG, JPG, GIF up to 10MB each
                        </p>
                      </div>
                    </label>
                  </div>

                  {uploading && (
                    <div className="flex justify-center mt-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
                    </div>
                  )}

                  {uploadedImages.length > 0 && (
                    <div className="mt-4">
                      <h3 className="font-medium text-zinc-200 mb-3">
                        Uploaded Images
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {uploadedImages.map((image, index) => (
                          <div
                            key={index}
                            className="relative rounded-lg overflow-hidden border border-zinc-700 group"
                          >
                            <div className="h-32 w-full relative">
                              <Image
                                src={image}
                                alt={`Uploaded image ${index + 1}`}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
                  <h4 className="font-medium text-zinc-200 mb-3">
                    Videos (Optional)
                  </h4>
                  <div className="border-2 border-dashed border-zinc-700 rounded-lg p-6 text-center">
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
                        <Upload className="h-12 w-12 text-zinc-500" />
                        <p className="mt-2 text-sm text-zinc-400">
                          Click to upload videos
                        </p>
                        <p className="text-xs text-zinc-400">
                          MP4, WebM, Ogg up to 100MB each
                        </p>
                      </div>
                    </label>
                  </div>

                  {uploadedVideos.length > 0 && (
                    <div className="mt-4">
                      <h3 className="font-medium text-zinc-200 mb-3">
                        Uploaded Videos
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {uploadedVideos.map((video, index) => (
                          <div
                            key={index}
                            className="relative rounded-lg overflow-hidden border border-zinc-700 group"
                          >
                            <div className="h-32 w-full relative bg-black flex items-center justify-center">
                              <video
                                src={video}
                                controls
                                className="max-h-32 max-w-full"
                                preload="metadata"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeVideo(index)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
            <Tab.Panel className="rounded-xl bg-zinc-900 p-6 border border-zinc-700">
              <h3 className="text-lg font-medium mb-4">
                Customization Options
              </h3>
              <div className="space-y-6">
                <div className="flex items-end space-x-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                      Option Type
                    </label>
                    <select
                      className="w-full rounded-md border border-zinc-700 px-3 py-2"
                      value={optionType}
                      onChange={(e) =>
                        setOptionType(
                          e.target.value as
                            | "color"
                            | "inputfield"
                            | "dropdown"
                            | "powdercoatColors"
                            | "filamentColor",
                        )
                      }
                    >
                      <option value="inputfield">Input Field</option>
                      <option value="color">Color Picker</option>
                      <option value="powdercoatColors">
                        Powdercoat Colors
                      </option>
                      <option value="filamentColor">Filament Color</option>
                      <option value="dropdown">Dropdown</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={addCustomizationOption}
                    className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 flex items-center"
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
                        className="border rounded-lg p-4 bg-zinc-800 relative"
                      >
                        <button
                          type="button"
                          onClick={() => removeCustomizationOption(optionIndex)}
                          className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                        >
                          <Trash className="h-4 w-4" />
                        </button>

                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium text-zinc-200 mb-2">
                                Option Type: {option.type}
                              </h4>

                              {/* Price Adjustment */}
                              <div className="mt-2">
                                <label className="block text-sm font-medium text-zinc-300 mb-1">
                                  Price Adjustment (CHF)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="w-full rounded-md border border-zinc-700 px-3 py-2"
                                  value={option.priceAdjustment ?? 0}
                                  onChange={(e) =>
                                    updateOptionPriceAdjustment(
                                      optionIndex,
                                      parseFloat(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>

                              {/* Option translations */}
                              <div className="space-y-3 mt-4">
                                {["en", "de", "fr", "it"].map((language) => (
                                  <div key={language} className="space-y-2">
                                    <div className="flex items-center">
                                      <span className="text-xs font-semibold bg-zinc-700 px-2 py-1 rounded mr-2 uppercase">
                                        {language}
                                      </span>
                                      <input
                                        type="text"
                                        placeholder={`${language.toUpperCase()} Title`}
                                        className="flex-1 rounded-md border border-zinc-700 px-3 py-1 text-sm"
                                        value={
                                          option.translations[
                                            language as keyof typeof option.translations
                                          ]?.title || ""
                                        }
                                        onChange={(e) =>
                                          updateOptionTranslation(
                                            optionIndex,
                                            language,
                                            "title",
                                            e.target.value,
                                          )
                                        }
                                      />
                                    </div>
                                    <input
                                      type="text"
                                      placeholder={`${language.toUpperCase()} Description (Optional)`}
                                      className="w-full rounded-md border border-zinc-700 px-3 py-1 text-sm"
                                      value={
                                        option.translations[
                                          language as keyof typeof option.translations
                                        ]?.description || ""
                                      }
                                      onChange={(e) =>
                                        updateOptionTranslation(
                                          optionIndex,
                                          language,
                                          "description",
                                          e.target.value,
                                        )
                                      }
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div>
                              {/* Type-specific settings */}
                              {option.type === "inputfield" && (
                                <div>
                                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                                    Maximum Characters
                                  </label>
                                  <input
                                    type="number"
                                    className="w-full rounded-md border border-zinc-700 px-3 py-2"
                                    value={
                                      (option as InputFieldOption).max || 50
                                    }
                                    onChange={(e) =>
                                      updateInputFieldMax(
                                        optionIndex,
                                        parseInt(e.target.value),
                                      )
                                    }
                                    min="1"
                                  />
                                </div>
                              )}

                              {option.type === "dropdown" && (
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center">
                                    <h5 className="font-medium text-zinc-300">
                                      Dropdown Items
                                    </h5>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        addDropdownItem(optionIndex)
                                      }
                                      className="text-xs px-2 py-1 bg-blue-600 text-white rounded flex items-center"
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Add Item
                                    </button>
                                  </div>

                                  {(option as DropdownOption).items?.map(
                                    (item, itemIndex) => (
                                      <div
                                        key={item.id}
                                        className="border rounded p-2 bg-zinc-900 relative"
                                      >
                                        <button
                                          type="button"
                                          onClick={() =>
                                            removeDropdownItem(
                                              optionIndex,
                                              itemIndex,
                                            )
                                          }
                                          className="absolute top-1 right-1 text-red-500 hover:text-red-700"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>

                                        {/* Price adjustment for this item */}
                                        <div className="mb-2">
                                          <label className="block text-xs font-medium text-zinc-300">
                                            Price Adjustment (CHF)
                                          </label>
                                          <input
                                            type="number"
                                            step="0.01"
                                            className="w-full rounded-md border border-zinc-700 px-2 py-1 text-sm"
                                            value={item.priceAdjustment}
                                            onChange={(e) =>
                                              updateDropdownItemPriceAdjustment(
                                                optionIndex,
                                                itemIndex,
                                                parseFloat(e.target.value) || 0,
                                              )
                                            }
                                          />
                                        </div>

                                        <div className="space-y-2 pt-2">
                                          {["en", "de", "fr", "it"].map(
                                            (language) => (
                                              <div
                                                key={language}
                                                className="flex items-center space-x-2"
                                              >
                                                <span className="text-xs font-semibold uppercase w-8">
                                                  {language}
                                                </span>
                                                <input
                                                  type="text"
                                                  className="flex-1 rounded-md border border-zinc-700 px-2 py-1 text-sm"
                                                  value={
                                                    item.translations[
                                                      language as keyof typeof item.translations
                                                    ]?.title || ""
                                                  }
                                                  onChange={(e) =>
                                                    updateDropdownItemTranslation(
                                                      optionIndex,
                                                      itemIndex,
                                                      language,
                                                      e.target.value,
                                                    )
                                                  }
                                                />
                                              </div>
                                            ),
                                          )}
                                        </div>
                                      </div>
                                    ),
                                  )}
                                </div>
                              )}

                              {option.type === "powdercoatColors" && (
                                <div className="space-y-3">
                                  <div className="text-sm text-zinc-400">
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
                                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                                      Price Adjustment per Color (CHF)
                                    </label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      className="w-full rounded-md border border-zinc-700 px-3 py-2"
                                      value={option.priceAdjustment ?? 0}
                                      onChange={(e) =>
                                        updateOptionPriceAdjustment(
                                          optionIndex,
                                          parseFloat(e.target.value) || 0,
                                        )
                                      }
                                    />
                                    <p className="text-xs text-zinc-400 mt-1">
                                      Additional cost when customer selects a
                                      powdercoat color
                                    </p>
                                  </div>
                                </div>
                              )}

                              {option.type === "filamentColor" && (
                                <div className="space-y-3">
                                  <div className="text-sm text-zinc-400">
                                    <p className="font-medium mb-2">
                                      Filament Color
                                    </p>
                                    <p className="text-xs">
                                      This option will display all available
                                      colors for the selected filament type.
                                      Colors are managed in the &quot;Filament
                                      Colors&quot; section of the admin panel.
                                    </p>
                                  </div>

                                  <div className="mt-3">
                                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                                      Filament Type
                                    </label>
                                    <select
                                      className="w-full rounded-md border border-zinc-700 px-3 py-2"
                                      value={
                                        (option as FilamentColorOption)
                                          .filamentTypeId || ""
                                      }
                                      onChange={(e) =>
                                        updateFilamentTypeId(
                                          optionIndex,
                                          e.target.value,
                                        )
                                      }
                                    >
                                      {filamentTypes.length === 0 ? (
                                        <option value="">
                                          No filament types available
                                        </option>
                                      ) : (
                                        filamentTypes.map((type) => (
                                          <option
                                            key={type.id}
                                            value={type.name}
                                          >
                                            {type.name}
                                          </option>
                                        ))
                                      )}
                                    </select>
                                    <p className="text-xs text-zinc-400 mt-1">
                                      Select which filament type&apos;s colors
                                      to display
                                    </p>
                                  </div>

                                  <div className="mt-3">
                                    <label className="block text-sm font-medium text-zinc-300 mb-1">
                                      Price Adjustment per Color (CHF)
                                    </label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      className="w-full rounded-md border border-zinc-700 px-3 py-2"
                                      value={option.priceAdjustment ?? 0}
                                      onChange={(e) =>
                                        updateOptionPriceAdjustment(
                                          optionIndex,
                                          parseFloat(e.target.value) || 0,
                                        )
                                      }
                                    />
                                    <p className="text-xs text-zinc-400 mt-1">
                                      Additional cost when customer selects a
                                      color
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-zinc-400">
                    No customization options added yet. Add one using the button
                    above.
                  </div>
                )}
              </div>

            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </form>
      <div className="sticky bottom-0 bg-zinc-900 border-t px-6 py-4 flex justify-between items-center">
        <button
          type="button"
          onClick={goToPreviousStep}
          disabled={currentStep === 0}
          className="px-6 py-2 bg-zinc-700 text-zinc-300 rounded-md hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous Step
        </button>
        <div className="flex items-center gap-3">
          {currentStep < totalSteps - 1 && (
            <button
              type="button"
              onClick={goToNextStep}
              className="px-6 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700"
            >
              Next Step
            </button>
          )}
          <button
            type="submit"
            form="add-part-form"
            disabled={loading}
            className="px-6 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:bg-zinc-600 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              "Create Part"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddPart;
