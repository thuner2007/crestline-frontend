import { PaymentMethods } from "../paymentMethods.enum";
import { OrderedItem } from "./orderedItem.type";

export type StickerOrder = {
    id: string;
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
    userId?: string;
    guestEmail?: string;
    paymentMethod: PaymentMethods;
    orderDate: string;
    comment?: string;
    status: string;
    totalPrice: string;
    shipmentCost: string;
    discountId?: string;
    paymentId?: string;
    items: OrderedItem[];
}