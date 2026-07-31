import React from "react";
import { ShieldCheck, ShieldAlert, Award, AlertTriangle, Info } from "lucide-react";
import { CreditRatingResult } from "../utils/creditRating";

interface CreditRatingBadgeProps {
  rating: CreditRatingResult;
  size?: "sm" | "md" | "lg";
  showTitle?: boolean;
}

export const CreditRatingBadge: React.FC<CreditRatingBadgeProps> = ({
  rating,
  size = "md",
  showTitle = true,
}) => {
  const renderIcon = () => {
    switch (rating.grade) {
      case "A":
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />;
      case "B":
        return <Award className="w-3.5 h-3.5 text-amber-600" />;
      case "C":
        return <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />;
      case "D":
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-600 animate-pulse" />;
    }
  };

  if (size === "sm") {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border shadow-2xs ${rating.badgeBg} ${rating.badgeBorder}`}
        title={`${rating.grade} - ${rating.title}`}
      >
        <span>{rating.dotColor}</span>
        <span className="font-mono font-black">{rating.grade}</span>
        {showTitle && <span>{rating.title}</span>}
      </span>
    );
  }

  if (size === "lg") {
    return (
      <div className={`p-4 rounded-2xl border ${rating.badgeBg} ${rating.badgeBorder} space-y-2`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-white font-mono text-base ${rating.iconBg}`}>
              {rating.grade}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-stone-900 font-display">
                  پلەی متمانە: {rating.title}
                </span>
                <span className="text-xs">{rating.dotColor}</span>
              </div>
              <p className="text-[11px] text-stone-600 font-medium">
                {rating.description}
              </p>
            </div>
          </div>

          <div className="text-left font-mono">
            <span className="text-xs text-stone-400 font-bold block">نمرەی متمانە</span>
            <span className={`text-lg font-black ${rating.textColor}`}>
              {rating.score} / 100
            </span>
          </div>
        </div>

        {/* Score Progress Bar */}
        <div className="w-full bg-stone-200/80 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${rating.iconBg}`}
            style={{ width: `${rating.score}%` }}
          />
        </div>
      </div>
    );
  }

  // Medium (default)
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-xl border ${rating.badgeBg} ${rating.badgeBorder} shadow-2xs`}
    >
      {renderIcon()}
      <span className="font-mono text-xs font-black">{rating.grade}</span>
      {showTitle && <span>{rating.title}</span>}
    </span>
  );
};
