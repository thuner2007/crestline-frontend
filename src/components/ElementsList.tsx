import { ElementData } from "@/types/elementTypes";
import { useTranslations } from "next-intl";
import React from "react";

interface ElementsListProps {
  elements: ElementData[];
  removeElement: (id: string) => void;
}

const ElementsList: React.FC<ElementsListProps> = ({
  elements,
  removeElement,
}) => {
  const t = useTranslations("editor");
  const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">{t("elementsTitle")}</h2>
      {sortedElements.length > 0 ? (
        <ul className="space-y-2">
          {sortedElements.map((element) => (
            <li
              key={element.id}
              className="flex justify-between items-center bg-gray-100 p-2 rounded"
            >
              <span>
                {element.type === "text"
                  ? `Text: "${element.text}" (${Number(element.x).toFixed(
                      2,
                    )} cm, ${Number(element.y).toFixed(2)} cm)`
                  : `Shape: ${element.type} (${Number(element.x).toFixed(
                      2,
                    )} cm, ${Number(element.y).toFixed(2)} cm) - ${Number(
                      element.width,
                    ).toFixed(2)}cm x ${Number(element.height).toFixed(2)}cm`}
                <span className="ml-2 text-sm text-gray-600">
                  {t("layer")} {element.zIndex}
                </span>
              </span>
              <button
                onClick={() => removeElement(element.id)}
                className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors"
              >
                {t("remove")}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 italic">{t("noElements")}</p>
      )}
    </div>
  );
};

export default ElementsList;
