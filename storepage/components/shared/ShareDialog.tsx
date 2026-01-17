"use client";

import { useState } from "react";
import { X, Copy, Check } from "lucide-react";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productTitle: string;
  productUrl: string;
}

export function ShareDialog({
  open,
  onOpenChange,
  productTitle,
  productUrl,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(productUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(`Check out ${productTitle}: ${productUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const shareToFacebook = () => {
    const url = encodeURIComponent(productUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank");
  };

  const shareToMessenger = () => {
    const url = encodeURIComponent(productUrl);
    window.open(`https://www.facebook.com/dialog/send?link=${url}&app_id=966242223397117&redirect_uri=${encodeURIComponent(window.location.href)}`, "_blank");
  };

  const shareToInstagram = () => {
    // Instagram doesn't have a direct share URL, so we copy the link
    handleCopy();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Dialog */}
      <div className="relative bg-white rounded-2xl w-full max-w-md mx-4 p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Share products</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Product Link */}
        <div className="mb-6">
          <label className="text-sm text-gray-600 mb-2 block">Product link</label>
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg p-3">
            <input
              type="text"
              value={productUrl}
              readOnly
              className="flex-1 text-sm text-gray-700 bg-transparent outline-none truncate"
            />
            <button
              onClick={handleCopy}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <Copy className="w-5 h-5 text-gray-500" />
              )}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 border-t border-dashed border-gray-300" />
          <span className="text-sm text-gray-500">Or share to</span>
          <div className="flex-1 border-t border-dashed border-gray-300" />
        </div>

        {/* Social Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {/* WhatsApp */}
          <button
            onClick={shareToWhatsApp}
            className="flex items-center justify-center gap-2 py-3 px-4 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="#25D366"/>
              <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.657 0-3.216-.493-4.518-1.343l-.324-.194-2.873.855.855-2.873-.194-.324A7.96 7.96 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" fill="#25D366"/>
            </svg>
            <span className="text-sm font-medium text-gray-700">Whatsapp</span>
          </button>

          {/* Instagram */}
          <button
            onClick={shareToInstagram}
            className="flex items-center justify-center gap-2 py-3 px-4 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FFDC80" />
                  <stop offset="25%" stopColor="#F77737" />
                  <stop offset="50%" stopColor="#E1306C" />
                  <stop offset="75%" stopColor="#C13584" />
                  <stop offset="100%" stopColor="#833AB4" />
                </linearGradient>
              </defs>
              <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#instagram-gradient)" strokeWidth="2" fill="none"/>
              <circle cx="12" cy="12" r="4" stroke="url(#instagram-gradient)" strokeWidth="2" fill="none"/>
              <circle cx="17.5" cy="6.5" r="1.5" fill="url(#instagram-gradient)"/>
            </svg>
            <span className="text-sm font-medium text-gray-700">Instagram</span>
          </button>

          {/* Facebook */}
          <button
            onClick={shareToFacebook}
            className="flex items-center justify-center gap-2 py-3 px-4 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span className="text-sm font-medium text-gray-700">Facebook</span>
          </button>

          {/* Messenger */}
          <button
            onClick={shareToMessenger}
            className="flex items-center justify-center gap-2 py-3 px-4 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient id="messenger-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0099FF" />
                  <stop offset="100%" stopColor="#A033FF" />
                </linearGradient>
              </defs>
              <path d="M12 2C6.477 2 2 6.145 2 11.259c0 2.913 1.454 5.512 3.726 7.21V22l3.405-1.869c.909.252 1.871.388 2.869.388 5.523 0 10-4.145 10-9.259S17.523 2 12 2zm.994 12.469l-2.548-2.717-4.973 2.717 5.469-5.805 2.612 2.717 4.909-2.717-5.469 5.805z" fill="url(#messenger-gradient)"/>
            </svg>
            <span className="text-sm font-medium text-gray-700">Messenger</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ShareDialog;
