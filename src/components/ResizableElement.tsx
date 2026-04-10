import React, { useState, useCallback, useRef } from "react";
import {
  ElementData,
  TextData,
  ShapeData,
  ImageData,
} from "@/types/elementTypes";
import Shape from "./Shape";
import Image from "next/image";
import windowUtility from "@/lib/windowUtility";

interface ResizableElementProps {
  element: ElementData;
  isSelected: boolean;
  onSelect: () => void;
  onResize: (id: string, width: number, height: number) => void;
  onMove: (id: string, x: number, y: number) => void;
  scaleFactor: number;
  canvasWidth: number;
  canvasHeight: number;
}

const ResizableElement: React.FC<ResizableElementProps> = ({
  element,
  isSelected,
  onSelect,
  onResize,
  onMove,
  scaleFactor,
  canvasWidth,
  canvasHeight,
}) => {
  const [moving, setMoving] = useState(false);
  const [resizing, setResizing] = useState(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const elementRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setMoving(true);
    startPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (moving) {
        const dx = (e.clientX - startPosRef.current.x) / scaleFactor;
        const dy = (e.clientY - startPosRef.current.y) / scaleFactor;
        let newX, newY;
        if (element.type === "text") {
          newX = Math.max(0, Math.min(element.x + dx, canvasWidth));
          newY = Math.max(0, Math.min(element.y + dy, canvasHeight));
        } else {
          newX = Math.max(
            0,
            Math.min(element.x + dx, canvasWidth - element.width)
          );
          newY = Math.max(
            0,
            Math.min(element.y + dy, canvasHeight - element.height)
          );
        }
        onMove(element.id, newX, newY);
        startPosRef.current = { x: e.clientX, y: e.clientY };
      } else if (resizing) {
        const rect = elementRef.current?.getBoundingClientRect();
        if (rect) {
          // Use requestAnimationFrame to avoid layout thrashing
          requestAnimationFrame(() => {
            const dx = e.clientX - rect.right;
            const dy = e.clientY - rect.bottom;
            if (element.type !== "text") {
              const newWidth = Math.max(
                1,
                Math.min(
                  (element.width * scaleFactor + dx) / scaleFactor,
                  canvasWidth - element.x
                )
              );
              const newHeight = Math.max(
                1,
                Math.min(
                  (element.height * scaleFactor + dy) / scaleFactor,
                  canvasHeight - element.y
                )
              );
              onResize(element.id, newWidth, newHeight);
            }
          });
        }
      }
    },
    [
      moving,
      resizing,
      element,
      onMove,
      onResize,
      scaleFactor,
      canvasWidth,
      canvasHeight,
    ]
  );

  const handleMouseUp = useCallback(() => {
    setMoving(false);
    setResizing(false);
  }, []);

  React.useEffect(() => {
    if (moving || resizing) {
      windowUtility.addEventListener(
        "mousemove",
        handleMouseMove as EventListener
      );
      windowUtility.addEventListener("mouseup", handleMouseUp);
      return () => {
        windowUtility.removeEventListener(
          "mousemove",
          handleMouseMove as EventListener
        );
        windowUtility.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [moving, resizing, handleMouseMove, handleMouseUp]);

  const style: React.CSSProperties = {
    position: "absolute",
    left: `${element.x * scaleFactor}px`,
    top: `${element.y * scaleFactor}px`,
    width:
      element.type !== "text" ? `${element.width * scaleFactor}px` : "auto",
    height:
      element.type !== "text" ? `${element.height * scaleFactor}px` : "auto",
    cursor: moving ? "grabbing" : "grab",
    zIndex: element.zIndex,
  };

  return (
    <div
      ref={elementRef}
      style={style}
      onClick={onSelect}
      onMouseDown={handleMouseDown}
      role="button"
      tabIndex={0}
      aria-label={`${element.type} element`}
    >
      {element.type === "text" && (
        <p
          style={{
            fontFamily: (element as TextData).fontFamily,
            fontSize: `${(element as TextData).fontSize * scaleFactor}px`,
            fontWeight: (element as TextData).fontWeight,
            color: element.color,
            margin: 0,
            padding: 0,
            whiteSpace: "nowrap",
          }}
        >
          {(element as TextData).text}
        </p>
      )}
      {element.type === "image" && (
        <div style={{ width: "100%", height: "100%", pointerEvents: "none" }}>
          <Image
            src={(element as ImageData).src}
            alt="Uploaded image"
            width={element.width * scaleFactor}
            height={element.height * scaleFactor}
            style={{ objectFit: "fill", width: "100%", height: "100%" }}
            draggable={false}
          />
        </div>
      )}
      {element.type !== "text" && element.type !== "image" && (
        <Shape
          {...(element as ShapeData)}
          scaleFactor={scaleFactor}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
        />
      )}
      {isSelected && (
        <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none" />
      )}
      {isSelected && element.type !== "text" && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize"
          onMouseDown={(e) => {
            e.stopPropagation();
            setResizing(true);
          }}
          role="button"
          tabIndex={0}
          aria-label="Resize handle"
        />
      )}
    </div>
  );
};

export default ResizableElement;
