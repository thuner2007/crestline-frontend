import { useEffect, useState } from "react";
import storage from "@/lib/storage";
import { AlertCircle, Plus, Trash, Upload, X } from "lucide-react";
import { FieldPath, useForm } from "react-hook-form";
import { Tab } from "@headlessui/react";
import Image from "next/image";
import {
  DropdownOption,
  InputFieldOption,
} from "@/types/sticker/customizazion.type";
import useAxios from "@/useAxios";

interface SubgroupWithGroups extends SubgroupWithTranslations {
  groups?: {
    id: string;
  }[];
}

interface SubgroupTranslation {
  id: string;
  language: string;
  title: string;
  subgroupId: string;
}

// Type definitions
interface Translation {
  title: string;
  description?: string;
}

interface CustomizationOption {
  type: "color" | "inputfield" | "vinylColors" | "dropdown";
  translations: {
    de: Translation;
    en: Translation;
    fr: Translation;
    it: Translation;
  };
  max?: number; // For inputfield
  items?: {
    id: string;
    translations: {
      de: Translation;
      en: Translation;
      fr: Translation;
      it: Translation;
    };
  }[]; // For dropdown
  applicableTo: "vinyl" | "printable" | "both";
}

interface Group {
  id: string;
  translations: {
    id: string;
    groupId: string;
    language: string;
    title: string;
  }[];
  subgroups: {
    id: string;
    createdAt: string;
    translations?: {
      id: string;
      subgroupId: string;
      language: string;
      title: string;
    }[];
  }[];
}

interface SubgroupWithTranslations {
  id: string;
  translations: {
    id: string;
    subgroupId: string;
    language: string;
    title: string;
  }[];
}

interface FormData {
  pricePerCm2Printable: number;
  pricePerCm2Vinyl: number;
  generalPrice?: number;
  quantity: number;
  printable: boolean;
  vinyl: boolean;
  standardMethod: "vinyl" | "printable";
  customizationOptions: {
    options: CustomizationOption[];
  };
  images: string[];
  sortingRank: number;
  widthToHeightRatio?: number;
  active: boolean;
  textToWidthResponsiveness: boolean;
  groups: string[];
  subgroups: string[];
  keywords: string[];
  variationsGroupId?: string;
  defaultInVariation: boolean;
  translations: {
    en: Translation;
    de: Translation;
    fr: Translation;
    it: Translation;
  };
}

interface Props {
  csrfToken: string;
}

// Helper function to generate a unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

