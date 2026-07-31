import React, { useState } from "react";
import { Store, User, Smile, Shield, Plus, Sparkles, CheckCircle2 } from "lucide-react";
import { UserProfile } from "../types";

interface UserSelectionViewProps {
  users: UserProfile[];
  activeUser: UserProfile;
  onSelectUser: (user: UserProfile) => void;
  onOpenAddUser: () => void;
  onConfirmEnter: () => void;
}

export const UserSelectionView: React.FC<UserSelectionViewProps> = ({
  users,
  activeUser,
  onSelectUser,
  onOpenAddUser,
  onConfirmEnter,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>(activeUser.id);

  const handleUserClick = (u: UserProfile) => {
    setSelectedUserId(u.id);
    onSelectUser(u);
  };

  // Icon mapping based on user id or index
  const renderUserAvatar = (u: UserProfile, index: number) => {
    if (index === 0 || u.name === "بەرهەم") {
      return (
        <div className="w-12 h-12 rounded-2xl bg-[#008767] text-white flex items-center justify-center shadow-sm shrink-0">
          <User className="w-6 h-6" />
        </div>
      );
    }
    if (index === 1 || u.name === "مەریوان") {
      return (
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-sm shrink-0">
          <Smile className="w-6 h-6" />
        </div>
      );
    }
    return (
      <div className="w-12 h-12 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center shadow-sm shrink-0">
        <Shield className="w-6 h-6" />
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto py-4 px-2">
      
      {/* Outer Rounded Container matching screenshot */}
      <div className="bg-stone-50/70 rounded-3xl border border-emerald-100/90 shadow-sm p-6 sm:p-8 text-center">
        
        {/* Top Store Icon in Circle */}
        <div className="w-20 h-20 rounded-full bg-emerald-100/90 text-[#008767] flex items-center justify-center mx-auto mb-4 shadow-inner">
          <Store className="w-10 h-10" />
        </div>

        {/* Title & Subtitle */}
        <h2 className="text-2xl font-black text-stone-900 font-display tracking-tight mb-1">
          دووکانی من
        </h2>
        <h3 className="text-base font-bold text-stone-800 font-display mb-1">
          دیاریکردنی بەکارهێنەر
        </h3>
        <p className="text-xs text-stone-500 max-w-xs mx-auto mb-6 leading-relaxed">
          تکایە ناوی خۆت هەڵبژێره بۆ چوونه‌ژووره‌وه و تۆمارکردنی کارەکانت
        </p>

        {/* Users Selection Cards List */}
        <div className="space-y-3 mb-6">
          {users.map((u, index) => {
            const isSelected = u.id === selectedUserId;

            return (
              <div
                key={u.id}
                onClick={() => handleUserClick(u)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-right ${
                  isSelected
                    ? "bg-white border-2 border-[#008767] shadow-md shadow-emerald-700/10 ring-2 ring-[#008767]/10"
                    : "bg-white border-stone-200/80 hover:border-stone-300 hover:bg-stone-50/80"
                }`}
              >
                {/* Left side info in RTL */}
                <div className="flex items-center gap-3">
                  {renderUserAvatar(u, index)}

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-stone-900 text-base font-display">
                        {u.name}
                      </h4>

                      {isSelected && (
                        <span className="text-[10px] font-bold bg-[#008767] text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          گۆڕا بە بەکارهێنەر
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {u.role || (index === 0 ? "بەکارهێنەری سەرەکی" : "بەکارهێنەر")}
                    </p>
                  </div>
                </div>

                {/* Right side check mark or radio circle */}
                <div className="shrink-0">
                  {isSelected ? (
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-[#008767] flex items-center justify-center font-bold">
                      <User className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-stone-300"></div>
                  )}
                </div>

              </div>
            );
          })}
        </div>

        {/* Add New User Dotted Button */}
        <button
          onClick={onOpenAddUser}
          className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-stone-300 hover:border-[#008767] text-stone-600 hover:text-[#008767] bg-white text-xs font-bold transition flex items-center justify-center gap-2 mb-6"
        >
          <Plus className="w-4 h-4" />
          <span>زیادکردنی بەکارهێنەری نوێ</span>
        </button>

        {/* Main CTA Enter Button */}
        <button
          onClick={onConfirmEnter}
          className="w-full py-4 px-6 bg-[#008767] hover:bg-[#007256] text-white rounded-2xl font-bold text-sm sm:text-base shadow-lg shadow-emerald-700/25 transition active:scale-98 flex items-center justify-center gap-2 font-display"
        >
          <Sparkles className="w-5 h-5 text-amber-300" />
          <span>چوونه‌ژووره‌وه بۆ دووکان و دفتەری قەرز</span>
        </button>

      </div>

    </div>
  );
};
