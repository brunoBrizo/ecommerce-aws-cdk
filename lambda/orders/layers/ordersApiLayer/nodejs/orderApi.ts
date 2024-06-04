export enum PaymentType {
  CASH = "CASH",
  CREDIT_CARD = "CREDIT_CARD",
  DEBIT_CARD = "DEBIT_CARD",
}

export enum ShippingType {
  ECONOMIC = "ECONOMIC",
  URGENT = "URGENT",
}

export enum CarrierType {
  UPS = "UPS",
  FEDEX = "FEDEX",
  DHL = "DHL",
}

export interface OrderRequest {
  email: string;
  productIds: string[];
  payment: PaymentType;
  shipping: {
    type: ShippingType;
    carrier: CarrierType;
  };
}

export interface OrderProductResponse {
  code: string;
  price: number;
}

export interface OrderResponse {
  id: string;
  email: string;
  createdAt?: number;
  shipping: {
    type: ShippingType;
    carrier: CarrierType;
  };
  billing: {
    payment: PaymentType;
    totalPrice: number;
  };
  products?: OrderProductResponse[];
}
