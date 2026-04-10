import React from "react";
import { DndContext, DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import ResizableElement from "./ResizableElement";
import { ElementData } from "@/types/elementTypes";

interface EditorCanvasProps {
  elements: ElementData[];
  selectedElement: ElementData | null;
  canvasWidth: number | null;
  canvasHeight: number | null;
  scaleFactor: number;
  canvasShape: "box" | "round";
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onElementSelect: (element: ElementData) => void;
  onElementResize: (id: string, width: number, height: number) => void;
  onElementMove: (id: string, x: number, y: number) => void;
  onCanvasClick: (event: React.MouseEvent<HTMLDivElement>) => void;
}

const preventDragStyle: React.CSSProperties = {
  userSelect: "none",
  WebkitUserSelect: "none",
  MozUserSelect: "none",
  msUserSelect: "none",
};

const EditorCanvas: React.FC<EditorCanvasProps> = ({
  elements,
  selectedElement,
  canvasWidth,
  canvasHeight,
  scaleFactor,
  canvasShape,
  onDragStart,
  onDragEnd,
  onElementSelect,
  onElementResize,
  onElementMove,
  onCanvasClick,
}) => {
  const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <DndContext
      modifiers={[restrictToParentElement]}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg bg-white relative overflow-hidden p-4 mx-auto"
        style={{
          width: `${((canvasWidth ?? 0) / (canvasHeight ?? 1)) * 600}px`,
          height: `${((canvasHeight ?? 0) / (canvasWidth ?? 1)) * 600}px`,
          maxWidth: `${600}px`,
          maxHeight: `${600}px`,
          borderRadius: canvasShape === "round" ? "50%" : undefined,
          ...preventDragStyle,
        }}
        onClick={onCanvasClick}
        onMouseDown={(e) => e.preventDefault()}
      >
        {sortedElements.map((element) => (
          <ResizableElement
            key={element.id}
            element={element}
            isSelected={selectedElement?.id === element.id}
            onSelect={() => onElementSelect(element)}
            onResize={onElementResize}
            onMove={onElementMove}
            scaleFactor={scaleFactor}
            canvasWidth={canvasWidth ?? 0}
            canvasHeight={canvasHeight ?? 0}
          />
        ))}
      </div>
    </DndContext>
  );
};

export default EditorCanvas;
