import { Product } from './product';
import { Message, MessageMedia } from 'whatsapp-web.js';

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

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  LOCATION = 'location',
  CONTACT = 'contact',
  UNKNOWN = 'unknown'
}

export interface WhatsAppMessage {
  id: string;
  type: MessageType;
  from: string;
  to?: string;
  body: string;
  timestamp: number;
  hasMedia?: boolean;
  media?: MessageMedia;
  mediaUrl?: string;  // URL to the media file
  mimeType?: string;
  caption?: string;
  isGroupMsg?: boolean; // Indicates if the message is from a group chat
  location?: {
    latitude: number;
    longitude: number;
    description?: string;
  };
  contact?: {
    name: string;
    number: string;
  };
  originalMessage?: Message;
}

export interface MessageContext {
  userId: string;
  currentProduct?: Product;
  currentOrder?: string; // Order ID
  lastIntent?: MessageIntent;
  lastInteraction: number; // Timestamp of the last interaction
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
  deliveryAddress?: {
    street: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    instructions?: string;
  };
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
  PAYMENT_SELECTION = 'PAYMENT_SELECTION',
  CONFIRMATION = 'CONFIRMATION',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
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

export interface MessageResponse {
  success: boolean;
  error?: string;
  data?: any;
}

export interface MessageQueueStatus {
  queueLength: number;
  isProcessing: boolean;
} 