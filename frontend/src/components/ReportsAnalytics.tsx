import { useState, useMemo } from "react";
import { useLanguage } from "../context/LanguageContext";
import {
  Search,
  Activity,
  Coins,
  User,
  Shield,
  TrendingUp,
  Percent,
  Award,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  Download,
  ChevronRight,
  Mic,
  Info,
  ChevronLeft
} from "lucide-react";

// --- INTERFACES ---
interface UnifiedRecord {
  id: string;
  date: string;
  contact: string;
  type: "Sale" | "Repayment" | "Purchase" | "Expense";
  description: string;
  moneyIn: number;
  moneyOut: number;
  status: "Completed" | "Pending" | "Settled";
}

// --- CONSTANTS & DATA SEEDING ---
const REPORT_CATEGORIES = [
  { id: "transactions", title: "Transaction Reports", desc: "All customer sales & credit ledgers", icon: <Activity className="w-4 h-4" /> },
  { id: "cashbook", title: "Cashbook Reports", desc: "Cash drawer inflows and daily outflows", icon: <Coins className="w-4 h-4" /> },
  { id: "customer", title: "Customer Reports", desc: "Outstanding credit & collection rates", icon: <User className="w-4 h-4" /> },
  { id: "supplier", title: "Supplier Reports", desc: "Procurement bills & reliability metrics", icon: <Shield className="w-4 h-4" /> },
  { id: "expense", title: "Expense Reports", desc: "Operating overheads & category breakdown", icon: <TrendingUp className="w-4 h-4" /> },
  { id: "gst", title: "GST Reports", desc: "Tax turnover & registration thresholds", icon: <Percent className="w-4 h-4" /> },
  { id: "loan", title: "Loan Readiness Reports", desc: "Credit score diagnostics & pre-approved loans", icon: <Award className="w-4 h-4" /> },
  { id: "ai_insights", title: "AI Business Insights", desc: "Strategic CFO predictions & actions", icon: <Sparkles className="w-4 h-4" /> }
] as const;

const UNIFIED_DATABASE: UnifiedRecord[] = [
  // June 2026 MTD
  { id: "rec_1", date: "2026-06-05", contact: "Amit Sharma", type: "Sale", description: "Counter Kirana retail checkout", moneyIn: 1200, moneyOut: 0, status: "Completed" },
  { id: "rec_2", date: "2026-06-05", contact: "Sandeep Gupta", type: "Repayment", description: "Cleared partial credit dues", moneyIn: 650, moneyOut: 0, status: "Completed" },
  { id: "rec_3", date: "2026-06-05", contact: "Raju helper", type: "Expense", description: "Cash salary advance payout", moneyIn: 0, moneyOut: 1000, status: "Completed" },
  { id: "rec_4", date: "2026-06-04", contact: "Rice Supplier", type: "Purchase", description: "Bulk Basmati Rice batch (100kg)", moneyIn: 0, moneyOut: 15000, status: "Pending" },
  { id: "rec_5", date: "2026-06-04", contact: "Suresh Patel", type: "Sale", description: "Monthly account credit billing", moneyIn: 1800, moneyOut: 0, status: "Completed" },
  { id: "rec_6", date: "2026-06-03", contact: "Ravi", type: "Repayment", description: "Credit recovery via reminder link", moneyIn: 500, moneyOut: 0, status: "Completed" },
  { id: "rec_7", date: "2026-06-03", contact: "Electricity Board", type: "Expense", description: "Electricity Bill (May)", moneyIn: 0, moneyOut: 4800, status: "Completed" },
  { id: "rec_8", date: "2026-06-02", contact: "Atta Wholesaler", type: "Purchase", description: "Flour Shaktibhog (50 Bags)", moneyIn: 0, moneyOut: 18500, status: "Completed" },
  { id: "rec_9", date: "2026-06-01", contact: "Mohan Das", type: "Sale", description: "Monthly Kirana credit allocation", moneyIn: 1200, moneyOut: 0, status: "Completed" },
  { id: "rec_10", date: "2026-06-01", contact: "Store Owner", type: "Expense", description: "Personal Gullak withdrawal (Cash)", moneyIn: 0, moneyOut: 2000, status: "Completed" },
  // May 2026
  { id: "rec_11", date: "2026-05-28", contact: "Geeta Rao", type: "Sale", description: "Dairy and grocery basket", moneyIn: 950, moneyOut: 0, status: "Completed" },
  { id: "rec_12", date: "2026-05-26", contact: "Tel-Ghee Dist", type: "Purchase", description: "Refined Oil (10 Tins)", moneyIn: 0, moneyOut: 14000, status: "Completed" },
  { id: "rec_13", date: "2026-05-25", contact: "Marketing Agency", type: "Expense", description: "Flyer printing promo distribution", moneyIn: 0, moneyOut: 1500, status: "Completed" },
  { id: "rec_14", date: "2026-05-20", contact: "Broadband ISP", type: "Expense", description: "Broadband monthly charges", moneyIn: 0, moneyOut: 999, status: "Completed" },
  { id: "rec_15", date: "2026-05-15", contact: "Masale Vendor", type: "Purchase", description: "Spices assortment wholesale batch", moneyIn: 0, moneyOut: 6200, status: "Completed" },
  { id: "rec_16", date: "2026-05-10", contact: "Walk-in Customer #12", type: "Sale", description: "Miscellaneous cookies checkout", moneyIn: 420, moneyOut: 0, status: "Completed" }
];

