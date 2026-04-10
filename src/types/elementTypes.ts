export interface ShapeData {
  id: string;
  type: "circle" | "square" | "triangle";
  color: string;
  width: number;
  height: number;
  x: number;
  y: number;
  zIndex: number;
}

export interface TextData {
  id: string;
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: "normal" | "bold" | "bolder" | "boldest";
  color: string;
  x: number;
  y: number;
  zIndex: number;
}

export interface ImageData {
  id: string;
  type: "image";
  src: string;
  originalImage?: string; // Add original image storage
  width: number;
  height: number;
  x: number;
  y: number;
  zIndex: number;
}

export type ElementData = ShapeData | TextData | ImageData;
