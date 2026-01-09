'use client';

import Image from 'next/image';
import { useState } from 'react';

export default function Navbar() {
  const [language, setLanguage] = useState('English');
  const [isLangOpen, setIsLangOpen] = useState(false);

  const languages = ['English', 'Indonesia'];

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left side - Logo and Brand */}
        <div className="flex items-center gap-3">
          <Image
            src="/lb-logo.png"
            alt="LB Frozen Logo"
            width={40}
            height={40}
            priority
          />
          <span className="text-xl font-semibold text-gray-900">Bartar</span>
        </div>

        {/* Right side - Language Selector */}
        <div className="relative">
          <button
            onClick={() => setIsLangOpen(!isLangOpen)}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl">🇺🇸</span>
            <span className="text-sm font-medium">{language}</span>
            <svg
              className={`w-4 h-4 transition-transform ${isLangOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown */}
          {isLangOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 shadow-lg z-10">
              {languages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    setLanguage(lang);
                    setIsLangOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <span className="text-xl">{lang === 'English' ? '🇺🇸' : '🇮🇩'}</span>
                  <span>{lang}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
