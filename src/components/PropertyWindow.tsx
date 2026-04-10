import React, { useState, useEffect } from "react";
import {
  ElementData,
  TextData,
  ShapeData,
  ImageData,
} from "@/types/elementTypes";
import { useTranslations } from "next-intl";

interface PropertyWindowProps {
  element: ElementData;
  onUpdate: (updatedElement: ElementData) => void;
  canvasWidth: number;
  canvasHeight: number;
}

const fontFamilies = [
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Courier",
  "Verdana",
  "Georgia",
  "Palatino",
  "Garamond",
  "Bookman",
  "Comic Sans MS",
  "Trebuchet MS",
  "Arial Black",
  "Impact",
];

const PropertyWindow: React.FC<PropertyWindowProps> = ({
  element,
  onUpdate,
  canvasWidth,
  canvasHeight,
}) => {
  const [localElement, setLocalElement] = useState<ElementData>(element);

  const t = useTranslations("editor");

  useEffect(() => {
    setLocalElement(element);
  }, [element]);

  const handleChange = (key: string, value: string | number) => {
    let updatedValue: string | number = value;
    if (key === "fontSize" || key === "x" || key === "y" || key === "zIndex") {
      const numValue = parseFloat(value as string);
      updatedValue = isNaN(numValue)
        ? (localElement as unknown as Record<string, string | number>)[key]
        : numValue;
    }

    const updatedElement = { ...localElement, [key]: updatedValue };
    setLocalElement(updatedElement);
    onUpdate(updatedElement);
  };

  const handleBlur = (key: string) => {
    let updatedValue: number = (
      localElement as unknown as Record<string, number | string>
    )[key] as number;

    if (typeof updatedValue !== "number" || isNaN(updatedValue)) {
      if (key in localElement) {
        updatedValue = (
          localElement as unknown as Record<string, string | number>
        )[key] as number;
      }
    }

    if (key === "x") {
      updatedValue = Math.max(0, Math.min(updatedValue, canvasWidth));
    } else if (key === "y") {
      updatedValue = Math.max(0, Math.min(updatedValue, canvasHeight));
    } else if (key === "fontSize") {
      updatedValue = Math.max(0.1, updatedValue);
    } else if (key === "zIndex") {
      updatedValue = Math.max(0, Math.round(updatedValue));
    }

    const updatedElement = { ...localElement, [key]: updatedValue };
    setLocalElement(updatedElement);
    onUpdate(updatedElement);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="space-y-4">
        {localElement.type === "text" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("text")}
              </label>
              <input
                type="text"
                value={(localElement as TextData).text}
                onChange={(e) => handleChange("text", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("fontFamily")}
              </label>
              <select
                value={(localElement as TextData).fontFamily}
                onChange={(e) => handleChange("fontFamily", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {fontFamilies.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("fontSize")} (cm)
              </label>
              <input
                type="number"
                value={(localElement as TextData).fontSize}
                onChange={(e) => handleChange("fontSize", e.target.value)}
                onBlur={() => handleBlur("fontSize")}
                onKeyDown={handleKeyDown}
                step="0.1"
                min="0.1"
                max={canvasHeight}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("fontWeight")}
              </label>
              <select
                value={(localElement as TextData).fontWeight}
                onChange={(e) => handleChange("fontWeight", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="normal">{t("normal")}</option>
                <option value="bold">{t("bold")}</option>
                <option value="bolder">{t("bolder")}</option>
                <option value="boldest">{t("boldest")}</option>
              </select>
            </div>
          </>
        )}
        {localElement.type === "image" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("imageSource")}
              </label>
              <input
                type="text"
                value={(localElement as ImageData).src}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
              />
            </div>
          </>
        )}
        {localElement.type !== "text" && localElement.type !== "image" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("shapeType")}
              </label>
              <select
                value={(localElement as ShapeData).type}
                onChange={(e) => handleChange("type", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="circle">Circle</option>
                <option value="square">Square</option>
                <option value="triangle">Triangle</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("color")}
              </label>
              <input
                type="color"
                value={(localElement as ShapeData).color}
                onChange={(e) => handleChange("color", e.target.value)}
                className="w-full h-10"
              />
            </div>
          </>
        )}
        {localElement.type !== "text" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("width")} (cm)
              </label>
              <input
                type="number"
                value={localElement.width}
                onChange={(e) => handleChange("width", e.target.value)}
                onBlur={() => handleBlur("width")}
                onKeyDown={handleKeyDown}
                step="0.1"
                min="0"
                max={canvasWidth}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("height")} (cm)
              </label>
              <input
                type="number"
                value={localElement.height}
                onChange={(e) => handleChange("height", e.target.value)}
                onBlur={() => handleBlur("height")}
                onKeyDown={handleKeyDown}
                step="0.1"
                min="0"
                max={canvasHeight}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("xPosition")} (cm)
            </label>
            <input
              type="number"
              value={localElement.x}
              onChange={(e) => handleChange("x", e.target.value)}
              onBlur={() => handleBlur("x")}
              onKeyDown={handleKeyDown}
              step="0.1"
              min="0"
              max={canvasWidth}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("yPosition")} (cm)
            </label>
            <input
              type="number"
              value={localElement.y}
              onChange={(e) => handleChange("y", e.target.value)}
              onBlur={() => handleBlur("y")}
              onKeyDown={handleKeyDown}
              step="0.1"
              min="0"
              max={canvasHeight}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("zIndex")}
          </label>
          <input
            type="number"
            value={localElement.zIndex}
            onChange={(e) => handleChange("zIndex", e.target.value)}
            onBlur={() => handleBlur("zIndex")}
            onKeyDown={handleKeyDown}
            step="1"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

export default PropertyWindow;
