import React, { useState } from "react";
import { X, Calculator, Delete } from "lucide-react";

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CalculatorModal: React.FC<CalculatorModalProps> = ({ isOpen, onClose }) => {
  const [display, setDisplay] = useState("0");

  if (!isOpen) return null;

  const handleBtn = (val: string) => {
    if (val === "C") {
      setDisplay("0");
    } else if (val === "DEL") {
      if (display.length <= 1) setDisplay("0");
      else setDisplay(display.slice(0, -1));
    } else if (val === "=") {
      try {
        // Safe evaluation of mathematical expression
        const sanitized = display.replace(/×/g, "*").replace(/÷/g, "/");
        const res = Function(`"use strict"; return (${sanitized})`)();
        setDisplay(String(res));
      } catch {
        setDisplay("هەڵەیە");
      }
    } else {
      if (display === "0" || display === "هەڵەیە") {
        setDisplay(val);
      } else {
        setDisplay(display + val);
      }
    }
  };

  const buttons = [
    ["C", "DEL", "÷"],
    ["7", "8", "9", "×"],
    ["4", "5", "6", "-"],
    ["1", "2", "3", "+"],
    ["000", "0", ".", "="],
  ];

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-xs overflow-hidden">
        
        {/* Header */}
        <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-300" />
            <h3 className="font-bold text-sm font-display">ژمێرەر (حاسبە)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-white bg-stone-800 rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Display Screen */}
        <div className="p-4 bg-stone-100 text-right">
          <div className="text-2xl font-black font-mono text-stone-900 tracking-wider truncate">
            {display}
          </div>
        </div>

        {/* Pad */}
        <div className="p-3 grid grid-cols-4 gap-2 bg-stone-50">
          {buttons.map((row, rIdx) =>
            row.map((btn) => {
              const isOp = ["÷", "×", "-", "+", "="].includes(btn);
              const isClear = ["C", "DEL"].includes(btn);

              return (
                <button
                  key={btn}
                  onClick={() => handleBtn(btn)}
                  className={`py-3 rounded-xl font-bold text-sm transition active:scale-95 ${
                    btn === "="
                      ? "col-span-1 bg-[#008767] text-white shadow-md"
                      : isOp
                      ? "bg-amber-500 text-white"
                      : isClear
                      ? "bg-red-100 text-red-700"
                      : "bg-white text-stone-800 border border-stone-200 shadow-xs hover:bg-stone-100"
                  }`}
                >
                  {btn === "DEL" ? <Delete className="w-4 h-4 mx-auto" /> : btn}
                </button>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};