export default function ReportsAnalytics() {
  const { t } = useLanguage();
  // --- STATE ---
  const [activeCategory, setActiveCategory] = useState<typeof REPORT_CATEGORIES[number]["id"]>("transactions");
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("all"); // all, today, week, month, lastMonth
  const [txType, setTxType] = useState("all"); // all, in, out
  const [amountRange, setAmountRange] = useState("all"); // all, under_2k, 2k_10k, over_10k

  // Voice command simulation input
  const [voiceInput, setVoiceInput] = useState("");
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  
  // Highlight helper for visual cue during voice query matching
  const [highlightCard, setHighlightCard] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Sorting State
  const [sortField, setSortField] = useState<keyof UnifiedRecord>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Global Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // --- FILTERED DATA COMPUTATION ---
  const filteredRecords = useMemo(() => {
    return UNIFIED_DATABASE.filter(r => {
      // 1. Report Category Filter
      if (activeCategory === "cashbook") {
        // Cashbook only shows Cash-based items (all mock items are cash-toggled except bulk purchases)
        if (r.type === "Purchase" && r.status === "Pending") return false;
      } else if (activeCategory === "customer") {
        // Customer reports only show Sales or Customer Repayments
        if (r.type !== "Sale" && r.type !== "Repayment") return false;
      } else if (activeCategory === "supplier") {
        // Supplier reports only show Purchases
        if (r.type !== "Purchase") return false;
      } else if (activeCategory === "expense") {
        // Expense reports only show operating expenses
        if (r.type !== "Expense") return false;
      }

      // 2. Search Filter
      const matchesSearch = r.contact.toLowerCase().includes(searchTerm.toLowerCase()) || r.description.toLowerCase().includes(searchTerm.toLowerCase());

      // 3. Date Filter
      let matchesDate = true;
      const today = new Date("2026-06-05");
      const rDate = new Date(r.date);
      if (dateRange === "today") {
        matchesDate = r.date === "2026-06-05";
      } else if (dateRange === "week") {
        const diffTime = Math.abs(today.getTime() - rDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        matchesDate = diffDays <= 7;
      } else if (dateRange === "month") {
        matchesDate = r.date.startsWith("2026-06");
      } else if (dateRange === "lastMonth") {
        matchesDate = r.date.startsWith("2026-05");
      }

      // 4. Tx Type Filter
      let matchesType = true;
      if (txType === "in") {
        matchesType = r.moneyIn > 0;
      } else if (txType === "out") {
        matchesType = r.moneyOut > 0;
      }

      // 5. Amount Filter
      let matchesAmt = true;
      const amt = r.moneyIn > 0 ? r.moneyIn : r.moneyOut;
      if (amountRange === "under_2k") {
        matchesAmt = amt < 2000;
      } else if (amountRange === "2k_10k") {
        matchesAmt = amt >= 2000 && amt <= 10000;
      } else if (amountRange === "over_10k") {
        matchesAmt = amt > 10000;
      }

      return matchesSearch && matchesDate && matchesType && matchesAmt;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortField === "date") {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === "moneyIn" || sortField === "moneyOut") {
        comparison = a[sortField] - b[sortField];
      } else {
        comparison = String(a[sortField]).localeCompare(String(b[sortField]));
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [activeCategory, searchTerm, dateRange, txType, amountRange, sortField, sortOrder]);

  // Paginated List
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);

  // --- KPI CARD SUMMARY COMPUTE ---
  const summaryKPIs = useMemo(() => {
    let salesTotal = 0;
    let expenseTotal = 0;
    let collections = 14800; // Customer outstanding debt
    let payments = 27000; // Wholesaler debt

    UNIFIED_DATABASE.forEach(r => {
      if (r.type === "Sale") salesTotal += r.moneyIn;
      if (r.type === "Expense") expenseTotal += r.moneyOut;
    });

    const netProfit = salesTotal - expenseTotal;

    return {
      salesTotal,
      expenseTotal,
      netProfit,
      collections,
      payments,
      loanScore: 720,
      gstStatus: 690000 // Annualized mock turnover
    };
  }, []);

  // --- DYNAMIC AI INSIGHTS ---
  const aiInsights = useMemo(() => {
    const list = [
      { text: "Revenue increased 22% this month.", type: "success" },
      { text: "Expense growth exceeds revenue growth rate this week.", type: "warning" },
      { text: "Supplier payments of ₹12,000 are overdue (Masale Vendor).", type: "critical" },
      { text: "GST registration threshold likely to be reached next month.", type: "warning" },
      { text: "Loan readiness score improved from 620 to 720.", type: "success" }
    ];

    if (activeCategory === "gst") {
      return [
        { text: "GST registration turnover limit (₹20 Lakh) is 35% completed.", type: "success" },
        { text: "Dairy sales represent 29% GST exempt revenue slots.", type: "info" },
        { text: "Recommend cataloging HSN tax codes for grocery lines.", type: "warning" }
      ];
    }
    if (activeCategory === "loan") {
      return [
        { text: "Expected credit score calculated: 720 (Excellent eligibility status).", type: "success" },
        { text: "Repayment consistency parameter rated at 94/100.", type: "success" },
        { text: "Pre-approved loan capital estimated at ₹50,000.", type: "info" }
      ];
    }
    if (activeCategory === "expense") {
      return [
        { text: "Rent and Salary overheads drive 74% of operating cashouts.", type: "warning" },
        { text: "Personal Gullak drawer withdrawals are up 15% May vs June.", type: "critical" },
        { text: "Recommended Action: Restrict minor payouts from cashier drawer.", type: "success" }
      ];
    }

    return list;
  }, [activeCategory]);

  // --- VOICE ANALYTICS COMMAND PARSER ---
  const handleVoiceQuery = (queryText: string) => {
    const cleanQuery = queryText.toLowerCase().trim();
    setVoiceInput(queryText);
    setVoiceFeedback(null);
    setHighlightCard(null);

    // May/Last Month queries
    if (cleanQuery.includes("last month revenue") || cleanQuery.includes("पिछला महीना रेवेन्यू") || cleanQuery.includes("revenue last month")) {
      setActiveCategory("transactions");
      setDateRange("lastMonth");
      setTxType("in");
      setVoiceFeedback("Filtering Transactions report to last month (May 2026) inflows...");
      setHighlightCard("revenue");
      showToast("success", "Voice query matched: Last Month Inflows");
    }
    // Debt/Owes queries
    else if (cleanQuery.includes("owes me") || cleanQuery.includes("money owes") || cleanQuery.includes("उधार किसका है") || cleanQuery.includes("pending collection")) {
      setActiveCategory("customer");
      setDateRange("all");
      setSortField("moneyIn");
      setSortOrder("desc");
      setVoiceFeedback("Filtering Customer Reports, sorting outstanding collections by descending amount...");
      setHighlightCard("collections");
      showToast("success", "Voice query matched: Customer Debts");
    }
    // Cashbook outflow queries
    else if (cleanQuery.includes("cash went out") || cleanQuery.includes("cash expenses") || cleanQuery.includes("कैश खर्च") || cleanQuery.includes("cash outflow")) {
      setActiveCategory("cashbook");
      setDateRange("week");
      setTxType("out");
      setVoiceFeedback("Filtering Cashbook Reports to past 7 days cash payouts...");
      setHighlightCard("expenses");
      showToast("success", "Voice query matched: Weekly Cash Payouts");
    }
    // GST queries
    else if (cleanQuery.includes("gst status") || cleanQuery.includes("जीएसटी")) {
      setActiveCategory("gst");
      setVoiceFeedback("Opening GST compliance report. Annual turnover progress plotted...");
      setHighlightCard("gst");
      showToast("success", "Voice query matched: GST Status");
    }
    // Loan queries
    else if (cleanQuery.includes("loan") || cleanQuery.includes("credit score") || cleanQuery.includes("लोन")) {
      setActiveCategory("loan");
      setVoiceFeedback("Opening Loan readiness diagnositcs report. Score cards highlighted...");
      setHighlightCard("loan");
      showToast("success", "Voice query matched: Loan Eligibility");
    }
    // Unmatched
    else {
      setVoiceFeedback("Maaf kijiye, standard commands mein se select karein (e.g. 'Show last month revenue')");
    }
  };

  // Reset Highlights when selecting category manually
  const selectCategory = (catId: typeof REPORT_CATEGORIES[number]["id"]) => {
    setActiveCategory(catId);
    setHighlightCard(null);
    setVoiceFeedback(null);
    setCurrentPage(1);
  };

  // CSV Exporter Action (Actual formatted file downloads)
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      showToast("error", "No data available to export.");
      return;
    }
    const headers = "Date,Contact/Payee,Type,Description,Money In,Money Out,Status\n";
    const rows = filteredRecords.map(r => 
      `"${r.date}","${r.contact}","${r.type}","${r.description || ""}",${r.moneyIn || 0},${r.moneyOut || 0},"${r.status}"`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `AI_Munshi_${activeCategory}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("success", "CSV report file downloaded successfully!");
  };

  return (
    <div className="flex-grow flex flex-col min-h-0 bg-[#F8F9FB] h-full text-[#111827] relative">
      
      {/* GLOBAL TOAST */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[999] flex items-center gap-3 px-5 py-4 rounded-2xl border shadow-2xl text-sm font-semibold transition-all duration-300 ${
          toast.type === "success" ? "bg-[#E8F5E9] border-[#A5D6A7] text-[#2E7D32]" : "bg-[#FFEBEE] border-[#FFCDD2] text-[#C62828]"
        }`}>
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-xs opacity-60 hover:opacity-100 font-bold">✕</button>
        </div>
      )}

      {/* HEADER: TITLE & VOICE QUERY BOX */}
      <div className="p-6 pb-2 shrink-0 bg-white border-b border-[#E5E7EB]">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-black text-[#002970] flex items-center gap-2">
              {t("reports_title")}
              <span className="bg-[#D32F2F]/10 text-[#D32F2F] text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">AI Intelligence</span>
            </h2>
            <p className="text-[11px] text-[#6B7280] font-semibold mt-0.5">Enterprise ledger audits, tax logs, GST thresholds, and cash balances diagnostics.</p>
          </div>

          {/* VOICE QUERY SIMULATOR */}
          <div className="w-[480px] bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl p-2.5 relative shadow-sm">
            <div className="flex items-center gap-2">
              <Mic className="w-4.5 h-4.5 text-[#D32F2F] shrink-0 animate-pulse" />
              <input
                type="text"
                placeholder="Ask AI Munshi: 'Show last month revenue'..."
                value={voiceInput}
                onChange={(e) => setVoiceInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVoiceQuery(voiceInput)}
                className="w-transparent flex-grow text-xs font-semibold outline-none bg-transparent text-[#002970]"
              />
              <button
                onClick={() => handleVoiceQuery(voiceInput)}
                className="bg-[#D32F2F] text-white font-extrabold text-[10px] px-3.5 py-1.5 rounded-xl cursor-pointer hover:bg-[#B71C1C]"
              >
                Analyze
              </button>
            </div>
            {/* Quick Presets Suggestions */}
            <div className="flex gap-2 mt-2 text-[8px] font-extrabold text-[#6B7280]">
              <span className="shrink-0 mt-0.5">Presets:</span>
              <button onClick={() => handleVoiceQuery("Show last month revenue")} className="hover:text-[#D32F2F] underline cursor-pointer">"Show May Inflows"</button>
              <span>|</span>
              <button onClick={() => handleVoiceQuery("Who owes me most money")} className="hover:text-[#D32F2F] underline cursor-pointer">"उधार किसका है"</button>
              <span>|</span>
              <button onClick={() => handleVoiceQuery("How much cash went out this week")} className="hover:text-[#D32F2F] underline cursor-pointer">"Cash Outflow"</button>
            </div>
            
            {/* Voice Feedback overlay */}
            {voiceFeedback && (
              <div className="mt-2 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{voiceFeedback}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. TWO-COLUMN MAIN REPORT LAYOUT */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        
        {/* LEFT COLUMN: REPORT CATEGORIES ( highlighted with AI Munshi red #D32F2F ) */}
        <div className="w-[300px] h-full bg-white border-r border-[#E5E7EB] shrink-0 p-4 space-y-2 overflow-y-auto">
          <span className="px-3 text-[9px] font-extrabold text-[#6B7280] uppercase tracking-widest block mb-4">Report Categories</span>
          
          {REPORT_CATEGORIES.map(cat => {
            const isSelected = cat.id === activeCategory;
            return (
              <button
                key={cat.id}
                onClick={() => selectCategory(cat.id)}
                className={`w-full flex items-start gap-3 p-3 rounded-2xl text-left cursor-pointer transition-all border ${
                  isSelected
                    ? "bg-rose-50 border-rose-100 text-[#D32F2F] shadow-sm"
                    : "hover:bg-slate-50 border-transparent text-[#6B7280]"
                }`}
              >
                <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                  isSelected ? "bg-[#D32F2F] text-white" : "bg-[#F8F9FB] text-slate-500"
                }`}>
                  {cat.icon}
                </div>
                <div className="min-w-0">
                  <span className={`text-[11px] font-black block leading-none ${
                    isSelected ? "text-[#D32F2F]" : "text-[#002970]"
                  }`}>{cat.title}</span>
                  <span className="text-[9px] font-semibold text-[#6B7280] mt-1 block leading-snug">{cat.desc}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* RIGHT COLUMN: DETAIL WORKSPACE */}
        <div className="flex-1 h-full overflow-y-auto p-6 space-y-6">
          
          {/* SECTION A: SUMMARY CARD GRID WITH Sparklines */}
          <div className="grid grid-cols-4 gap-4">
            
            {/* Card 1: Total Revenue */}
            <div className={`bg-white border rounded-2xl p-4 shadow-sm relative overflow-hidden transition-all duration-300 ${
              highlightCard === "revenue" ? "border-rose-400 ring-2 ring-rose-500/20 scale-[1.02] shadow-md" : "border-[#E5E7EB]"
            }`}>
              <div className="absolute top-0 left-0 w-1 h-full bg-[#00C853]" />
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[8.5px] font-extrabold uppercase text-[#6B7280] tracking-wider">Total Sales (June)</span>
                  <h3 className="text-lg font-black text-[#002970] mt-1">₹{summaryKPIs.salesTotal.toLocaleString("en-IN")}</h3>
                </div>
                <span className="text-[9px] font-black text-[#00C853] bg-emerald-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0">
                  +18% <ArrowDownLeft className="w-2.5 h-2.5" />
                </span>
              </div>
              {/* Mini Sparkline SVG */}
              <div className="mt-3.5 h-6 w-full">
                <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
                  <path d="M0,18 L15,14 L30,16 L45,10 L60,12 L75,6 L90,8 L100,2" fill="none" stroke="#00C853" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Card 2: Total Expenses */}
            <div className={`bg-white border rounded-2xl p-4 shadow-sm relative overflow-hidden transition-all duration-300 ${
              highlightCard === "expenses" ? "border-rose-400 ring-2 ring-rose-500/20 scale-[1.02] shadow-md" : "border-[#E5E7EB]"
            }`}>
              <div className="absolute top-0 left-0 w-1 h-full bg-[#D32F2F]" />
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[8.5px] font-extrabold uppercase text-[#6B7280] tracking-wider">Total Expenses</span>
                  <h3 className="text-lg font-black text-[#002970] mt-1">₹{summaryKPIs.expenseTotal.toLocaleString("en-IN")}</h3>
                </div>
                <span className="text-[9px] font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0">
                  +24% <ArrowUpRight className="w-2.5 h-2.5" />
                </span>
              </div>
              <div className="mt-3.5 h-6 w-full">
                <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
                  <path d="M0,12 L15,10 L30,15 L45,8 L60,14 L75,5 L90,10 L100,4" fill="none" stroke="#D32F2F" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Card 3: Pending Collections */}
            <div className={`bg-white border rounded-2xl p-4 shadow-sm relative overflow-hidden transition-all duration-300 ${
              highlightCard === "collections" ? "border-rose-400 ring-2 ring-rose-500/20 scale-[1.02] shadow-md" : "border-[#E5E7EB]"
            }`}>
              <div className="absolute top-0 left-0 w-1 h-full bg-[#FF9100]" />
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[8.5px] font-extrabold uppercase text-[#6B7280] tracking-wider">Pending Collects</span>
                  <h3 className="text-lg font-black text-[#002970] mt-1">₹{summaryKPIs.collections.toLocaleString("en-IN")}</h3>
                </div>
                <span className="text-[9px] font-black text-[#6B7280] bg-slate-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0">
                  -5% <ArrowDownLeft className="w-2.5 h-2.5 text-emerald-500" />
                </span>
              </div>
              <div className="mt-3.5 h-6 w-full">
                <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
                  <path d="M0,5 L20,10 L40,8 L60,15 L80,12 L100,18" fill="none" stroke="#FF9100" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Card 4: Loan / GST Status Dual */}
            <div className={`bg-white border rounded-2xl p-4 shadow-sm relative overflow-hidden transition-all duration-300 ${
              (highlightCard === "loan" || highlightCard === "gst") ? "border-rose-400 ring-2 ring-rose-500/20 scale-[1.02] shadow-md" : "border-[#E5E7EB]"
            }`}>
              <div className="absolute top-0 left-0 w-1 h-full bg-[#7C4DFF]" />
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[8.5px] font-extrabold uppercase text-[#6B7280] tracking-wider">Loan readiness score</span>
                  <h3 className="text-lg font-black text-[#002970] mt-1">{summaryKPIs.loanScore} <span className="text-[10px] text-[#6B7280] font-bold">/ 900</span></h3>
                </div>
                <span className="text-[9px] font-black text-[#7C4DFF] bg-indigo-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0">
                  Good
                </span>
              </div>
              <div className="mt-3.5 h-6 w-full">
                <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
                  <path d="M0,18 L25,15 L50,16 L75,10 L100,5" fill="none" stroke="#7C4DFF" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

          </div>

          {/* SECTION B: DETAILED REPORT CHARTS AREA (7 Viz Types depending on view) */}
          <div className="grid grid-cols-2 gap-6">
            
            {/* Visualizations Panel Left */}
            <div className="bg-white border border-[#E5E7EB] rounded-3xl p-5 shadow-sm space-y-4">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#6B7280] block">Fintech Performance Visualization</span>
              
              {activeCategory === "transactions" && (
                <div className="space-y-2">
                  <span className="text-xs font-black text-[#002970] block">Monthly Revenue Growth Spline</span>
                  <div className="h-44 w-full flex items-end">
                    <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                      <path d="M0,40 L0,32 L20,35 L40,24 L60,28 L80,14 L100,10 L100,40 Z" fill="rgba(0, 200, 83, 0.12)" />
                      <path d="M0,32 L20,35 L40,24 L60,28 L80,14 L100,10" fill="none" stroke="#00C853" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="flex justify-between text-[8px] font-bold text-[#6B7280] pt-1">
                    <span>Dec</span><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span>
                  </div>
                </div>
              )}

              {activeCategory === "cashbook" && (
                <div className="space-y-2">
                  <span className="text-xs font-black text-[#002970] block">Daily Cash Balance spline (Past week)</span>
                  <div className="h-44 w-full flex items-end">
                    <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                      <path d="M0,40 L0,28 L16,30 L33,26 L50,32 L66,20 L83,24 L100,12 L100,40 Z" fill="rgba(0, 186, 242, 0.12)" />
                      <path d="M0,28 L16,30 L33,26 L50,32 L66,20 L83,24 L100,12" fill="none" stroke="#00BAF2" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="flex justify-between text-[8px] font-bold text-[#6B7280] pt-1">
                    <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                  </div>
                </div>
              )}

              {activeCategory === "customer" && (
                <div className="space-y-2">
                  <span className="text-xs font-black text-[#002970] block">Active Debt Customer Acquisition Growth</span>
                  <div className="h-44 w-full flex items-end">
                    <svg className="w-full h-full animate-pulse" viewBox="0 0 100 40" preserveAspectRatio="none">
                      <path d="M0,35 L20,35 L20,28 L40,28 L40,20 L60,20 L60,15 L80,15 L80,10 L100,10" fill="none" stroke="#FF9100" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="flex justify-between text-[8px] font-bold text-[#6B7280] pt-1">
                    <span>Week 1</span><span>Week 2</span><span>Week 3</span><span>Week 4</span>
                  </div>
                </div>
              )}

              {activeCategory === "expense" && (
                <div className="space-y-2">
                  <span className="text-xs font-black text-[#002970] block">Overheads cost category distribution</span>
                  <div className="h-44 flex items-center justify-around gap-4">
                    <div className="relative w-28 h-28">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 42 42">
                        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#E5E7EB" strokeWidth="4.5" />
                        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#D32F2F" strokeWidth="4.5" strokeDasharray="55 45" strokeDashoffset="0" />
                        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#00BAF2" strokeWidth="4.5" strokeDasharray="25 75" strokeDashoffset="-55" />
                        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#FF9100" strokeWidth="4.5" strokeDasharray="20 80" strokeDashoffset="-80" />
                      </svg>
                    </div>
                    <div className="space-y-1 text-[8.5px] font-bold text-[#6B7280]">
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#D32F2F]" /><span>Rent & Utilities (55%)</span></div>
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#00BAF2]" /><span>Staff Salary (25%)</span></div>
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#FF9100]" /><span>Logistics (20%)</span></div>
                    </div>
                  </div>
                </div>
              )}

              {activeCategory === "gst" && (
                <div className="space-y-2">
                  <span className="text-xs font-black text-[#002970] block">GST Registration Threshold Limit Turnover Progress</span>
                  <div className="h-44 flex flex-col justify-center items-center relative">
                    {/* Radial progress circle */}
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="14" fill="transparent" stroke="#E5E7EB" strokeWidth="3" />
                        <circle cx="18" cy="18" r="14" fill="transparent" stroke="#D32F2F" strokeWidth="3" strokeDasharray="35 65" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-sm font-black text-[#002970]">₹6.9L</span>
                        <span className="text-[7px] text-[#6B7280] font-extrabold uppercase">Out of ₹20L</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeCategory === "loan" && (
                <div className="space-y-2">
                  <span className="text-xs font-black text-[#002970] block">Loan readiness diagnostics dial</span>
                  <div className="h-44 flex items-center justify-center">
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="14" fill="transparent" stroke="#E5E7EB" strokeWidth="3.5" />
                        <circle cx="18" cy="18" r="14" fill="transparent" stroke="#7C4DFF" strokeWidth="3.5" strokeDasharray="80 20" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-lg font-black text-[#002970]">720</span>
                        <span className="text-[7.5px] text-indigo-500 font-extrabold uppercase">Credit Score</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeCategory === "supplier" && (
                <div className="space-y-2">
                  <span className="text-xs font-black text-[#002970] block">Distributors Outstanding balances</span>
                  <div className="h-44 flex flex-col justify-around py-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] font-bold"><span>Rice Supplier</span><span>₹15,000 (Pending)</span></div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-[#D32F2F] rounded-full" style={{ width: "65%" }} /></div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] font-bold"><span>Atta Wholesaler</span><span>₹18,500 (Settled)</span></div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-[#00C853] rounded-full" style={{ width: "85%" }} /></div>
                    </div>
                  </div>
                </div>
              )}

              {activeCategory === "ai_insights" && (
                <div className="space-y-2">
                  <span className="text-xs font-black text-[#002970] block">Working Capital Cash Burn vs Sales Ratio</span>
                  <div className="h-44 w-full flex items-end justify-center gap-6 pb-2">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-6 bg-[#00C853] rounded-t-sm" style={{ height: "78%" }} />
                      <span className="text-[8px] font-bold text-[#6B7280]">Total Revenue</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-6 bg-[#D32F2F] rounded-t-sm" style={{ height: "32%" }} />
                      <span className="text-[8px] font-bold text-[#6B7280]">Overheads</span>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* AI Floating Insights right column */}
            <div className="bg-white border border-[#E5E7EB] rounded-3xl p-5 shadow-sm space-y-3.5 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#D32F2F] flex items-center gap-1.5 mb-3">
                  <Sparkles className="w-3.5 h-3.5" /> AI CFO Audit Report
                </span>
                
                <div className="space-y-2.5">
                  {aiInsights.map((insight, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl text-[10.5px] font-semibold text-[#002970] flex items-start gap-2.5 leading-snug"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#D32F2F] shrink-0 mt-0.5" />
                      <span>{insight.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-2.5 text-[10px] font-bold text-rose-800">
                <Info className="w-4.5 h-4.5 shrink-0" />
                <span>Financial diagnostics recalculated in real-time according to transaction logs.</span>
              </div>
            </div>

          </div>

          {/* SECTION C: FILTER BAR, STICKY TABLE & EXPORTS */}
          <div className="bg-white border border-[#E5E7EB] rounded-3xl overflow-hidden shadow-sm flex flex-col">
            {/* Filter controls toolbar */}
            <div className="p-4 border-b border-[#E5E7EB] bg-white space-y-4 shrink-0 flex justify-between items-center flex-wrap gap-4">
              <div className="flex gap-2 flex-wrap items-center">
                {/* Search */}
                <div className="w-48 bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl px-3 flex items-center gap-2 h-9 focus-within:border-[#00BAF2] transition-colors">
                  <Search className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
                  <input
                    type="text"
                    placeholder="Search ledger..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-transparent text-[10px] font-semibold outline-none text-[#111827]"
                  />
                </div>

                {/* Preset Date selector */}
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl px-2.5 py-1.5 text-[9px] font-extrabold text-[#002970] cursor-pointer focus:border-[#00BAF2]"
                >
                  <option value="all">Date: All</option>
                  <option value="today">Today (June 5)</option>
                  <option value="week">Past 7 Days</option>
                  <option value="month">June MTD</option>
                  <option value="lastMonth">May (Last Month)</option>
                </select>

                {/* Flow type */}
                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value)}
                  className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl px-2.5 py-1.5 text-[9px] font-extrabold text-[#002970] cursor-pointer focus:border-[#00BAF2]"
                >
                  <option value="all">Flow: All</option>
                  <option value="in">Money In (+)</option>
                  <option value="out">Money Out (-)</option>
                </select>

                {/* Amount ranges */}
                <select
                  value={amountRange}
                  onChange={(e) => setAmountRange(e.target.value)}
                  className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl px-2.5 py-1.5 text-[9px] font-extrabold text-[#002970] cursor-pointer focus:border-[#00BAF2]"
                >
                  <option value="all">Amount: All</option>
                  <option value="under_2k">Under ₹2,000</option>
                  <option value="2k_10k">₹2,000 - ₹10,000</option>
                  <option value="over_10k">Above ₹10,000</option>
                </select>
              </div>

              {/* Exports Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleExportCSV}
                  className="border-2 border-[#E5E7EB] hover:bg-slate-50 text-[#002970] font-extrabold text-[10px] py-2 px-3 rounded-xl flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
              </div>
            </div>

            {/* STICKY HEADER enterprise table */}
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto relative">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#E5E7EB] sticky top-0 z-10 text-[9px] font-black text-[#6B7280] uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Contact / Payee</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Money In (+)</th>
                    <th className="py-3 px-4 text-right">Money Out (-)</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] text-[10.5px] font-semibold text-[#002970]">
                  {paginatedRecords.length > 0 ? (
                    paginatedRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          {new Date(rec.date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })}
                        </td>
                        <td className="py-3 px-4 font-extrabold">{rec.contact}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wide border ${
                            rec.type === "Sale" ? "bg-emerald-50 border-emerald-100 text-[#00C853]" :
                            rec.type === "Repayment" ? "bg-sky-50 border-sky-100 text-[#00BAF2]" :
                            rec.type === "Purchase" ? "bg-amber-50 border-amber-100 text-amber-600" :
                            "bg-rose-50 border-rose-100 text-[#D32F2F]"
                          }`}>{rec.type}</span>
                        </td>
                        <td className="py-3 px-4 text-[#6B7280] truncate max-w-[180px]">{rec.description}</td>
                        <td className="py-3 px-4 text-right font-black text-[#00C853]">
                          {rec.moneyIn > 0 ? `+₹${rec.moneyIn.toLocaleString("en-IN")}` : "--"}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-[#D32F2F]">
                          {rec.moneyOut > 0 ? `-₹${rec.moneyOut.toLocaleString("en-IN")}` : "--"}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-extrabold ${
                            rec.status === "Completed" ? "bg-emerald-100 text-emerald-800" :
                            rec.status === "Settled" ? "bg-slate-100 text-slate-800" :
                            "bg-amber-100 text-amber-800 animate-pulse"
                          }`}>{rec.status}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs text-[#6B7280] bg-white">
                        No records match the active filter checklist.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-[#E5E7EB] bg-white flex justify-between items-center text-[10px] font-extrabold text-[#6B7280]">
                <span>Showing page {currentPage} of {totalPages}</span>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 flex items-center cursor-pointer hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 flex items-center cursor-pointer hover:bg-slate-50 disabled:opacity-40"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>

    </div>
  );
}
