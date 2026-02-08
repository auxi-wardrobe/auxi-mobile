/**
 * Garment Detection Types
 * Type definitions for YOLOv8n-based garment detection
 */

export enum GarmentCategory {
  TOP = 'top',
  BOTTOM = 'bottom',
  SHOES = 'shoes',
  DRESS = 'dress',
  OUTERWEAR = 'outerwear',
  ACCESSORY = 'accessory',
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AlternativePrediction {
  category: GarmentCategory;
  confidence: number;
}

export interface Detection {
  category: GarmentCategory;
  confidence: number; // 0.0 - 1.0
  bbox: BoundingBox;
  alternativePredictions?: AlternativePrediction[];
}

export interface DetectionResult {
  detection: Detection;
  processingTimeMs: number;
  timestamp: number;
  imageUri: string;
  fromCache?: boolean;
}

export interface DetectionError {
  code: string;
  message: string;
  details?: string;
}
