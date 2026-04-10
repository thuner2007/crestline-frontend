import { PaymentMethods } from "../paymentMethods.enum";
import { StickerOrderItem } from "./orderItems.type";

export type CreateStickerOrder = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  houseNumber: string;
  zipCode: string;
  city: string;
  country: string;
  additionalAddressInfo?: string;
  orderItems: StickerOrderItem[];
  userId?: string;
  guestEmail?: string;
  paymentMethod: PaymentMethods;
  comment?: string;
  discountCode?: string;
  paymentId?: string;
};
