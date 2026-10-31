import QRCode from "qrcode";
import bwipjs from "bwip-js";

// ============================================
// QR CODE GENERATION
// ============================================

/**
 * Generate a QR code as a data URL (for display in img tags)
 */
export async function generateQRCodeDataURL(
  data: string,
  options?: {
    width?: number;
    margin?: number;
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  }
): Promise<string> {
  const { width = 200, margin = 2, errorCorrectionLevel = "M" } = options ?? {};

  return QRCode.toDataURL(data, {
    width,
    margin,
    errorCorrectionLevel,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

/**
 * Generate a QR code as an SVG string
 */
export async function generateQRCodeSVG(
  data: string,
  options?: {
    width?: number;
    margin?: number;
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  }
): Promise<string> {
  const { width = 200, margin = 2, errorCorrectionLevel = "M" } = options ?? {};

  return QRCode.toString(data, {
    type: "svg",
    width,
    margin,
    errorCorrectionLevel,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

// ============================================
// BARCODE GENERATION (Code 128)
// ============================================

/**
 * Generate a Code 128 barcode as a PNG buffer
 */
export async function generateBarcodeBuffer(
  data: string,
  options?: {
    height?: number;
    scale?: number;
    includeText?: boolean;
  }
): Promise<Buffer> {
  const { height = 50, scale = 3, includeText = true } = options ?? {};

  return bwipjs.toBuffer({
    bcid: "code128",
    text: data,
    scale,
    height,
    includetext: includeText,
    textxalign: "center",
    textsize: 10,
  });
}

/**
 * Generate a Code 128 barcode as a data URL
 */
export async function generateBarcodeDataURL(
  data: string,
  options?: {
    height?: number;
    scale?: number;
    includeText?: boolean;
  }
): Promise<string> {
  const buffer = await generateBarcodeBuffer(data, options);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

// ============================================
// ASSET TAG UTILITIES
// ============================================

/**
 * Build the URL for an asset's detail page (for QR code)
 * This only contains the asset path, not auth tokens
 */
export function buildAssetURL(assetTag: string, baseUrl?: string): string {
  // Only include the relative path - no auth tokens
  const path = `/dashboard/scan/asset/${encodeURIComponent(assetTag)}`;
  if (baseUrl) {
    return `${baseUrl.replace(/\/$/, "")}${path}`;
  }
  return path;
}

/**
 * Extract asset tag from a scanned value
 * Handles both raw asset tags and URLs containing asset tags
 */
export function extractAssetTag(scannedValue: string): string | null {
  if (!scannedValue) return null;

  const trimmed = scannedValue.trim();

  // Check if it's a URL containing an asset tag
  const urlMatch = trimmed.match(/\/scan\/asset\/([^/?]+)/);
  if (urlMatch) {
    return decodeURIComponent(urlMatch[1]);
  }

  // Check if it looks like a RecyTrack asset tag (RT-XXXXXX)
  const tagMatch = trimmed.match(/^RT-\d{6}$/i);
  if (tagMatch) {
    return trimmed.toUpperCase();
  }

  // Otherwise, return the raw value (could be a serial number or customer tag)
  return trimmed;
}

/**
 * Validate an asset tag format
 */
export function isValidAssetTag(tag: string): boolean {
  return /^RT-\d{6}$/i.test(tag);
}

// ============================================
// LABEL DATA STRUCTURES
// ============================================

export interface LabelData {
  assetTag: string;
  qrCodeDataURL: string;
  barcodeDataURL: string;
  category: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  customerRef?: string;
}

/**
 * Generate all the data needed for a label
 */
export async function generateLabelData(
  asset: {
    assetTag: string;
    category: string;
    manufacturer?: string | null;
    model?: string | null;
    serialNumber?: string | null;
    customerAssetTag?: string | null;
  },
  baseUrl?: string
): Promise<LabelData> {
  const assetUrl = buildAssetURL(asset.assetTag, baseUrl);

  const [qrCodeDataURL, barcodeDataURL] = await Promise.all([
    generateQRCodeDataURL(assetUrl, { width: 120, margin: 1 }),
    generateBarcodeDataURL(asset.assetTag, { height: 30, scale: 2 }),
  ]);

  return {
    assetTag: asset.assetTag,
    qrCodeDataURL,
    barcodeDataURL,
    category: asset.category,
    manufacturer: asset.manufacturer ?? undefined,
    model: asset.model ?? undefined,
    serialNumber: asset.serialNumber ?? undefined,
    customerRef: asset.customerAssetTag ?? undefined,
  };
}

// ============================================
// LABEL SIZES (thermal printers)
// ============================================

export const LABEL_SIZES = {
  small: { width: 50, height: 25, unit: "mm" as const },
  medium: { width: 60, height: 40, unit: "mm" as const },
  large: { width: 100, height: 50, unit: "mm" as const },
} as const;

export type LabelSize = keyof typeof LABEL_SIZES;

// A4 sheet layout for label sheets
export const A4_LABEL_LAYOUTS = {
  "24-labels": { rows: 8, cols: 3, labelWidth: 63.5, labelHeight: 33.9 }, // Avery L7159
  "21-labels": { rows: 7, cols: 3, labelWidth: 63.5, labelHeight: 38.1 }, // Avery L7160
  "14-labels": { rows: 7, cols: 2, labelWidth: 99.1, labelHeight: 38.1 }, // Avery L7163
} as const;

export type A4LabelLayout = keyof typeof A4_LABEL_LAYOUTS;
