"use client";

import { useEffect, useCallback } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
}: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const widthClass = {
    sm: "400px",
    md: "560px",
    lg: "720px",
  }[size];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: "relative",
          backgroundColor: "white",
          borderRadius: "0.5rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          width: "100%",
          maxWidth: widthClass,
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: "1rem 1.5rem",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.125rem", fontWeight: "600", margin: 0 }}>
              {title}
            </h2>
            {description && (
              <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.25rem" }}>
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              padding: "0.375rem",
              background: "none",
              border: "none",
              cursor: "pointer",
              borderRadius: "0.25rem",
              color: "#64748b",
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "1.5rem" }}>{children}</div>
      </div>
    </div>
  );
}
