import React, { createContext, useContext, useState } from "react";

export type Language = "en" | "hinglish";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const translations: Record<string, Record<Language, string>> = {
  // Sidebar items
  "app_title": {
    en: "AI Munshi",
    hinglish: "AI Munshi"
  },
  "sub_title": {
    en: "Hindi Voice CFO",
    hinglish: "Hindi Voice CFO"
  },
  "mgmt_header": {
    en: "Business Management",
    hinglish: "Business Chalana"
  },
  "ledgers": {
    en: "Customer & Supplier Ledgers",
    hinglish: "Hisaab Kitaab (Udhar/Supplier)"
  },
  "cfo": {
    en: "CFO Insights",
    hinglish: "CFO Insights (Munafe Ka Hisaab)"
  },
  "voice": {
    en: "Voice CFO Console",
    hinglish: "Awaaz CFO Command"
  },
  "expenses": {
    en: "Expenses & Analytics",
    hinglish: "Kharch aur Analytics"
  },
  "cashbook": {
    en: "Cashbook & Liquidity",
    hinglish: "Galla (Rojmel) aur Liquidity"
  },
  "staff": {
    en: "Staff & Permissions",
    hinglish: "Naukar (Staff) aur Permissions"
  },
  "reports": {
    en: "Reports & Analytics",
    hinglish: "Reports aur Analytics"
  },
  "customers_intel": {
    en: "Customer Intelligence",
    hinglish: "Grahak Intelligence"
  },
  "terminal": {
    en: "Live QR Terminal",
    hinglish: "Live QR Payment Machine"
  },
  "settings": {
    en: "Reset Demo Data",
    hinglish: "Demo Data Reset Karein"
  },
  "settings_header": {
    en: "Settings & Seeders",
    hinglish: "Settings aur Seeders"
  },
  "logout": {
    en: "Logout",
    hinglish: "Log Out Karein"
  },

  // Ledger Summary Cards
  "you_give": {
    en: "You'll Give",
    hinglish: "Aap Denge"
  },
  "you_get": {
    en: "You'll Get",
    hinglish: "Aap Lenge"
  },
  "cfo_loan_rating": {
    en: "CFO Loan Rating",
    hinglish: "CFO Loan Score"
  },
  "calculating": {
    en: "Calculating...",
    hinglish: "Hisab ho raha hai..."
  },
  "search_placeholder": {
    en: "Search by customer name or phone...",
    hinglish: "Grahak ka naam ya phone search karein..."
  },
  "all_risks": {
    en: "All Risks",
    hinglish: "Sare Risk Tiers"
  },
  "low_risk": {
    en: "Low Risk",
    hinglish: "Kam Risk"
  },
  "medium_risk": {
    en: "Medium Risk",
    hinglish: "Normal Risk"
  },
  "high_risk": {
    en: "High Risk",
    hinglish: "Zyada Risk"
  },
  "sort_days": {
    en: "Sort: Days Pending",
    hinglish: "Sort: Kitne din baaki"
  },
  "sort_outstanding": {
    en: "Sort: Outstanding",
    hinglish: "Sort: Udhaar amount"
  },
  "sort_risk": {
    en: "Sort: Risk Score",
    hinglish: "Sort: Risk score"
  },
  "add_customer": {
    en: "Add Customer",
    hinglish: "Naya Grahak Jodein"
  },
  "sync_ledger": {
    en: "Sync Ledgers",
    hinglish: "Tally / Vyapar Sync Karein"
  },
  "total_outstanding": {
    en: "Total Outstanding",
    hinglish: "Kul Baaki Udhaar"
  },
  "monthly_purchases": {
    en: "Monthly Purchases",
    hinglish: "Mahine Ki Khareedi"
  },
  "avg_payment_delay": {
    en: "Average Payment Delay",
    hinglish: "Paise dene mein average deri"
  },
  "reliability_score": {
    en: "Reliability Score",
    hinglish: "Bharosa (Reliability) Score"
  },
  "days_pending": {
    en: "days pending",
    hinglish: "din se baaki"
  },
  "last_purchase": {
    en: "Last purchase:",
    hinglish: "Aakhri khareedi:"
  },
  "add_supplier": {
    en: "Add Supplier",
    hinglish: "Naya Supplier Jodein"
  },

  // Customer Intelligence
  "cust_intel_title": {
    en: "Customer Intelligence Center",
    hinglish: "Grahak Intelligence Center"
  },
  "total_customers": {
    en: "Total Customers",
    hinglish: "Kul Grahak"
  },
  "vip_customers": {
    en: "VIP Customers",
    hinglish: "VIP Grahak (Khaas)"
  },
  "regular_customers": {
    en: "Regular Customers",
    hinglish: "Roz Aane Wale Grahak"
  },
  "new_customers": {
    en: "New Customers",
    hinglish: "Naye Grahak"
  },
  "avg_spend": {
    en: "Average Spend / Visit",
    hinglish: "Average Kharch / Chakkar"
  },
  "ai_cust_insights": {
    en: "AI Customer Insights",
    hinglish: "AI Grahak Insights"
  },
  "tier_dist": {
    en: "Customer Tier Distribution",
    hinglish: "Grahak Tiers Ka Bantwara"
  },
  "refresh": {
    en: "Refresh",
    hinglish: "Taaza Karein"
  },
  "by_spend": {
    en: "By Spending",
    hinglish: "Kharch Ke Hisab Se"
  },
  "by_freq": {
    en: "By Frequency",
    hinglish: "Chakkar (Visits) Ke Hisab Se"
  },
  "newest": {
    en: "Newest",
    hinglish: "Naye Wale Grahak"
  },
  "voice_hints_title": {
    en: "Ask Voice CFO About Customers",
    hinglish: "Grahak Ke Baare Mein Awaaz Se Poochhein"
  },
  "vip_desc": {
    en: "VIP — 10+ visits, ₹10k+",
    hinglish: "VIP — 10+ chakar, ₹10k+"
  },
  "regular_desc": {
    en: "Regular — 4+ visits",
    hinglish: "Regular — 4+ chakkar"
  },
  "new_desc": {
    en: "New — 1–3 visits",
    hinglish: "Naye — 1-3 chakkar"
  },

  // Expense Intelligence
  "exp_intel_title": {
    en: "Expense Intelligence Dashboard",
    hinglish: "Kharch Intelligence Dashboard"
  },
  "total_expenses": {
    en: "Total Expenses",
    hinglish: "Kul Kharch"
  },
  "monthly_budget": {
    en: "Monthly Budget Status",
    hinglish: "Mahine Ka Budget"
  },
  "add_expense": {
    en: "Add Expense",
    hinglish: "Kharch Likhein"
  },

  // Cashbook & Liquidity
  "cashbook_title": {
    en: "Cashbook & Liquidity Tracker",
    hinglish: "Galla Ledger & Rojmel"
  },
  "cash_in": {
    en: "Cash In (Galla Aaya)",
    hinglish: "Cash Aaya (Galla Aaya)"
  },
  "cash_out": {
    en: "Cash Out (Galla Gaya)",
    hinglish: "Cash Gaya (Galla Gaya)"
  },
  "net_balance": {
    en: "Net Cash Balance",
    hinglish: "Galle Ka Balance (Net)"
  },

  // Staff Management
  "staff_title": {
    en: "AI Staff & Access Management",
    hinglish: "Naukar (Staff) aur Permissions Center"
  },
  "total_staff": {
    en: "Total Staff",
    hinglish: "Kul Naukar"
  },
  "active_staff": {
    en: "Active Staff",
    hinglish: "Kaam Par Maujood"
  },
  "pending_approvals": {
    en: "Pending Approvals",
    hinglish: "Approve Hona Baaki"
  },

  // Reports
  "reports_title": {
    en: "AI Business Reports",
    hinglish: "Dhandha Reports (AI)"
  },

  // Live QR Terminal
  "terminal_title": {
    en: "Soundbox UPI QR Terminal",
    hinglish: "Soundbox UPI QR Terminal"
  },
  "scan_to_pay": {
    en: "Scan QR code with any app to pay",
    hinglish: "Pay karne ke liye QR scan karein"
  },
  "soundbox_voice": {
    en: "Soundbox Language Alert",
    hinglish: "Soundbox Awaaz Bhaasha"
  }
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("ai_munshi_lang");
    return (saved as Language) || "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("ai_munshi_lang", lang);
  };

  const t = (key: string): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[language] || entry["en"] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
