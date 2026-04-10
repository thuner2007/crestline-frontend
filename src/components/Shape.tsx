import React from "react";

interface ShapeProps {
  type: "circle" | "square" | "triangle";
  color: string;
  width: number;
  height: number;
  scaleFactor: number;
  canvasWidth: number;
  canvasHeight: number;
}

const Shape: React.FC<ShapeProps> = ({
  type,
  color,
  width,
  height,
  scaleFactor,
  canvasWidth,
  canvasHeight,
}) => {
  const calculateAdjustedDimensions = (
    shapeWidth: number,
    shapeHeight: number,
  ) => {
    const canvasRatio = canvasWidth / canvasHeight;
    const shapeRatio = shapeWidth / shapeHeight;

    let adjustedWidth, adjustedHeight;

    if (canvasRatio < 1) {
      // Canvas is taller than wide
      adjustedWidth = Math.min(shapeWidth, canvasWidth);
      adjustedHeight = adjustedWidth / shapeRatio;
    } else {
      // Canvas is wider than tall or square
      adjustedHeight = Math.min(shapeHeight, canvasHeight);
      adjustedWidth = adjustedHeight * shapeRatio;
    }

    // Apply a maximum size limit for very large canvases
    const maxSize = 20; // Maximum size in cm
    if (adjustedWidth > maxSize || adjustedHeight > maxSize) {
      const scaleFactor = maxSize / Math.max(adjustedWidth, adjustedHeight);
      adjustedWidth *= scaleFactor;
      adjustedHeight *= scaleFactor;
    }

    return { width: adjustedWidth, height: adjustedHeight };
  };

  const { width: adjustedWidth, height: adjustedHeight } =
    calculateAdjustedDimensions(width, height);

  const shapeStyle: React.CSSProperties = {
    width: `${adjustedWidth * scaleFactor}px`,
    height: `${adjustedHeight * scaleFactor}px`,
    backgroundColor: color,
  };

  switch (type) {
    case "circle":
      return (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: color,
            borderRadius: "50%",
          }}
        />
      );
    case "square":
      return <div style={shapeStyle} />;
    case "triangle":
      return (
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: `${
              (adjustedWidth * scaleFactor) / 2
            }px solid transparent`,
            borderRight: `${
              (adjustedWidth * scaleFactor) / 2
            }px solid transparent`,
            borderBottom: `${adjustedHeight * scaleFactor}px solid ${color}`,
          }}
        />
      );
    default:
      return null;
  }
};

export default Shape;
