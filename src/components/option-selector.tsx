"use client";

import { useEffect, useRef, useState } from "react";

interface Option {
  id: string;
  label: string;
  priceAdjustment: number;
}

interface OptionSelectorProps {
  label: string;
  options: Option[];
  selectedOption: Option | null;
  onSelect: (option: Option) => void;
  currency?: string;
  useDropdown?: boolean;
}

export function OptionSelector({
  label,
  options,
  selectedOption,
  onSelect,
  currency = "USD",
  useDropdown = false,
}: OptionSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatPrice = (price: number, curr: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: curr,
    }).format(price);
  };

  const calculateBadge = (option: Option) => {
    const selectedPrice = selectedOption?.priceAdjustment || 0;
    const priceDiff = option.priceAdjustment - selectedPrice;
    const isSelected = selectedOption?.id === option.id;

    let badgeColor = "bg-gray-100 text-gray-700";
    let badgeText = "Included";

    if (isSelected) {
      badgeColor = "bg-blue-100 text-blue-700";
      badgeText = "Included";
    } else if (priceDiff === 0) {
      badgeColor = "bg-blue-100 text-blue-700";
      badgeText = "Included";
    } else if (priceDiff > 0) {
      badgeColor = "bg-green-100 text-green-700";
      badgeText = `+${formatPrice(priceDiff, currency)}`;
    } else {
      badgeColor = "bg-red-100 text-red-700";
      badgeText = `${formatPrice(priceDiff, currency)}`;
    }

    return { badgeColor, badgeText };
  };

  if (useDropdown) {
    return (
      <div>
        <div className="text-xs font-medium text-gray-600 mb-2">{label}</div>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white text-gray-900 font-medium text-left flex justify-between items-center"
          >
            <span>
              {selectedOption ? selectedOption.label : `Select ${label}`}
            </span>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${
                showDropdown ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
              {options.map((option) => {
                const { badgeColor, badgeText } = calculateBadge(option);

                return (
                  <button
                    key={option.id}
                    onClick={() => {
                      onSelect(option);
                      setShowDropdown(false);
                    }}
                    className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex justify-between items-center"
                  >
                    <span className="font-medium text-gray-900">
                      {option.label}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${badgeColor}`}
                    >
                      {badgeText}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Tile/button layout
  return (
    <div>
      <div className="text-xs font-medium text-gray-600 mb-2">{label}</div>
      <div className="grid grid-cols-1 gap-2">
        {options.map((option) => {
          const { badgeColor, badgeText } = calculateBadge(option);

          return (
            <button
              key={option.id}
              onClick={() => onSelect(option)}
              className={`p-3 border rounded-lg transition-all duration-200 text-left ${
                selectedOption?.id === option.id
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                  : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm text-gray-900">
                  {option.label}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${badgeColor}`}
                >
                  {badgeText}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
