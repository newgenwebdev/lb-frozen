import React, { useState, useRef, useEffect } from "react";

type ColorInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
};

export function ColorInput({
  label,
  value,
  onChange,
  error,
  className = "",
}: ColorInputProps): React.JSX.Element {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const presetColors = [
    "#007AFF",
    "#34C759",
    "#FF9500",
    "#FF3B30",
    "#AF52DE",
    "#5856D6",
    "#5AC8FA",
    "#FF2D55",
    "#000000",
    "#FFFFFF",
    "#454674",
    "#8E8E93",
  ];

  const handleColorChange = (newColor: string): void => {
    // Ensure it starts with #
    const formattedColor = newColor.startsWith("#") ? newColor : `#${newColor}`;
    // Validate hex color
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(formattedColor)) {
      onChange(formattedColor);
    }
  };

  return (
    <div className={className}>
      <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
        {label}
      </label>
      <div className="relative" ref={pickerRef}>
        <div className="flex items-center gap-2">
          <div
            className="h-10 w-10 shrink-0 rounded border border-[#E5E5E5] cursor-pointer"
            style={{ backgroundColor: value || "#000000" }}
            onClick={() => setIsPickerOpen(!isPickerOpen)}
          />
          <input
            type="text"
            value={value}
            onChange={(e) => handleColorChange(e.target.value)}
            placeholder="#000000"
            className={`flex-1 rounded-lg border px-4 py-2 font-public text-[14px] font-medium tracking-[-0.14px] outline-none transition-colors ${
              error
                ? "border-[#DC2626] focus:border-[#DC2626]"
                : "border-[#E5E5E5] focus:border-[#030712]"
            }`}
          />
        </div>

        {isPickerOpen && (
          <div className="absolute top-full left-0 mt-2 z-10 w-[280px] bg-white border border-[#E5E7EB] rounded-lg shadow-lg p-4">
            <div className="mb-3">
              <label className="mb-2 block font-public text-[12px] text-[#6A7282]">Preset Colors</label>
              <div className="grid grid-cols-6 gap-2">
                {presetColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      onChange(color);
                      setIsPickerOpen(false);
                    }}
                    className={`h-8 w-8 rounded border-2 transition-all ${
                      value === color ? "border-[#030712] scale-110" : "border-[#E5E5E5]"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block font-public text-[12px] text-[#6A7282]">Custom Color</label>
              <input
                type="color"
                value={value || "#000000"}
                onChange={(e) => onChange(e.target.value)}
                className="h-10 w-full cursor-pointer rounded border border-[#E5E5E5]"
              />
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 font-public text-[12px] text-[#DC2626]">{error}</p>
      )}
    </div>
  );
}

