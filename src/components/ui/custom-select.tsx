"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

export interface CustomSelectOption {
  value: string;
  label: string;
  subLabel?: string;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  disabled?: boolean;
}

export function CustomSelect({ value, onChange, options, placeholder = "Select option", disabled = false }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-[#13161e] border ${
          isOpen ? "border-[#7c5cfc]" : "border-white/[0.07]"
        } hover:border-white/[0.15] rounded-xl px-3.5 py-1.5 text-left text-xs text-white flex items-center justify-between transition-all focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <span className={selectedOption ? "text-white" : "text-white/30"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-white/45 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-[100] mt-1.5 max-h-60 overflow-y-auto bg-[#161b27]/95 backdrop-blur-md border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
          {options.length === 0 ? (
            <div className="px-3.5 py-2.5 text-xs text-white/30 italic text-center">
              No options available
            </div>
          ) : (
            options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3.5 py-2.5 text-left text-xs transition-all flex flex-col gap-0.5 ${
                  option.value === value
                    ? "bg-[#7c5cfc]/20 text-[#a78bfa] font-semibold"
                    : "text-white/70 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <span>{option.label}</span>
                {option.subLabel && (
                  <span className="text-[10px] text-white/30 font-normal">{option.subLabel}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
