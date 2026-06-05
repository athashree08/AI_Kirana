import React, { useState } from "react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (merchantId: string, merchantName: string) => void;
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [merchantId, setMerchantId] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("Kirana");
  const [city, setCity] = useState("");
  const [language, setLanguage] = useState("Hindi");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        // Login Flow
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: merchantId,
            password: password,
          }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.detail || data.message || "Invalid credentials");
        }
        onAuthSuccess(data.merchant.id, data.merchant.name);
      } else {
        // Register Flow
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: merchantId,
            name: businessName,
            language: language,
            business_type: businessType,
            city: city,
            phone_number: phoneNumber,
            password: password,
          }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.detail || data.message || "Registration failed");
        }
        onAuthSuccess(data.merchant.id, data.merchant.name);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden relative transform transition-all duration-300 scale-100 flex flex-col max-h-[90vh]">
        {/* Header Block with Red Accent Banner */}
        <div className="bg-gradient-to-r from-[#c83226] to-[#b0281e] p-6 text-white relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/10 hover:bg-black/20 w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer border-none"
            aria-label="Close"
          >
            ✕
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shadow-inner">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 2H6c-1.206 0-3 .799-3 3v14c0 2.201 1.794 3 3 3h13c1.104 0 2-.896 2-2V4c0-1.104-.896-2-2-2zM6 20c-.57 0-1-.18-1-.5s.43-.5 1-.5h13v1H6z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">Vyapar Saathi</h2>
              <p className="text-[10px] text-white/75 uppercase tracking-wider font-semibold">Business hua easy</p>
            </div>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-100 shrink-0 bg-slate-50/50">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError("");
            }}
            className={`flex-1 py-4 text-sm font-bold transition-all border-b-2 cursor-pointer border-x-none border-t-none ${
              isLogin
                ? "text-[#c83226] border-b-[#c83226] bg-white"
                : "text-slate-500 border-b-transparent bg-transparent hover:text-slate-800"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError("");
            }}
            className={`flex-1 py-4 text-sm font-bold transition-all border-b-2 cursor-pointer border-x-none border-t-none ${
              !isLogin
                ? "text-[#c83226] border-b-[#c83226] bg-white"
                : "text-slate-500 border-b-transparent bg-transparent hover:text-slate-800"
            }`}
          >
            Register Business
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-[#c83226] text-xs font-semibold p-3.5 rounded-xl flex items-start gap-2.5">
              <span className="text-base shrink-0">⚠️</span>
              <div>{error}</div>
            </div>
          )}

          {/* Merchant ID */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
              Merchant ID / Username
            </label>
            <input
              type="text"
              required
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value.trim().toLowerCase())}
              placeholder={isLogin ? "merchant_001" : "e.g. merchant_002"}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#c83226]/20 focus:border-[#c83226] transition-all bg-slate-50/50 focus:bg-white text-slate-800 placeholder-slate-400"
            />
            {!isLogin && (
              <p className="text-[10px] text-slate-400 mt-1">
                A unique ID used to identify your business account.
              </p>
            )}
          </div>

          {/* Registration Extra Fields */}
          {!isLogin && (
            <>
              {/* Business Name */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Business Name
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Ramesh Kirana Store"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#c83226]/20 focus:border-[#c83226] transition-all bg-slate-50/50 focus:bg-white text-slate-800 placeholder-slate-400"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#c83226]/20 focus:border-[#c83226] transition-all bg-slate-50/50 focus:bg-white text-slate-800 placeholder-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Business Type */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Business Type
                  </label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#c83226]/20 focus:border-[#c83226] transition-all bg-slate-50/50 focus:bg-white text-slate-800"
                  >
                    <option value="Kirana">Kirana</option>
                    <option value="Grocery">Grocery</option>
                    <option value="Supermarket">Supermarket</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Pharmacy">Pharmacy</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    City
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Jaipur"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#c83226]/20 focus:border-[#c83226] transition-all bg-slate-50/50 focus:bg-white text-slate-800 placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Language Preference
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#c83226]/20 focus:border-[#c83226] transition-all bg-slate-50/50 focus:bg-white text-slate-800"
                >
                  <option value="Hindi">Hindi (हिंदी)</option>
                  <option value="English">English</option>
                  <option value="Hinglish">Hinglish</option>
                  <option value="Marathi">Marathi (मराठी)</option>
                </select>
              </div>
            </>
          )}

          {/* Password */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#c83226]/20 focus:border-[#c83226] transition-all bg-slate-50/50 focus:bg-white text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-[#c83226] to-[#b0281e] text-white py-3 px-4 rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-red-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer border-none"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </>
            ) : isLogin ? (
              "Sign In to Dashboard"
            ) : (
              "Register & Open Dashboard"
            )}
          </button>

          {/* Hint */}
          {isLogin && (
            <p className="text-center text-[10px] text-slate-400 pt-2 font-medium">
              💡 Tip: Login with <strong className="text-slate-600">merchant_001</strong> and password <strong className="text-slate-600">password</strong> to view seeded mock records.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
