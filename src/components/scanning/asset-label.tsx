"use client";

import { useRef } from "react";
import { Printer } from "lucide-react";
import type { LabelData, LabelSize } from "@/lib/barcodes";
import { LABEL_SIZES } from "@/lib/barcodes";
import { ASSET_CATEGORY_LABELS } from "@/lib/assets";

// ============================================
// TYPES
// ============================================

export interface AssetLabelProps {
  label: LabelData;
  size?: LabelSize;
  showPrintButton?: boolean;
  className?: string;
}

export interface LabelSheetProps {
  labels: LabelData[];
  layout?: "thermal" | "a4-24" | "a4-21" | "a4-14";
  showPrintButton?: boolean;
}

// Re-export LABEL_SIZES from barcodes
export { LABEL_SIZES } from "@/lib/barcodes";

// ============================================
// SINGLE ASSET LABEL
// ============================================

export function AssetLabel({
  label,
  size = "medium",
  showPrintButton = true,
  className = "",
}: AssetLabelProps) {
  const labelRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!labelRef.current) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const labelSize = LABEL_SIZES[size];

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Asset Label - ${label.assetTag}</title>
          <style>
            @page {
              size: ${labelSize.width}${labelSize.unit} ${labelSize.height}${labelSize.unit};
              margin: 0;
            }
            @media print {
              body { margin: 0; padding: 0; }
              .no-print { display: none !important; }
            }
            body {
              margin: 0;
              padding: 0;
              font-family: system-ui, -apple-system, sans-serif;
            }
            .label {
              width: ${labelSize.width}${labelSize.unit};
              height: ${labelSize.height}${labelSize.unit};
              padding: 2mm;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .header {
              display: flex;
              align-items: center;
              gap: 2mm;
              font-size: 6pt;
              font-weight: bold;
            }
            .logo {
              width: 8mm;
              height: 8mm;
              background: #0d9488;
              border-radius: 1mm;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 5pt;
            }
            .content {
              display: flex;
              gap: 2mm;
              flex: 1;
              align-items: center;
            }
            .codes {
              display: flex;
              flex-direction: column;
              gap: 1mm;
              align-items: center;
            }
            .qr-code img {
              width: 15mm;
              height: 15mm;
            }
            .barcode img {
              width: 25mm;
              height: auto;
            }
            .info {
              flex: 1;
              font-size: 7pt;
            }
            .asset-tag {
              font-size: 10pt;
              font-weight: bold;
              font-family: monospace;
            }
            .category {
              color: #666;
              margin-top: 1mm;
            }
            .details {
              font-size: 6pt;
              color: #888;
              margin-top: 1mm;
            }
          </style>
        </head>
        <body>
          ${labelRef.current.outerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  const categoryLabel =
    ASSET_CATEGORY_LABELS[label.category as keyof typeof ASSET_CATEGORY_LABELS] || label.category;

  return (
    <div className={`relative ${className}`}>
      <div
        ref={labelRef}
        className="label bg-white border border-slate-200 rounded-lg p-3 shadow-sm"
        style={{ minWidth: "200px" }}
      >
        {/* Header with branding */}
        <div className="header flex items-center gap-2 mb-2">
          <div className="logo w-6 h-6 bg-teal-600 rounded flex items-center justify-center text-white text-xs font-bold">
            R
          </div>
          <span className="text-xs font-semibold text-slate-600">RecyTrack</span>
        </div>

        {/* Content area */}
        <div className="content flex gap-3">
          {/* Codes */}
          <div className="codes flex flex-col items-center gap-1">
            <div className="qr-code">
              <img src={label.qrCodeDataURL} alt={`QR: ${label.assetTag}`} className="w-16 h-16" />
            </div>
            <div className="barcode">
              <img src={label.barcodeDataURL} alt={`Barcode: ${label.assetTag}`} className="h-8" />
            </div>
          </div>

          {/* Info */}
          <div className="info flex-1">
            <div className="asset-tag font-mono text-lg font-bold">{label.assetTag}</div>
            <div className="category text-sm text-slate-500">{categoryLabel}</div>
            {label.manufacturer && label.model && (
              <div className="details text-xs text-slate-400 mt-1">
                {label.manufacturer} {label.model}
              </div>
            )}
            {label.serialNumber && (
              <div className="details text-xs text-slate-400 font-mono">S/N: {label.serialNumber}</div>
            )}
            {label.customerRef && (
              <div className="details text-xs text-slate-400">Ref: {label.customerRef}</div>
            )}
          </div>
        </div>
      </div>

      {/* Print button */}
      {showPrintButton && (
        <button
          onClick={handlePrint}
          className="no-print absolute top-2 right-2 p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          title="Print label"
        >
          <Printer className="w-4 h-4 text-slate-600" />
        </button>
      )}
    </div>
  );
}

// ============================================
// LABEL SHEET (Multiple labels)
// ============================================

export function LabelSheet({ labels, layout = "a4-24", showPrintButton = true }: LabelSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!sheetRef.current) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Layout configurations
    const layouts = {
      thermal: { cols: 1, rows: labels.length, width: "60mm", height: "40mm" },
      "a4-24": { cols: 3, rows: 8, width: "63.5mm", height: "33.9mm" },
      "a4-21": { cols: 3, rows: 7, width: "63.5mm", height: "38.1mm" },
      "a4-14": { cols: 2, rows: 7, width: "99.1mm", height: "38.1mm" },
    };

    const config = layouts[layout];

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Asset Labels</title>
          <style>
            @page {
              size: A4;
              margin: 10mm;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none !important; }
            }
            body {
              margin: 0;
              padding: 10mm;
              font-family: system-ui, -apple-system, sans-serif;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(${config.cols}, ${config.width});
              gap: 0;
            }
            .label {
              width: ${config.width};
              height: ${config.height};
              padding: 2mm;
              box-sizing: border-box;
              border: 0.5pt dashed #ccc;
              display: flex;
              flex-direction: column;
              page-break-inside: avoid;
            }
            .header {
              display: flex;
              align-items: center;
              gap: 1mm;
              font-size: 5pt;
              font-weight: bold;
              margin-bottom: 1mm;
            }
            .logo {
              width: 4mm;
              height: 4mm;
              background: #0d9488;
              border-radius: 0.5mm;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 3pt;
            }
            .content {
              display: flex;
              gap: 2mm;
              flex: 1;
            }
            .codes {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 0.5mm;
            }
            .qr-code img {
              width: 12mm;
              height: 12mm;
            }
            .barcode img {
              width: 20mm;
              height: 6mm;
            }
            .info {
              flex: 1;
              font-size: 6pt;
            }
            .asset-tag {
              font-size: 8pt;
              font-weight: bold;
              font-family: monospace;
            }
            .category {
              color: #666;
              font-size: 5pt;
            }
            .details {
              font-size: 5pt;
              color: #888;
            }
          </style>
        </head>
        <body>
          <div class="grid">
            ${labels
              .map(
                (label) => `
              <div class="label">
                <div class="header">
                  <div class="logo">R</div>
                  <span>RecyTrack</span>
                </div>
                <div class="content">
                  <div class="codes">
                    <div class="qr-code">
                      <img src="${label.qrCodeDataURL}" alt="QR" />
                    </div>
                    <div class="barcode">
                      <img src="${label.barcodeDataURL}" alt="Barcode" />
                    </div>
                  </div>
                  <div class="info">
                    <div class="asset-tag">${label.assetTag}</div>
                    <div class="category">${
                      ASSET_CATEGORY_LABELS[label.category as keyof typeof ASSET_CATEGORY_LABELS] ||
                      label.category
                    }</div>
                    ${label.manufacturer ? `<div class="details">${label.manufacturer} ${label.model || ""}</div>` : ""}
                    ${label.serialNumber ? `<div class="details">S/N: ${label.serialNumber}</div>` : ""}
                  </div>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  const categoryLabel = (category: string) =>
    ASSET_CATEGORY_LABELS[category as keyof typeof ASSET_CATEGORY_LABELS] || category;

  return (
    <div className="space-y-4">
      {showPrintButton && (
        <div className="flex items-center justify-between no-print">
          <p className="text-sm text-slate-500">{labels.length} labels ready to print</p>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print All Labels
          </button>
        </div>
      )}

      <div
        ref={sheetRef}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg"
      >
        {labels.map((label) => (
          <div
            key={label.assetTag}
            className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 bg-teal-600 rounded flex items-center justify-center text-white text-[10px] font-bold">
                R
              </div>
              <span className="text-xs font-semibold text-slate-600">RecyTrack</span>
            </div>

            <div className="flex gap-2">
              <div className="flex flex-col items-center gap-1">
                <img src={label.qrCodeDataURL} alt="QR" className="w-12 h-12" />
                <img src={label.barcodeDataURL} alt="Barcode" className="h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm font-bold truncate">{label.assetTag}</div>
                <div className="text-xs text-slate-500 truncate">{categoryLabel(label.category)}</div>
                {label.serialNumber && (
                  <div className="text-[10px] text-slate-400 font-mono truncate">
                    S/N: {label.serialNumber}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
