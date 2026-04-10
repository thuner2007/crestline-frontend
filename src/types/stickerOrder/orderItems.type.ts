import { CreateCustomSticker } from "./createCustomSticker.type";

export type StickerOrderItem = {
  stickerId?: string;
  customSticker?: CreateCustomSticker;
  quantity: number;
  width: number;
  height: number;
  vinyl?: boolean;
  printed?: boolean;
  customizationOptions: {
    type: string;
    value: string;
    optionId: string;
  }[];
};
