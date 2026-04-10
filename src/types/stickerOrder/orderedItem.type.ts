import { OrderedItemCustomizationOption } from '../sticker/customizazion.type';
import { CustomSticker } from '../sticker/customsticker.type';
import { Sticker } from '../sticker/sticker.type';

export type OrderedItem = {
  id: string;
  orderId: string;
  stickerId: string;
  width: number;
  height: number;
  vinyl: boolean;
  printed: boolean;
  customizationOptions: OrderedItemCustomizationOption[]; // Changed from CustomizationOption[]
  quantity: number;
  sticker?: Sticker;
  customSticker?: CustomSticker;
};
