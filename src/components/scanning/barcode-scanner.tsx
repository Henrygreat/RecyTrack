"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import {
  Camera,
  CameraOff,
  Flashlight,
  FlashlightOff,
  RefreshCw,
  Keyboard,
  X,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

export interface ScanResult {
  value: string;
  format: string;
  timestamp: Date;
}

export interface BarcodeScannerProps {
  onScan: (result: ScanResult) => void;
  onError?: (error: string) => void;
  continuous?: boolean;
  debounceMs?: number;
  scannerHeight?: number;
  showManualInput?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

// ============================================
// BARCODE SCANNER COMPONENT
// ============================================

export function BarcodeScanner({
  onScan,
  onError,
  continuous = true,
  debounceMs = 1500,
  scannerHeight = 300,
  showManualInput = true,
  placeholder = "Enter asset tag or scan barcode...",
  disabled = false,
}: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScanRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);
  const manualInputRef = useRef<HTMLInputElement>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScanValue, setLastScanValue] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [showManualMode, setShowManualMode] = useState(false);

  // Handle successful scan with debounce
  const handleScanSuccess = useCallback(
    (decodedText: string, decodedResult: { result: { format?: { formatName?: string } } }) => {
      const now = Date.now();
      const isDuplicate =
        decodedText === lastScanRef.current && now - lastScanTimeRef.current < debounceMs;

      if (isDuplicate) {
        return;
      }

      lastScanRef.current = decodedText;
      lastScanTimeRef.current = now;

      const result: ScanResult = {
        value: decodedText,
        format: decodedResult.result?.format?.formatName || "unknown",
        timestamp: new Date(),
      };

      setLastScanValue(decodedText);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1000);

      onScan(result);

      if (!continuous) {
        stopScanner();
      }
    },
    [onScan, continuous, debounceMs]
  );

  // Initialize scanner
  const startScanner = useCallback(async () => {
    if (!containerRef.current || disabled) return;

    try {
      setCameraError(null);

      // Check for camera support
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setHasCamera(false);
        setCameraError("No camera found. Use manual input or a USB scanner.");
        return;
      }

      // Create scanner instance
      const scanner = new Html5Qrcode("qr-reader", {
        verbose: false,
      });
      scannerRef.current = scanner;

      // Get preferred camera (back camera on mobile)
      const backCamera = devices.find(
        (d) =>
          d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("rear")
      );
      const cameraId = backCamera?.id || devices[0].id;

      await scanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.777,
        },
        handleScanSuccess,
        // Ignore errors during scanning (common when no barcode in view)
        () => {}
      );

      setIsScanning(true);

      // Check torch support
      try {
        const capabilities = scanner.getRunningTrackCameraCapabilities();
        if (capabilities.torchFeature && capabilities.torchFeature().isSupported()) {
          setTorchSupported(true);
        }
      } catch {
        // Torch not supported
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to start camera";
      setCameraError(errorMessage);
      onError?.(errorMessage);
      setHasCamera(false);
    }
  }, [handleScanSuccess, onError, disabled]);

  // Stop scanner
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }
        scannerRef.current = null;
      } catch {
        // Ignore cleanup errors
      }
    }
    setIsScanning(false);
    setTorchEnabled(false);
  }, []);

  // Toggle torch
  const toggleTorch = useCallback(async () => {
    if (!scannerRef.current || !torchSupported) return;

    try {
      const capabilities = scannerRef.current.getRunningTrackCameraCapabilities();
      if (capabilities.torchFeature) {
        await capabilities.torchFeature().apply(!torchEnabled);
        setTorchEnabled(!torchEnabled);
      }
    } catch {
      // Torch toggle failed
    }
  }, [torchEnabled, torchSupported]);

  // Handle manual input
  const handleManualSubmit = useCallback(() => {
    const value = manualInput.trim();
    if (!value) return;

    const result: ScanResult = {
      value,
      format: "manual",
      timestamp: new Date(),
    };

    setLastScanValue(value);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 1000);
    setManualInput("");

    onScan(result);
  }, [manualInput, onScan]);

  // Handle keyboard input (USB scanners typically send Enter after scan)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleManualSubmit();
      }
    },
    [handleManualSubmit]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  // Auto-focus manual input when shown
  useEffect(() => {
    if (showManualMode && manualInputRef.current) {
      manualInputRef.current.focus();
    }
  }, [showManualMode]);

  return (
    <div className="flex flex-col gap-4">
      {/* Scanner Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasCamera && (
            <>
              <button
                onClick={isScanning ? stopScanner : startScanner}
                disabled={disabled}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isScanning
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-teal-600 text-white hover:bg-teal-700"
                } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isScanning ? (
                  <>
                    <CameraOff className="w-4 h-4" />
                    Stop Camera
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    Start Camera
                  </>
                )}
              </button>

              {isScanning && torchSupported && (
                <button
                  onClick={toggleTorch}
                  className={`p-2 rounded-lg transition-colors ${
                    torchEnabled
                      ? "bg-yellow-500 text-white"
                      : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                  }`}
                  title={torchEnabled ? "Turn off torch" : "Turn on torch"}
                >
                  {torchEnabled ? (
                    <FlashlightOff className="w-5 h-5" />
                  ) : (
                    <Flashlight className="w-5 h-5" />
                  )}
                </button>
              )}

              {isScanning && (
                <button
                  onClick={() => {
                    stopScanner();
                    setTimeout(startScanner, 100);
                  }}
                  className="p-2 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors"
                  title="Restart scanner"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              )}
            </>
          )}
        </div>

        {showManualInput && (
          <button
            onClick={() => setShowManualMode(!showManualMode)}
            className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              showManualMode
                ? "bg-slate-800 text-white"
                : "bg-slate-200 text-slate-600 hover:bg-slate-300"
            }`}
          >
            <Keyboard className="w-4 h-4" />
            Manual Entry
          </button>
        )}
      </div>

      {/* Camera Error */}
      {cameraError && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Camera unavailable</p>
            <p className="text-sm text-amber-600 mt-1">{cameraError}</p>
          </div>
        </div>
      )}

      {/* Camera View */}
      {hasCamera && !showManualMode && (
        <div className="relative rounded-lg overflow-hidden bg-slate-900">
          <div
            id="qr-reader"
            ref={containerRef}
            style={{ height: isScanning ? scannerHeight : 0 }}
            className="transition-all duration-300"
          />

          {!isScanning && (
            <div
              className="flex items-center justify-center bg-slate-100"
              style={{ height: scannerHeight }}
            >
              <div className="text-center p-6">
                <Camera className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Camera paused</p>
                <p className="text-sm text-slate-400 mt-1">
                  Click &quot;Start Camera&quot; to begin scanning
                </p>
              </div>
            </div>
          )}

          {/* Success Overlay */}
          {showSuccess && (
            <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 backdrop-blur-sm">
              <div className="bg-white rounded-lg p-4 shadow-lg flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <span className="font-medium">Scanned: {lastScanValue}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Input */}
      {showManualInput && (showManualMode || !hasCamera) && (
        <div className="flex gap-2">
          <input
            ref={manualInputRef}
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 px-4 py-3 text-lg font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:opacity-50"
            autoComplete="off"
          />
          <button
            onClick={handleManualSubmit}
            disabled={disabled || !manualInput.trim()}
            className="px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit
          </button>
        </div>
      )}

      {/* Last Scan Display */}
      {lastScanValue && !showSuccess && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-100">
          <div>
            <span className="text-sm text-slate-500">Last scan:</span>
            <span className="ml-2 font-mono font-medium">{lastScanValue}</span>
          </div>
          <button
            onClick={() => setLastScanValue(null)}
            className="p-1 hover:bg-slate-200 rounded transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      )}
    </div>
  );
}
