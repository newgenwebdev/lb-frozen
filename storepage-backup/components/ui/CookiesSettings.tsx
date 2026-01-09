"use client";

import { useState } from "react";

interface CookiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (settings: CookieSettings) => void;
  onRejectAll?: () => void;
}

interface CookieSettings {
  essential: boolean;
  performance: boolean;
  marketing: boolean;
  acceptAll: boolean;
}

export default function CookiesModal({
  isOpen,
  onClose,
  onConfirm,
  onRejectAll,
}: CookiesModalProps) {
  const [settings, setSettings] = useState<CookieSettings>({
    essential: true,
    performance: true,
    marketing: true,
    acceptAll: false,
  });

  const handleToggle = (key: keyof CookieSettings) => {
    if (key === "essential") return; // Essential cookies cannot be disabled

    if (key === "acceptAll") {
      const newValue = !settings.acceptAll;
      setSettings({
        essential: true,
        performance: newValue,
        marketing: newValue,
        acceptAll: newValue,
      });
    } else {
      setSettings((prev) => ({
        ...prev,
        [key]: !prev[key],
        acceptAll: false,
      }));
    }
  };

  const handleConfirm = () => {
    onConfirm?.(settings);
    onClose();
  };

  const handleRejectAll = () => {
    setSettings({
      essential: true,
      performance: false,
      marketing: false,
      acceptAll: false,
    });
    onRejectAll?.();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[45] transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-5 pb-2">
            <h2 className="text-xl font-semibold text-neutral-900">
              Cookies settings
            </h2>
            <button
              onClick={onClose}
              className="text-neutral-400 cursor-pointer hover:text-neutral-600 transition-colors p-1"
              aria-label="Close"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Cookie Options */}
          <div className="px-5 py-3 space-y-5">
            {/* Essential Cookies */}
            <CookieOption
              title="Essential cookies"
              description="These cookies are necessary for the website to function properly, enabling core features like navigation and secure checkout. They cannot be disabled."
              enabled={settings.essential}
              onChange={() => handleToggle("essential")}
              disabled
            />

            {/* Performance Cookies */}
            <CookieOption
              title="Performance cookies"
              description="These cookies help us analyze how you interact with our site, allowing us to improve performance and user experience. They collect anonymous data on page visits and site usage."
              enabled={settings.performance}
              onChange={() => handleToggle("performance")}
            />

            {/* Marketing Cookies */}
            <CookieOption
              title="Marketing cookies"
              description="These cookies enable us to deliver personalized ads and content based on your browsing behavior. They help us share relevant natural skincare offers with you."
              enabled={settings.marketing}
              onChange={() => handleToggle("marketing")}
            />

            {/* Accept All */}
            <CookieOption
              title="Accept all cookies"
              description="Click here to allow all cookies and enjoy a fully personalized experience with KingJess."
              enabled={settings.acceptAll}
              onChange={() => handleToggle("acceptAll")}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 p-5 pt-3">
            <button
              onClick={handleConfirm}
              className="flex-1 cursor-pointer bg-neutral-900 text-white py-3 px-6 rounded-full text-sm font-medium
                       hover:bg-neutral-800 transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={handleRejectAll}
              className="flex-1 cursor-pointer bg-white text-neutral-900 py-3 px-6 rounded-full text-sm font-medium
                       border border-neutral-300 hover:bg-neutral-50 transition-colors"
            >
              Reject all
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Toggle Switch Component
function Toggle({
  enabled,
  onChange,
  disabled = false,
}: {
  enabled: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={onChange}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
        ${enabled ? "bg-neutral-900" : "bg-neutral-300"}
        ${disabled ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
          ${enabled ? "translate-x-6" : "translate-x-1"}
        `}
      />
    </button>
  );
}

// Cookie Option Component
function CookieOption({
  title,
  description,
  enabled,
  onChange,
  disabled = false,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Toggle enabled={enabled} onChange={onChange} disabled={disabled} />
        <span className="text-sm font-semibold text-neutral-900">{title}</span>
      </div>
      <p className="text-xs text-neutral-500 leading-relaxed">{description}</p>
    </div>
  );
}