const AddSticker: React.FC<Props> = ({ csrfToken }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [subgroups, setSubgroups] = useState<SubgroupWithTranslations[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const axiosInstance = useAxios();
  const [customizationOptions, setCustomizationOptions] = useState<
    CustomizationOption[]
  >([]);
  const [applicableToValue, setApplicableToValue] = useState<
    "vinyl" | "printable" | "both"
  >("both");
  const [optionType, setOptionType] = useState<
    "color" | "inputfield" | "vinylColors" | "dropdown"
  >("inputfield");
  const [availableSubgroups, setAvailableSubgroups] = useState<
    { id: string; title: string; groupId: string }[]
  >([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]); // Add this new state variable
  const [variations, setVariations] = useState<{ id: string; name: string }[]>(
    []
  );
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(0);
  const [pricingMode, setPricingMode] = useState<"fixed" | "perCm2">("perCm2");
  const totalSteps = 5; // Total number of steps (tabs)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      pricePerCm2Printable: 0.1,
      pricePerCm2Vinyl: 0.15,
      generalPrice: 10,
      quantity: 100,
      printable: true,
      vinyl: true,
      standardMethod: "printable",
      customizationOptions: { options: [] },
      images: [],
      sortingRank: 0,
      widthToHeightRatio: 1,
      active: true,
      textToWidthResponsiveness: false,
      groups: [],
      subgroups: [],
      keywords: [],
      defaultInVariation: false,
      translations: {
        en: { title: "", description: "" },
        de: { title: "", description: "" },
        fr: { title: "", description: "" },
        it: { title: "", description: "" },
      },
    },
  });

  const watchGroups = watch("groups");

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

  // Fetch groups and subgroups
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [groupsResponse, subgroupsResponse, variationsResponse] =
          await Promise.all([
            axiosInstance.get<Group[]>("/groups"),
            axiosInstance.get<SubgroupWithGroups[]>("/groups/subgroups/all"),
            axiosInstance.get<{ id: string; name: string }[]>("/variations"),
          ]);

        setGroups(groupsResponse.data);
        setSubgroups(subgroupsResponse.data);
        setVariations(variationsResponse.data);

        // Extract and flatten all subgroups with their group info
        const allSubgroups: { id: string; title: string; groupId: string }[] =
          [];

        // Process subgroups from the dedicated endpoint
        subgroupsResponse.data.forEach((subgroup: SubgroupWithGroups) => {
          const enTranslation =
            subgroup.translations.find(
              (t: SubgroupTranslation) => t.language === "en"
            )?.title || "Untitled";
          // Get the groupId from the first group in the groups array
          const groupId =
            subgroup.groups && subgroup.groups.length > 0
              ? subgroup.groups[0].id
              : "";

          allSubgroups.push({
            id: subgroup.id,
            title: enTranslation,
            groupId: groupId,
          });
        });

        setAvailableSubgroups(allSubgroups);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data");
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update available subgroups when selected groups change
  useEffect(() => {
    if (watchGroups && watchGroups.length > 0) {
      // Filter subgroups to only those belonging to selected groups
      const filtered = subgroups
        .filter((subgroup: SubgroupWithGroups) => {
          // Check if the subgroup belongs to any of the selected groups
          return (
            subgroup.groups &&
            subgroup.groups.some((group: { id: string }) =>
              watchGroups.includes(group.id)
            )
          );
        })
        .map((subgroup: SubgroupWithGroups) => {
          const enTranslation =
            subgroup.translations.find(
              (t: SubgroupTranslation) => t.language === "en"
            )?.title || "Untitled";
          const groupId =
            subgroup.groups && subgroup.groups.length > 0
              ? subgroup.groups[0].id
              : "";

          return {
            id: subgroup.id,
            title: enTranslation,
            groupId: groupId,
          };
        });

      setAvailableSubgroups(filtered);
    } else {
      // Reset to all subgroups
      const allSubgroups: { id: string; title: string; groupId: string }[] = [];

      subgroups.forEach((subgroup: SubgroupWithGroups) => {
        const enTranslation =
          subgroup.translations.find(
            (t: SubgroupTranslation) => t.language === "en"
          )?.title || "Untitled";
        const groupId =
          subgroup.groups && subgroup.groups.length > 0
            ? subgroup.groups[0].id
            : "";

        allSubgroups.push({
          id: subgroup.id,
          title: enTranslation,
          groupId: groupId,
        });
      });

      setAvailableSubgroups(allSubgroups);
    }
  }, [watchGroups, subgroups]);

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

      // Don't need to post the images separately anymore
    } catch (err) {
      console.error("Error handling images:", err);
      setError("Failed to process images");
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

  const addCustomizationOption = () => {
    let newOption: CustomizationOption = {
      type: optionType,
      translations: {
        en: { title: "", description: "" },
        de: { title: "", description: "" },
        fr: { title: "", description: "" },
        it: { title: "", description: "" },
      },
      applicableTo: applicableToValue, // Add the applicableTo property
    };

    // Add specific properties based on type
    if (optionType === "inputfield") {
      newOption = { ...newOption, max: 50 };
    } else if (optionType === "dropdown") {
      newOption = {
        ...newOption,
        items: [
          {
            id: generateId(),
            translations: {
              en: { title: "Option 1" },
              de: { title: "Option 1" },
              fr: { title: "Option 1" },
              it: { title: "Option 1" },
            },
          },
        ],
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
    value: string
  ) => {
    const updatedOptions = [...customizationOptions];
    (updatedOptions[optionIndex].translations as Record<string, Translation>)[
      language
    ][field] = value;
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
      // Fix the property access - use a safer approach
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

  const updateInputFieldMax = (optionIndex: number, max: number) => {
    const updatedOptions = [...customizationOptions];
    const option = updatedOptions[optionIndex] as InputFieldOption;
    option.max = max;
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
    e: React.KeyboardEvent<HTMLInputElement>
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
        formData.append("images", file);
      });

      // Handle groups array as a comma-separated string
      if (Array.isArray(data.groups) && data.groups.length > 0) {
        // Join the group UUIDs with commas
        const groupsString = data.groups.join(",");
        formData.append("groups", groupsString);
      } else {
        // Empty groups
        formData.append("groups", "");
      }

      // Handle subgroups array as a comma-separated string
      if (Array.isArray(data.subgroups) && data.subgroups.length > 0) {
        // Join the subgroup UUIDs with commas
        const subgroupsString = data.subgroups.join(",");
        formData.append("subgroups", subgroupsString);
      } else {
        // Empty subgroups
        formData.append("subgroups", "");
      }

      // Handle numeric values - parse as integers or floats where needed
      if (pricingMode === "perCm2") {
        formData.append(
          "pricePerCm2Printable",
          data.pricePerCm2Printable.toString()
        );
        formData.append("pricePerCm2Vinyl", data.pricePerCm2Vinyl.toString());
      } else {
        // For fixed pricing mode, send generalPrice
        if (data.generalPrice !== undefined) {
          formData.append("generalPrice", data.generalPrice.toString());
        }
      }
      formData.append(
        "quantity",
        parseInt(data.quantity.toString()).toString()
      ); // Convert to integer
      formData.append(
        "sortingRank",
        parseInt(data.sortingRank.toString()).toString()
      ); // Convert to integer
      if (data.widthToHeightRatio) {
        formData.append(
          "widthToHeightRatio",
          data.widthToHeightRatio.toString()
        );
      }

      // Ensure boolean values are correctly formatted as boolean strings
      // The backend will parse these string values as booleans
      formData.append("printable", Boolean(data.printable).toString());
      formData.append("vinyl", Boolean(data.vinyl).toString());
      formData.append("active", Boolean(data.active).toString());
      formData.append(
        "textToWidthResponsiveness",
        Boolean(data.textToWidthResponsiveness).toString()
      );

      // Fix for defaultInVariation - ensure it's a proper boolean string
      const defaultInVariation = Boolean(data.defaultInVariation);
      formData.append("defaultInVariation", defaultInVariation.toString());

      // Add standard method if available
      if (data.standardMethod) {
        formData.append("standardMethod", data.standardMethod);
      }

      // Add variation group ID if available
      if (data.variationsGroupId) {
        formData.append("variationsGroupId", data.variationsGroupId);
      }

      // Add keywords as JSON string
      formData.append("keywords", JSON.stringify(keywords));

      // Add translations as JSON string
      formData.append("translations", JSON.stringify(data.translations));

      // Add customization options as JSON string
      formData.append(
        "customizationOptions",
        JSON.stringify({ options: customizationOptions })
      );

      // Log the form data for debugging
      console.log("Form data before submission:");
      for (const [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
      }

      // Submit the form with all data and images
      await axiosInstance.post<{ success: boolean }>("/stickers", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${storage.getItem("access_token")}`,
          "X-CSRF-Token": csrfToken,
        },
      });

      setSuccess("Sticker created successfully!");
      reset();
      setUploadedImages([]);
      setImageFiles([]);
      setCustomizationOptions([]);
      setKeywords([]);
      setKeywordInput("");
      setPricingMode("perCm2");
    } catch (err: unknown) {
      // Change from any to unknown
      console.error("Error creating sticker:", err);

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
        setError(message || "Failed to create sticker");
      } else if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code === "NETWORK_ERROR"
      ) {
        setError("Network error. Please check your connection.");
      } else {
        setError("Failed to create sticker");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Add New Sticker</h2>

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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Step progress indicator */}
        <div className="flex justify-between mb-6">
          {[
            "Basic Info",
            "Translations",
            "Images",
            "Customization",
            "Categories",
          ].map((step, index) => (
            <div
              key={step}
              className={`flex flex-col items-center ${
                index <= currentStep ? "text-purple-700" : "text-gray-400"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full ${
                  index <= currentStep ? "bg-purple-700" : "bg-gray-200"
                } flex items-center justify-center text-white mb-1`}
              >
                {index + 1}
              </div>
              <span className="text-xs">{step}</span>
            </div>
          ))}
        </div>

        <Tab.Group selectedIndex={currentStep} onChange={setCurrentStep}>
          <Tab.List className="sr-only">
            <Tab>Basic Information</Tab>
            <Tab>Translations</Tab>
            <Tab>Images</Tab>
            <Tab>Customization</Tab>
            <Tab>Categories</Tab>
          </Tab.List>

          <Tab.Panels className="mt-4">
            {/* Basic Information Panel */}
            <Tab.Panel className="rounded-xl bg-white p-6 border border-gray-200">
              <h3 className="text-lg font-medium mb-4">Basic Information</h3>

              {/* Pricing Mode Switch */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Pricing Mode
                </label>
                <div className="flex space-x-4">
                  <div className="flex items-center">
                    <input
                      id="pricingModePerCm2"
                      type="radio"
                      name="pricingMode"
                      value="perCm2"
                      checked={pricingMode === "perCm2"}
                      onChange={() => setPricingMode("perCm2")}
                      className="h-4 w-4 border-gray-300 text-purple-700 focus:ring-purple-600"
                    />
                    <label
                      htmlFor="pricingModePerCm2"
                      className="ml-2 text-sm text-gray-700"
                    >
                      Price per cm²
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      id="pricingModeFixed"
                      type="radio"
                      name="pricingMode"
                      value="fixed"
                      checked={pricingMode === "fixed"}
                      onChange={() => setPricingMode("fixed")}
                      className="h-4 w-4 border-gray-300 text-purple-700 focus:ring-purple-600"
                    />
                    <label
                      htmlFor="pricingModeFixed"
                      className="ml-2 text-sm text-gray-700"
                    >
                      Fixed price
                    </label>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Choose between dynamic pricing per cm² or a fixed price for
                  the sticker
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pricingMode === "perCm2" ? (
                  <>
                    {/* Price per cm² - Printable */}
                    <div>
                      <label
                        htmlFor="pricePerCm2Printable"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Price per cm² (Printable)
                      </label>
                      <input
                        id="pricePerCm2Printable"
                        type="number"
                        step="0.01"
                        min="0"
                        className={`w-full rounded-md border ${
                          errors.pricePerCm2Printable
                            ? "border-red-300"
                            : "border-gray-300"
                        } px-3 py-2`}
                        {...register("pricePerCm2Printable", {
                          required:
                            pricingMode === "perCm2"
                              ? "This field is required"
                              : false,
                          min: { value: 0, message: "Price must be positive" },
                        })}
                      />
                      {errors.pricePerCm2Printable && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.pricePerCm2Printable.message}
                        </p>
                      )}
                    </div>

                    {/* Price per cm² - Vinyl */}
                    <div>
                      <label
                        htmlFor="pricePerCm2Vinyl"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Price per cm² (Vinyl)
                      </label>
                      <input
                        id="pricePerCm2Vinyl"
                        type="number"
                        step="0.01"
                        min="0"
                        className={`w-full rounded-md border ${
                          errors.pricePerCm2Vinyl
                            ? "border-red-300"
                            : "border-gray-300"
                        } px-3 py-2`}
                        {...register("pricePerCm2Vinyl", {
                          required:
                            pricingMode === "perCm2"
                              ? "This field is required"
                              : false,
                          min: { value: 0, message: "Price must be positive" },
                        })}
                      />
                      {errors.pricePerCm2Vinyl && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.pricePerCm2Vinyl.message}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Fixed Price */}
                    <div>
                      <label
                        htmlFor="generalPrice"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Fixed Price
                      </label>
                      <input
                        id="generalPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        className={`w-full rounded-md border ${
                          errors.generalPrice
                            ? "border-red-300"
                            : "border-gray-300"
                        } px-3 py-2`}
                        {...register("generalPrice", {
                          required:
                            pricingMode === "fixed"
                              ? "This field is required"
                              : false,
                          min: { value: 0, message: "Price must be positive" },
                        })}
                      />
                      {errors.generalPrice && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.generalPrice.message}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        Set a fixed price regardless of sticker size
                      </p>
                    </div>
                  </>
                )}

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
                      errors.quantity ? "border-red-300" : "border-gray-300"
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
                      errors.sortingRank ? "border-red-300" : "border-gray-300"
                    } px-3 py-2`}
                    {...register("sortingRank", {
                      required: "This field is required",
                    })}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Higher numbers appear first in the listing
                  </p>
                </div>

                {/* Width to Height Ratio */}
                <div>
                  <label
                    htmlFor="widthToHeightRatio"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Width to Height Ratio
                  </label>
                  <input
                    id="widthToHeightRatio"
                    type="number"
                    step="0.01"
                    min="0.1"
                    className={`w-full rounded-md border ${
                      errors.widthToHeightRatio
                        ? "border-red-300"
                        : "border-gray-300"
                    } px-3 py-2`}
                    {...register("widthToHeightRatio", {
                      min: { value: 0.1, message: "Ratio must be positive" },
                    })}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    E.g., 1.5 means the width is 1.5 times the height
                  </p>
                </div>

                {/* Printable and Vinyl Checkboxes in one row */}
                <div className="flex space-x-6">
                  <div className="flex items-center">
                    <input
                      id="printable"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-purple-700 focus:ring-purple-600"
                      {...register("printable")}
                    />
                    <label
                      htmlFor="printable"
                      className="ml-2 text-sm text-gray-700"
                    >
                      Printable
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      id="vinyl"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-purple-700 focus:ring-purple-600"
                      {...register("vinyl")}
                    />
                    <label
                      htmlFor="vinyl"
                      className="ml-2 text-sm text-gray-700"
                    >
                      Vinyl
                    </label>
                  </div>
                </div>

                {/* Standard Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Standard Method
                  </label>
                  <div className="flex space-x-4">
                    <div className="flex items-center">
                      <input
                        id="standardMethodPrintable"
                        type="radio"
                        value="printable"
                        className="h-4 w-4 border-gray-300 text-purple-700 focus:ring-purple-600"
                        {...register("standardMethod")}
                      />
                      <label
                        htmlFor="standardMethodPrintable"
                        className="ml-2 text-sm text-gray-700"
                      >
                        Printable
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        id="standardMethodVinyl"
                        type="radio"
                        value="vinyl"
                        className="h-4 w-4 border-gray-300 text-purple-700 focus:ring-purple-600"
                        {...register("standardMethod")}
                      />
                      <label
                        htmlFor="standardMethodVinyl"
                        className="ml-2 text-sm text-gray-700"
                      >
                        Vinyl
                      </label>
                    </div>
                  </div>
                </div>

                {/* Active Status */}
                <div className="flex items-center">
                  <input
                    id="active"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-purple-700 focus:ring-purple-600"
                    {...register("active")}
                  />
                  <label
                    htmlFor="active"
                    className="ml-2 text-sm text-gray-700"
                  >
                    Active (visible in shop)
                  </label>
                </div>

                {/* Text to Width Responsiveness */}
                <div className="flex items-center">
                  <input
                    id="textToWidthResponsiveness"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-purple-700 focus:ring-purple-600"
                    {...register("textToWidthResponsiveness")}
                  />
                  <label
                    htmlFor="textToWidthResponsiveness"
                    className="ml-2 text-sm text-gray-700"
                  >
                    Text to Width Responsiveness
                  </label>
                  <p className="ml-2 text-xs text-gray-500">
                    Enable responsive width sizing based on stickers text size
                  </p>
                </div>

                {/* Variation Group */}
                <div>
                  <label
                    htmlFor="variationsGroupId"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Variation Group
                  </label>
                  <select
                    id="variationsGroupId"
                    className={`w-full rounded-md border ${
                      errors.variationsGroupId
                        ? "border-red-300"
                        : "border-gray-300"
                    } px-3 py-2`}
                    {...register("variationsGroupId")}
                  >
                    <option value="">-- Not part of a variation --</option>
                    {variations.map((variation) => (
                      <option key={variation.id} value={variation.id}>
                        {variation.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Optionally add this sticker to a variation group
                  </p>
                </div>

                {/* Show Default in Variation checkbox only when a variation group is selected */}
                {watch("variationsGroupId") && (
                  <div className="flex items-center">
                    <input
                      id="defaultInVariation"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-purple-700 focus:ring-purple-600"
                      {...register("defaultInVariation")}
                    />
                    <label
                      htmlFor="defaultInVariation"
                      className="ml-2 text-sm text-gray-700"
                    >
                      Default in Variation
                    </label>
                    <p className="ml-2 text-xs text-gray-500">
                      This sticker will be shown first in the variation
                    </p>
                  </div>
                )}

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
                              className="ml-2 text-purple-600 hover:text-purple-800"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-gray-500">
                      Keywords help users find your sticker more easily
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-8">
                <button
                  type="button"
                  onClick={goToNextStep}
                  className="px-6 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-800 flex items-center"
                >
                  Next Step
                </button>
              </div>
            </Tab.Panel>

            {/* Translations Panel */}
            <Tab.Panel className="rounded-xl bg-white p-6 border border-gray-200">
              <h3 className="text-lg font-medium mb-4">Translations</h3>
              <div className="space-y-6">
                {["en", "de", "fr", "it"].map((language) => (
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
                            `translations.${language}.title` as FieldPath<FormData>
                          )}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          rows={3}
                          className="w-full rounded-md border border-gray-300 px-3 py-2"
                          {...register(
                            `translations.${language}.description` as FieldPath<FormData>
                          )}
                        ></textarea>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={goToPreviousStep}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Previous Step
                </button>
                <button
                  type="button"
                  onClick={goToNextStep}
                  className="px-6 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-800"
                >
                  Next Step
                </button>
              </div>
            </Tab.Panel>

            {/* Images Panel */}
            <Tab.Panel className="rounded-xl bg-white p-6 border border-gray-200">
              <h3 className="text-lg font-medium mb-4">Upload Images</h3>
              <div className="space-y-4">
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
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
                  </div>
                )}

                {uploadedImages.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-800 mb-3">
                      Uploaded Images
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {uploadedImages.map((image, index) => (
                        <div
                          key={index}
                          className="relative rounded-lg overflow-hidden border border-gray-200 group"
                        >
                          <div className="h-32 w-full relative">
                            <Image
                              src={image}
                              alt={`Image ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 bg-red-100 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={goToPreviousStep}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Previous Step
                </button>
                <button
                  type="button"
                  onClick={goToNextStep}
                  className="px-6 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-800"
                >
                  Next Step
                </button>
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
                            | "color"
                            | "inputfield"
                            | "vinylColors"
                            | "dropdown"
                        )
                      }
                    >
                      <option value="inputfield">Input Field</option>
                      <option value="color">Color Picker</option>
                      <option value="vinylColors">Vinyl Colors</option>
                      <option value="dropdown">Dropdown</option>
                    </select>
                  </div>

                  {/* Add this new dropdown for applicableTo */}
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Applicable To
                    </label>
                    <select
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      value={applicableToValue}
                      onChange={(e) =>
                        setApplicableToValue(
                          e.target.value as "vinyl" | "printable" | "both"
                        )
                      }
                    >
                      <option value="both">Both Types</option>
                      <option value="vinyl">Vinyl Only</option>
                      <option value="printable">Printable Only</option>
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
                          onClick={() => removeCustomizationOption(optionIndex)}
                          className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                        >
                          <Trash className="h-4 w-4" />
                        </button>

                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium text-gray-800 mb-2">
                                Option Type: {option.type}
                                {/* Add this badge to show applicableTo */}
                                <span
                                  className={`ml-2 inline-block px-2 py-0.5 text-xs rounded-full ${
                                    option.applicableTo === "both"
                                      ? "bg-green-100 text-green-800"
                                      : option.applicableTo === "vinyl"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-purple-100 text-purple-800"
                                  }`}
                                >
                                  {option.applicableTo === "both"
                                    ? "Both Types"
                                    : option.applicableTo === "vinyl"
                                    ? "Vinyl Only"
                                    : "Printable Only"}
                                </span>
                              </h4>

                              {/* Option translations */}
                              <div className="space-y-3 mt-4">
                                {["en", "de", "fr", "it"].map((language) => (
                                  <div key={language} className="space-y-2">
                                    <div className="flex items-center">
                                      <span className="text-xs font-semibold bg-gray-200 px-2 py-1 rounded mr-2 uppercase">
                                        {language}
                                      </span>
                                      <input
                                        type="text"
                                        placeholder={`${language.toUpperCase()} Title`}
                                        className="flex-1 rounded-md border border-gray-300 px-3 py-1 text-sm"
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
                                            e.target.value
                                          )
                                        }
                                      />
                                    </div>
                                    <input
                                      type="text"
                                      placeholder={`${language.toUpperCase()} Description (Optional)`}
                                      className="w-full rounded-md border border-gray-300 px-3 py-1 text-sm"
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
                                          e.target.value
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
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Maximum Characters
                                  </label>
                                  <input
                                    type="number"
                                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                                    value={
                                      (option as InputFieldOption).max || 50
                                    }
                                    onChange={(e) =>
                                      updateInputFieldMax(
                                        optionIndex,
                                        parseInt(e.target.value)
                                      )
                                    }
                                    min="1"
                                  />
                                </div>
                              )}

                              {option.type === "dropdown" && (
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center">
                                    <h5 className="font-medium text-gray-700">
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
                                        className="border rounded p-2 bg-white relative"
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

                                        <div className="space-y-2 pt-4">
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
                                                  className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
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
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No customization options added yet. Add one using the button
                    above.
                  </div>
                )}
              </div>

              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={goToPreviousStep}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Previous Step
                </button>
                <button
                  type="button"
                  onClick={goToNextStep}
                  className="px-6 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-800"
                >
                  Next Step
                </button>
              </div>
            </Tab.Panel>

            {/* Categories Panel (Final Step) */}
            <Tab.Panel className="rounded-xl bg-white p-6 border border-gray-200">
              <h3 className="text-lg font-medium mb-4">Categories</h3>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-800 mb-3">Groups</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groups.map((group) => {
                      const enTranslation =
                        group.translations.find((t) => t.language === "en")
                          ?.title || "Untitled";

                      return (
                        <div key={group.id} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`group-${group.id}`}
                            value={group.id}
                            className="h-4 w-4 rounded border-gray-300 text-purple-700 focus:ring-purple-600"
                            {...register("groups")}
                          />
                          <label
                            htmlFor={`group-${group.id}`}
                            className="ml-2 text-sm text-gray-700"
                          >
                            {enTranslation}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-800 mb-3">Subgroups</h3>
                  {availableSubgroups.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {availableSubgroups.map((subgroup) => (
                        <div key={subgroup.id} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`subgroup-${subgroup.id}`}
                            value={subgroup.id}
                            className="h-4 w-4 rounded border-gray-300 text-purple-700 focus:ring-purple-600"
                            {...register("subgroups")}
                          />
                          <label
                            htmlFor={`subgroup-${subgroup.id}`}
                            className="ml-2 text-sm text-gray-700"
                          >
                            {subgroup.title}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">
                      {watchGroups?.length
                        ? "No subgroups found for selected groups"
                        : "Select one or more groups to see available subgroups"}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={goToPreviousStep}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Previous Step
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Creating...
                    </div>
                  ) : (
                    "Create Sticker"
                  )}
                </button>
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </form>
    </div>
  );
};

export default AddSticker;
