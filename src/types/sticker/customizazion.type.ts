// Translation interface for multilingual content
export interface Translation {
  title: string;
  description?: string;
}

// Interface for all customization options
export interface CustomizationOptions {
  options: CustomizationOption[];
}

// Base interface for all customization option types
export interface BaseCustomizationOption {
  type:
    | "color"
    | "inputfield"
    | "vinylColors"
    | "dropdown"
    | "powdercoatColors"
    | "filamentColor";
  applicableTo: "vinyl" | "printable" | "both";
  translations: {
    de: Translation;
    en: Translation;
    fr: Translation;
    it: Translation;
  };
  priceAdjustment?: number; // Added price adjustment property
}

// Specific option types
export interface InputFieldOption extends BaseCustomizationOption {
  type: "inputfield";
  max?: number;
  priceAdjustment?: number;
}

export interface DropdownOption extends BaseCustomizationOption {
  type: "dropdown";
  items: {
    id: string;
    priceAdjustment?: number; // Added price adjustment for dropdown items
    translations: {
      de: Translation;
      en: Translation;
      fr: Translation;
      it: Translation;
    };
  }[];
}

export interface ColorOption extends BaseCustomizationOption {
  type: "color";
  priceAdjustment?: number;
}

export interface VinylColorsOption extends BaseCustomizationOption {
  type: "vinylColors";
  priceAdjustment?: number;
}

export interface PowdercoatColorsOption extends BaseCustomizationOption {
  type: "powdercoatColors";
  priceAdjustment?: number;
}

export interface FilamentColorOption extends BaseCustomizationOption {
  type: "filamentColor";
  filamentTypeId?: string;
  filamentTypeName?: string;
  colors?: Array<{
    id: string;
    value: string;
    priceAdjustment?: number;
  }>;
  priceAdjustment?: number;
}

// Union type for all option types
export type CustomizationOption =
  | InputFieldOption
  | DropdownOption
  | ColorOption
  | VinylColorsOption
  | PowdercoatColorsOption
  | FilamentColorOption;

// Add a new type for ordered item customization options from the API response
export interface OrderedItemCustomizationOption {
  type:
    | "color"
    | "inputfield"
    | "vinylColors"
    | "dropdown"
    | "powdercoatColors"
    | "filamentColor";
  value: string;
  optionId: string;
  priceAdjustment?: number; // This is already defined as optional
  selectedItemPriceAdjustment?: number;
  translations?: {
    de: Translation;
    en: Translation;
    fr: Translation;
    it: Translation;
  };
}
