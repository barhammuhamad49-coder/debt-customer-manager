import React, { useState, useEffect, useRef } from "react";
import { Search, History, Check } from "lucide-react";

interface AutocompleteInputProps {
  id?: string;
  value: string;
  onChange: (val: string) => void;
  savedItems?: string[];
  placeholder?: string;
  className?: string;
  required?: boolean;
  onSaveNewItem?: (newItem: string) => void;
  label?: string;
  type?: string;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  id,
  value,
  onChange,
  savedItems = [],
  placeholder = "گەڕان یان بنووسە...",
  className = "",
  required = false,
  onSaveNewItem,
  label,
  type = "text",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter suggestions based on typed query (matches starting or anywhere in string)
  const trimmed = value.trim().toLowerCase();
  const filteredSuggestions = Array.from(new Set(savedItems))
    .filter((item) => item && item.trim().length > 0)
    .filter((item) => {
      if (!trimmed) return true; // show history when empty if focused
      return item.toLowerCase().includes(trimmed);
    })
    .slice(0, 8); // Top 8 suggestions

  const handleSelect = (item: string) => {
    onChange(item);
    if (onSaveNewItem) {
      onSaveNewItem(item);
    }
    setIsOpen(false);
  };

  const handleBlur = () => {
    if (value.trim() && onSaveNewItem) {
      onSaveNewItem(value.trim());
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      {label && (
        <label htmlFor={id} className="block text-xs font-bold text-stone-700 mb-1">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          className={`w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#008767]/20 focus:border-[#008767] transition ${className}`}
        />

        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setIsOpen(true);
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs px-1"
          >
            ✕
          </button>
        )}
      </div>

      {/* Autocomplete Suggestions Dropdown */}
      {isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 right-0 left-0 mt-1 bg-white border border-stone-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto divide-y divide-stone-100 animate-in fade-in slide-in-from-top-1 duration-100">
          <div className="px-3 py-1.5 text-[10px] font-bold text-stone-400 bg-stone-50/80 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <History className="w-3 h-3 text-[#008767]" />
              پێشنیارەکانی گەڕانی پاشەکەوتکراو
            </span>
            <span className="text-[9px] text-stone-400">کلیک بکە بۆ هەڵبژاردن</span>
          </div>

          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={`${suggestion}-${index}`}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent input blur before click
                handleSelect(suggestion);
              }}
              className="w-full text-right px-3.5 py-2.5 text-xs text-stone-800 hover:bg-emerald-50 hover:text-[#008767] transition flex items-center justify-between group font-medium"
            >
              <span className="font-display group-hover:font-bold">{suggestion}</span>
              {value.trim().toLowerCase() === suggestion.toLowerCase() ? (
                <Check className="w-3.5 h-3.5 text-[#008767]" />
              ) : (
                <span className="text-[10px] text-stone-400 group-hover:text-[#008767]/70 bg-stone-100 group-hover:bg-emerald-100 px-2 py-0.5 rounded-full font-mono">
                  پێشنیار
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
