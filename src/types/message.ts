import { Product } from './product';

export enum MessageIntent {
  BROWSE_PRODUCTS = 'BROWSE_PRODUCTS',
  PRODUCT_INQUIRY = 'PRODUCT_INQUIRY',
  PLACE_ORDER = 'PLACE_ORDER',
  ORDER_STATUS = 'ORDER_STATUS',
  CANCEL_ORDER = 'CANCEL_ORDER',
  DELIVERY_INQUIRY = 'DELIVERY_INQUIRY',
  GENERAL_INQUIRY = 'GENERAL_INQUIRY',
  PAYMENT = 'PAYMENT'
}

export interface WhatsAppMessage {
  messageId: string;
  from: string; // Customer's WhatsApp number
  timestamp: Date;
  content: string;
  intent?: MessageIntent;
  context?: MessageContext;
}

export interface MessageContext {
  currentProduct?: Product;
  currentOrder?: string; // Order ID
  lastIntent?: MessageIntent;
  orderInProgress?: {
    items: Array<{
      productId: string;
      quantity: number;
    }>;
    stage: OrderStage;
  };
}

export enum OrderStage {
  PRODUCT_SELECTION = 'PRODUCT_SELECTION',
  QUANTITY_SELECTION = 'QUANTITY_SELECTION',
  ADDRESS_COLLECTION = 'ADDRESS_COLLECTION',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  CONFIRMATION = 'CONFIRMATION'
}

export interface WhatsAppResponse {
  messageId: string;
  to: string;
  content: string;
  attachments?: WhatsAppAttachment[];
  quickReplies?: string[];
}

export interface WhatsAppAttachment {
  type: 'image' | 'document' | 'location';
  url?: string;
  caption?: string;
  latitude?: number;
  longitude?: number;
} 