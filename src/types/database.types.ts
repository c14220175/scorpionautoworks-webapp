export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      
    }
  }
}

// ====== Estimation Item Types ======

export interface EstimationServiceItem {
  id: number;
  name: string;
  type: "Jasa";
  qty: number;
  price: number;
}

export interface EstimationSparepartItem {
  id: number;
  name: string;
  type: "Part";
  qty: number;
  price: number;
  inv_id?: string;
  item_type?: string;
}

export type EstimationItem = EstimationServiceItem | EstimationSparepartItem;

export interface EstimationData {
  items: EstimationItem[];
  total: number;
  message?: string;
}