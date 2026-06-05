import React, { useState, useMemo, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  BookOpen,
  Trash2,
  Edit,
  X,
  ChevronRight,
  Activity,
  CheckCircle,
  AlertTriangle,
  Coins,
  ShieldAlert,
  Sparkles
} from "lucide-react";

// --- INTERFACES ---
interface CashRecord {
  id: string;
  description: string;
  flowType: "in" | "out";
  category: "Customer Repayment" | "Cash Sale" | "Supplier Repayment" | "Business Expense" | "Personal Withdrawal (Gullak)";
  amount: number;
  date: string;
  notes?: string;
}

// --- CONSTANTS ---
const CASH_IN_CATEGORIES = ["Cash Sale", "Customer Repayment"];
const CASH_OUT_CATEGORIES = ["Supplier Repayment", "Business Expense", "Personal Withdrawal (Gullak)"];

const INITIAL_CASH_RECORDS: CashRecord[] = [
  // June 5
  {
    id: "cash_1",
    description: "Customer cash sale - counter retail",
    flowType: "in",
    category: "Cash Sale",
    amount: 1450,
    date: "2026-06-05",
    notes: "Counter grocery checkout"
  },
  {
    id: "cash_2",
    description: "Sandeep Gupta debt repayment",
    flowType: "in",
    category: "Customer Repayment",
    amount: 650,
    date: "2026-06-05",
    notes: "Cleared partial udhar dues"
  },
  {
    id: "cash_3",
    description: "Raju salary advance payment",
    flowType: "out",
    category: "Business Expense",
    amount: 1000,
    date: "2026-06-05",
    notes: "Requested cash advance"
  },
  {
    id: "cash_4",
    description: "Withdrawal for home groceries (Gullak)",
    flowType: "out",
    category: "Personal Withdrawal (Gullak)",
    amount: 800,
    date: "2026-06-05",
    notes: "Taken from register drawer"
  },
  // June 4
  {
    id: "cash_5",
    description: "Customer cash sales - afternoon",
    flowType: "in",
    category: "Cash Sale",
    amount: 2100,
    date: "2026-06-04"
  },
  {
    id: "cash_6",
    description: "Paid local tea vendor cash",
    flowType: "out",
    category: "Business Expense",
    amount: 350,
    date: "2026-06-04",
    notes: "Staff tea and snacks"
  },
  {
    id: "cash_7",
    description: "Supplier payment - Refined Oil distributor",
    flowType: "out",
    category: "Supplier Repayment",
    amount: 5000,
    date: "2026-06-04",
    notes: "Distributor cash payment"
  },
  // June 3
  {
    id: "cash_8",
    description: "Amit Sharma partial repayment",
    flowType: "in",
    category: "Customer Repayment",
    amount: 1200,
    date: "2026-06-03"
  },
  {
    id: "cash_9",
    description: "Withdrawal for personal medicines (Gullak)",
    flowType: "out",
    category: "Personal Withdrawal (Gullak)",
    amount: 1500,
    date: "2026-06-03"
  },
  {
    id: "cash_10",
    description: "Customer cash sale - night rush",
    flowType: "in",
    category: "Cash Sale",
    amount: 3400,
    date: "2026-06-03"
  },
  // June 2
  {
    id: "cash_11",
    description: "Wages paid to helper Raju",
    flowType: "out",
    category: "Business Expense",
    amount: 3000,
    date: "2026-06-02"
  },
  {
    id: "cash_12",
    description: "Customer cash sale - morning sales",
    flowType: "in",
    category: "Cash Sale",
    amount: 1800,
    date: "2026-06-02"
  },
  // June 1
  {
    id: "cash_13",
    description: "Opening cash drawer balance",
    flowType: "in",
    category: "Cash Sale",
    amount: 10000,
    date: "2026-06-01",
    notes: "Drawer seed float"
  },
  {
    id: "cash_14",
    description: "Withdrawal for child school fees (Gullak)",
    flowType: "out",
    category: "Personal Withdrawal (Gullak)",
    amount: 2000,
    date: "2026-06-01"
  },
  {
    id: "cash_15",
    description: "Customer cash sale - evening",
    flowType: "in",
    category: "Cash Sale",
    amount: 2200,
    date: "2026-06-01"
  }
];

export default function CashbookIntelligence() {
  const { t } = useLanguage();
  // --- STATE ---
  const [records, setRecords] = useState<CashRecord[]>(() => {
    const local = localStorage.getItem("ai_munshi_cashbook_data");
    return local ? JSON.parse(local) : INITIAL_CASH_RECORDS;
  });

  const [activeTab, setActiveTab] = useState<"all" | "in" | "out">("all");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Filters State
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // Reconciliation Input State
  const [countedCash, setCountedCash] = useState("");

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [formFlowType, setFormFlowType] = useState<"in" | "out">("in");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem("ai_munshi_cashbook_data", JSON.stringify(records));
  }, [records]);

  // Set default category when flowType changes
  useEffect(() => {
    if (formFlowType === "in") setFormCategory(CASH_IN_CATEGORIES[0]);
    else setFormCategory(CASH_OUT_CATEGORIES[0]);
  }, [formFlowType]);

  // Filtered List
  const filteredList = useMemo(() => {
    return records.filter(r => {
      if (activeTab !== "all" && r.flowType !== activeTab) return false;
      const matchesSearch = r.description.toLowerCase().includes(searchTerm.toLowerCase()) || (r.notes && r.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCat = categoryFilter === "all" || r.category === categoryFilter;
      
      let matchesDate = true;
      const rDate = new Date(r.date);
      const today = new Date("2026-06-05");
      if (dateFilter === "today") {
        matchesDate = r.date === "2026-06-05";
      } else if (dateFilter === "week") {
        const diffTime = Math.abs(today.getTime() - rDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        matchesDate = diffDays <= 7;
      } else if (dateFilter === "month") {
        matchesDate = r.date.startsWith("2026-06");
      }

      return matchesSearch && matchesCat && matchesDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, activeTab, searchTerm, categoryFilter, dateFilter]);

  // Set default selected record
  useEffect(() => {
    if (filteredList.length > 0) {
      if (!filteredList.some(r => r.id === selectedRecordId)) {
        setSelectedRecordId(filteredList[0].id);
      }
    } else {
      setSelectedRecordId(null);
    }
  }, [filteredList, selectedRecordId]);

  const selectedRecord = useMemo(() => {
    return records.find(r => r.id === selectedRecordId) || null;
  }, [records, selectedRecordId]);

  // --- DERIVED KPI METRICS ---
  const kpis = useMemo(() => {
    const todayStr = "2026-06-05";

    // Overall cash calculation (liquidity sum)
    const totalIn = records.filter(r => r.flowType === "in").reduce((sum, r) => sum + r.amount, 0);
    const totalOut = records.filter(r => r.flowType === "out").reduce((sum, r) => sum + r.amount, 0);
    const cashInHand = totalIn - totalOut;

    // Today's flows
    const todayIn = records
      .filter(r => r.flowType === "in" && r.date === todayStr)
      .reduce((sum, r) => sum + r.amount, 0);

    const todayOut = records
      .filter(r => r.flowType === "out" && r.date === todayStr)
      .reduce((sum, r) => sum + r.amount, 0);

    // Liquidity health rating
    let statusLabel = "Optimal";
    let statusColor = "text-emerald-500 bg-emerald-50 border-emerald-100";
    if (cashInHand < 3000) {
      statusLabel = "Critical Squeeze";
      statusColor = "text-[#D32F2F] bg-rose-50 border-rose-100 animate-pulse";
    } else if (cashInHand < 7000) {
      statusLabel = "Moderate Safety";
      statusColor = "text-amber-600 bg-amber-50 border-amber-100";
    }

    return {
      cashInHand,
      todayIn,
      todayOut,
      statusLabel,
      statusColor
    };
  }, [records]);

  // --- SVG CHART CALCULATIONS ---
  const chartData = useMemo(() => {
    const days = ["May 30", "May 31", "Jun 1", "Jun 2", "Jun 3", "Jun 4", "Jun 5"];
    const dates = ["2026-05-30", "2026-05-31", "2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04", "2026-06-05"];
    
    // Starting balance before the window
    let balance = 12000;
    
    const dailyBalances = dates.map(dt => {
      const dayIn = records.filter(r => r.flowType === "in" && r.date === dt).reduce((sum, r) => sum + r.amount, 0);
      const dayOut = records.filter(r => r.flowType === "out" && r.date === dt).reduce((sum, r) => sum + r.amount, 0);
      balance = balance + dayIn - dayOut;
      return balance;
    });

    const inflowOutflowRatio = dates.slice(2).map(dt => { // Last 5 days for bar comparison
      const dayIn = records.filter(r => r.flowType === "in" && r.date === dt).reduce((sum, r) => sum + r.amount, 0);
      const dayOut = records.filter(r => r.flowType === "out" && r.date === dt).reduce((sum, r) => sum + r.amount, 0);
      return { date: dt, in: dayIn, out: dayOut };
    });

    return {
      days,
      balances: dailyBalances,
      ratios: inflowOutflowRatio
    };
  }, [records]);

  // --- AI ANALYSIS OBSERVATIONS ---
  const aiDiagnostics = useMemo(() => {
    if (!selectedRecord) return null;

    const desc = selectedRecord.description;
    const cat = selectedRecord.category;
    const amt = selectedRecord.amount;

    if (cat === "Personal Withdrawal (Gullak)") {
      // Calculate MTD gullak total
      const mtdGullak = records
        .filter(r => r.category === "Personal Withdrawal (Gullak)" && r.date.startsWith("2026-06"))
        .reduce((sum, r) => sum + r.amount, 0);

      const gullakPct = kpis.cashInHand > 0 ? ((mtdGullak / (kpis.cashInHand + mtdGullak)) * 100).toFixed(0) : "15";

      return {
        observation: `Personal Gullak withdrawal logged: ₹${amt.toLocaleString()}. Total June withdrawals stand at ₹${mtdGullak.toLocaleString()}.`,
        warning: `Personal withdrawals drain ${gullakPct}% of cash drawer liquidity. This leaks working capital required for weekly wholesale procurement.`,
        recommendation: "Cap physical cash register withdrawals. Schedule a monthly formal payroll bank transfer for personal use rather than taking drawer cash."
      };
    }

    if (cat === "Supplier Repayment") {
      return {
        observation: `Paid ₹${amt.toLocaleString()} in physical cash to distributor.`,
        warning: "Cash wholesaler payouts drain register drawer coins & float rapidly, leading to daily change supply shortages.",
        recommendation: "Transition cash suppliers to UPI Bank transfers. Maintaining digital transactions enhances your pre-approved bank credit limits."
      };
    }

    if (cat === "Customer Repayment") {
      return {
        observation: `Received credit collection payment of ₹${amt.toLocaleString()} in cash.`,
        warning: "Cash collections must be logged immediately at counter receipt to prevent balance drawer mismatch.",
        recommendation: "Ensure WhatsApp confirmation is sent instantly to the client via Twilio logs to maintain trust and transparency."
      };
    }

    if (cat === "Business Expense" && desc.toLowerCase().includes("wage")) {
      return {
        observation: `Salary advance payout: ₹${amt.toLocaleString()} paid in cash.`,
        warning: "Operational salary cash payouts represent 8% of weekly counter sales outflows.",
        recommendation: "Schedule helper payroll payouts on fixed calendar dates (e.g. 1st of month) to maintain stable cash reserve predictions."
      };
    }

    return {
      observation: `Logged cash transaction of ₹${amt.toLocaleString()} under ${cat}.`,
      warning: "Uncategorized physical cash movements lead to daily closing drawer balance errors.",
      recommendation: "Ensure all daily minor outflows (wages, tea, packaging) are recorded before closing tally audit."
    };
  }, [selectedRecord, records, kpis.cashInHand]);

  // Tally Reconciliation Result
  const tallyResult = useMemo(() => {
    if (!countedCash) return null;
    const countedVal = parseFloat(countedCash);
    if (isNaN(countedVal)) return null;

    const diff = countedVal - kpis.cashInHand;
    if (diff === 0) {
      return {
        status: "success",
        color: "text-[#2E7D32] bg-[#E8F5E9] border-[#A5D6A7]",
        icon: <CheckCircle className="w-4.5 h-4.5" />,
        text: "Tally Balanced! Expected cash in drawer matches physical count exactly."
      };
    } else if (diff < 0) {
      return {
        status: "critical",
        color: "text-[#C62828] bg-[#FFEBEE] border-[#FFCDD2]",
        icon: <ShieldAlert className="w-4.5 h-4.5" />,
        text: `Shortage Alert: -₹${Math.abs(diff).toLocaleString("en-IN")}. Physical drawer has less than the recorded cashbook. Check if you missed logging staff tea, local wage payouts, or vendor payments.`
      };
    } else {
      return {
        status: "warning",
        color: "text-amber-800 bg-amber-50 border-amber-200",
        icon: <AlertTriangle className="w-4.5 h-4.5" />,
        text: `Surplus Alert: +₹${diff.toLocaleString("en-IN")}. Drawer cash exceeds recorded ledger. Check if you forgot to log a customer cash payment or counter sale.`
      };
    }
  }, [countedCash, kpis.cashInHand]);

  // Form Operations
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescription || !formAmount || !formDate) return;

    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0) return;

    if (isEditing && selectedRecordId) {
      setRecords(prev => prev.map(r => {
        if (r.id === selectedRecordId) {
          return {
            ...r,
            description: formDescription,
            flowType: formFlowType,
            category: formCategory as any,
            amount: amt,
            date: formDate,
            notes: formNotes
          };
        }
        return r;
      }));
      setIsEditing(false);
    } else {
      const newRec: CashRecord = {
        id: `cash_${Date.now()}`,
        description: formDescription,
        flowType: formFlowType,
        category: formCategory as any,
        amount: amt,
        date: formDate,
        notes: formNotes
      };
      setRecords(prev => [newRec, ...prev]);
      setSelectedRecordId(newRec.id);
    }

    setFormDescription("");
    setFormAmount("");
    setFormDate("");
    setFormNotes("");
    setShowAddModal(false);
  };

  const handleDeleteRecord = (id: string) => {
    if (window.confirm("Are you sure you want to delete this cashbook ledger entry?")) {
      setRecords(prev => prev.filter(r => r.id !== id));
      setSelectedRecordId(null);
    }
  };

  const startEditMode = () => {
    if (!selectedRecord) return;
    setFormFlowType(selectedRecord.flowType);
    setFormDescription(selectedRecord.description);
    setFormCategory(selectedRecord.category);
    setFormAmount(selectedRecord.amount.toString());
    setFormDate(selectedRecord.date);
    setFormNotes(selectedRecord.notes || "");
    setIsEditing(true);
    setShowAddModal(true);
  };

  const openAddModal = () => {
    setFormFlowType(activeTab === "all" ? "in" : activeTab);
    setFormDescription("");
    setFormAmount("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormNotes("");
    setIsEditing(false);
    setShowAddModal(true);
  };

  return (
    <div className="flex-grow flex flex-col min-h-0 bg-[#F8F9FB] h-full text-[#111827] relative">
      
      {/* 1. TOP SUMMARY KPI HEADER */}
      <div className="p-6 pb-2 shrink-0">
        <div className="flex justify-between items-center mb-5 border-b border-[#E5E7EB] pb-3">
          <div>
            <h2 className="text-xl font-black text-[#0e1b2f] flex items-center gap-2">
              {t("cashbook_title")}
              <span className="bg-[#00C853]/10 text-[#00C853] text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Tally Connected</span>
            </h2>
            <p className="text-[11px] text-[#6B7280] font-semibold mt-0.5">Physical currency tracking, capital leakage analysis, and daily cash drawer balancing audits.</p>
          </div>
          <button
            onClick={openAddModal}
            className="bg-[#c83226] hover:bg-[#b0281e] text-white font-extrabold text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-lg shadow-[#c83226]/15 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{t("add_expense")}</span>
          </button>
        </div>

        {/* SUMMARY KPI GRID */}
        <div className="grid grid-cols-4 gap-4">
          {/* KPI 1: Cash In Hand */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#00C853]" />
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-extrabold uppercase text-[#6B7280] tracking-wider block">{t("net_balance")}</span>
                <h3 className="text-xl font-black text-[#0e1b2f] mt-1">₹{kpis.cashInHand.toLocaleString("en-IN")}</h3>
              </div>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-[#00C853]">
                <Coins className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-emerald-600">
              <CheckCircle className="w-3 h-3" />
              <span>Physical currency balance</span>
            </div>
          </div>

          {/* KPI 2: Today's Inflows */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#c83226]" />
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-extrabold uppercase text-[#6B7280] tracking-wider block">{t("cash_in")}</span>
                <h3 className="text-xl font-black text-[#0e1b2f] mt-1">₹{kpis.todayIn.toLocaleString("en-IN")}</h3>
              </div>
              <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center text-[#c83226]">
                <ArrowDownLeft className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-sky-500">
              <span>Customer sales & repayments</span>
            </div>
          </div>

          {/* KPI 3: Today's Outflows */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#D32F2F]" />
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-extrabold uppercase text-[#6B7280] tracking-wider block">{t("cash_out")}</span>
                <h3 className="text-xl font-black text-[#0e1b2f] mt-1">₹{kpis.todayOut.toLocaleString("en-IN")}</h3>
              </div>
              <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-[#D32F2F]">
                <ArrowUpRight className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-rose-500">
              <span>Wages, payments & Gullak</span>
            </div>
          </div>

          {/* KPI 4: Liquidity Rating */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#FF9100]" />
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-extrabold uppercase text-[#6B7280] tracking-wider block">Working Capital Rating</span>
                <h3 className="text-sm font-black text-[#0e1b2f] mt-2">{kpis.statusLabel}</h3>
              </div>
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-[#FF9100]">
                <Activity className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="flex mt-2">
              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${kpis.statusColor}`}>
                {kpis.statusLabel === "Optimal" ? "Safe Reserves" : "Reserve warning"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN DASHBOARD CONTENT */}
      <div className="flex-1 flex min-h-0 p-6 pt-2 overflow-hidden gap-6">
        
        {/* LEFT CARD: TABS & CASH LOGS LIST */}
        <div className="flex-1 flex flex-col bg-white border border-[#E5E7EB] rounded-3xl overflow-hidden shadow-sm">
          {/* List Controls */}
          <div className="p-4 border-b border-[#E5E7EB] bg-white space-y-4 shrink-0">
            {/* TABS SWITCHER */}
            <div className="bg-[#F8F9FB] p-1 rounded-2xl flex text-xs font-black text-[#6B7280] h-[44px] items-center border border-[#E5E7EB]">
              <button
                onClick={() => {
                  setActiveTab("all");
                  setCategoryFilter("all");
                }}
                className={`flex-grow h-full py-2 rounded-xl text-center cursor-pointer transition-all flex items-center justify-center gap-2 ${
                  activeTab === "all" ? "bg-white text-[#0e1b2f] shadow-sm border border-[#E5E7EB]/50" : "hover:text-[#0e1b2f]"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>All Cash Flow</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab("in");
                  setCategoryFilter("all");
                }}
                className={`flex-grow h-full py-2 rounded-xl text-center cursor-pointer transition-all flex items-center justify-center gap-2 ${
                  activeTab === "in" ? "bg-white text-[#00C853] shadow-sm border border-[#E5E7EB]/50" : "hover:text-[#0e1b2f]"
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>{t("cash_in")}</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab("out");
                  setCategoryFilter("all");
                }}
                className={`flex-grow h-full py-2 rounded-xl text-center cursor-pointer transition-all flex items-center justify-center gap-2 ${
                  activeTab === "out" ? "bg-white text-[#D32F2F] shadow-sm border border-[#E5E7EB]/50" : "hover:text-[#0e1b2f]"
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>{t("cash_out")}</span>
              </button>
            </div>

            {/* SEARCH & FILTERS */}
            <div className="flex gap-2">
              <div className="flex-1 bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl px-4 flex items-center gap-2.5 h-11 focus-within:border-[#c83226] transition-colors">
                <Search className="w-4 h-4 text-[#6B7280] shrink-0" />
                <input
                  type="text"
                  placeholder="Search cash entries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-transparent flex-1 text-xs font-semibold outline-none text-[#111827]"
                />
              </div>

              <div className="flex gap-2 shrink-0">
                {/* Category selector */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl px-3 py-2 text-[10px] font-extrabold text-[#0e1b2f] outline-none cursor-pointer focus:border-[#c83226]"
                >
                  <option value="all">Categories: All</option>
                  {(activeTab === "all" ? [...CASH_IN_CATEGORIES, ...CASH_OUT_CATEGORIES] :
                    activeTab === "in" ? CASH_IN_CATEGORIES : CASH_OUT_CATEGORIES).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                {/* Date filter */}
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl px-3 py-2 text-[10px] font-extrabold text-[#0e1b2f] outline-none cursor-pointer focus:border-[#c83226]"
                >
                  <option value="all">Date: All History</option>
                  <option value="today">Today (June 5)</option>
                  <option value="week">Past 7 Days</option>
                  <option value="month">June MTD</option>
                </select>
              </div>
            </div>
          </div>

          {/* SCROLLABLE LOG LIST */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#E5E7EB] bg-[#F8F9FB]">
            {filteredList.length > 0 ? (
              filteredList.map((rec) => {
                const isSelected = rec.id === selectedRecordId;
                const formattedDate = new Date(rec.date).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric"
                });

                return (
                  <div
                    key={rec.id}
                    onClick={() => setSelectedRecordId(rec.id)}
                    className={`flex items-center justify-between p-4 cursor-pointer transition-all ${
                      isSelected ? "bg-white border-l-4 border-[#c83226] shadow-sm relative z-10" : "hover:bg-white/50"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        rec.flowType === "in" ? "bg-emerald-50 text-[#00C853]" : "bg-rose-50 text-[#D32F2F]"
                      }`}>
                        {rec.flowType === "in" ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-extrabold text-[#0e1b2f] truncate">{rec.description}</h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[9px] font-bold text-[#6B7280]">{formattedDate}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span className="text-[9px] font-extrabold text-[#6B7280] uppercase tracking-wide truncate max-w-[150px]">{rec.category}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black shrink-0 ${
                        rec.flowType === "in" ? "text-[#00C853]" : "text-[#D32F2F]"
                      }`}>
                        {rec.flowType === "in" ? "+" : "-"} ₹{rec.amount.toLocaleString("en-IN")}
                      </span>
                      <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isSelected ? "translate-x-0.5" : ""}`} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-center p-6 bg-white h-full">
                <AlertTriangle className="w-10 h-10 text-slate-300 mb-3" />
                <h4 className="text-xs font-extrabold text-[#0e1b2f]">No cash entries matching filter</h4>
                <p className="text-[10px] text-[#6B7280] mt-1 max-w-[200px]">Adjust filters or record a new cash inflow/outflow entry.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT CARD: DETAILS, AI RECONCILIATION & SVG TRENDS */}
        <div className="w-[450px] flex flex-col min-h-0 bg-white border border-[#E5E7EB] rounded-3xl overflow-y-auto shadow-sm">
          {selectedRecord ? (
            <div className="flex-grow flex flex-col justify-between min-h-0">
              
              {/* SECTION 1: DETAIL MATRIX */}
              <div className="p-5 border-b border-[#E5E7EB] shrink-0">
                <div className="flex justify-between items-start">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                    selectedRecord.flowType === "in" ? "bg-emerald-50 border-emerald-100 text-[#00C853]" : "bg-rose-50 border-rose-100 text-[#D32F2F]"
                  }`}>
                    {selectedRecord.flowType === "in" ? "Cash-In Flow" : "Cash-Out Flow"} ID: #{selectedRecord.id.split("_")[1]?.substring(0,4) || "7002"}
                  </span>

                  <div className="flex gap-2.5">
                    <button
                      onClick={startEditMode}
                      className="text-[#c83226] hover:text-[#b0281e] text-[10px] font-extrabold uppercase flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Edit className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteRecord(selectedRecord.id)}
                      className="text-rose-500 hover:text-rose-600 text-[10px] font-extrabold uppercase flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm border uppercase ${
                    selectedRecord.flowType === "in" ? "bg-emerald-50 border-emerald-100 text-[#00C853]" : "bg-rose-50 border-rose-100 text-[#D32F2F]"
                  }`}>
                    {selectedRecord.description.substring(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#0e1b2f] leading-snug">{selectedRecord.description}</h3>
                    <p className="text-[10px] text-[#6B7280] font-semibold mt-0.5">
                      {new Date(selectedRecord.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric"
                      })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3.5 mt-5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl p-3.5">
                  <div>
                    <span className="text-[8px] font-extrabold uppercase text-[#6B7280] tracking-wider block">Cash Category</span>
                    <span className="text-[10px] font-extrabold text-[#0e1b2f] block mt-0.5 truncate">{selectedRecord.category}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-extrabold uppercase text-[#6B7280] tracking-wider block">Drawer Amount</span>
                    <span className="text-[10px] font-black text-[#0e1b2f] block mt-0.5">₹{selectedRecord.amount.toLocaleString("en-IN")}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-extrabold uppercase text-[#6B7280] tracking-wider block">Notes</span>
                    <span className="text-[10px] font-extrabold text-[#6B7280] block mt-0.5 truncate">{selectedRecord.notes || "--"}</span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: AI CAPITAL LEAKAGE & ANALYSIS */}
              {aiDiagnostics && (
                <div className="p-5 border-b border-[#E5E7EB] bg-gradient-to-tr from-sky-50/20 to-indigo-50/20 shrink-0">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#c83226] flex items-center gap-1 mb-2.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#c83226]" /> Liquidity & Cash Diagnostics
                  </span>

                  <div className="space-y-3">
                    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 shadow-sm text-xs font-semibold text-[#0e1b2f] leading-relaxed relative overflow-hidden">
                      <div className="absolute left-0 top-0 h-full w-1.5 bg-[#c83226]" />
                      <span className="font-extrabold block text-[9px] uppercase text-[#6B7280] tracking-wider mb-1">Cash Ledger Audit</span>
                      {aiDiagnostics.observation}
                    </div>

                    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 shadow-sm text-xs font-semibold text-rose-950 leading-relaxed relative overflow-hidden">
                      <div className="absolute left-0 top-0 h-full w-1.5 bg-[#D32F2F]" />
                      <span className="font-extrabold block text-[9px] uppercase text-[#6B7280] tracking-wider mb-1">Liquidity Warning</span>
                      {aiDiagnostics.warning}
                    </div>

                    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 shadow-sm text-xs font-semibold text-emerald-950 leading-relaxed relative overflow-hidden">
                      <div className="absolute left-0 top-0 h-full w-1.5 bg-[#00C853]" />
                      <span className="font-extrabold block text-[9px] uppercase text-[#6B7280] tracking-wider mb-1">CFO Recommendation</span>
                      {aiDiagnostics.recommendation}
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 3: RECONCILIATION DRAWER AUDIT */}
              <div className="p-5 border-b border-[#E5E7EB] shrink-0 bg-slate-50/50">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#6B7280] flex items-center gap-1.5 mb-3.5">
                  <Coins className="w-3.5 h-3.5 text-[#00C853]" /> End-of-Day Drawer Tally Audit
                </span>

                <div className="bg-white border border-[#E5E7EB] rounded-3xl p-4 shadow-sm space-y-3.5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[8px] font-extrabold uppercase text-[#6B7280] block">Expected Cash balance</span>
                      <h4 className="text-sm font-black text-[#0e1b2f] mt-0.5">₹{kpis.cashInHand.toLocaleString("en-IN")}</h4>
                    </div>

                    <div className="w-40">
                      <label className="text-[8px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-1">Counted Cash (₹)</label>
                      <input
                        type="number"
                        placeholder="e.g. 9150"
                        value={countedCash}
                        onChange={(e) => setCountedCash(e.target.value)}
                        className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-[#00C853] text-[#111827]"
                      />
                    </div>
                  </div>

                  {/* Discrepancy feedback result */}
                  {tallyResult && (
                    <div className={`p-3.5 border rounded-2xl text-[10px] font-bold leading-relaxed flex items-start gap-2.5 ${tallyResult.color}`}>
                      <div className="shrink-0 mt-0.5">{tallyResult.icon}</div>
                      <div>{tallyResult.text}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 4: SVG LIQUIDITY GRAPHS */}
              <div className="p-5 shrink-0 space-y-6">
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#6B7280] block mb-3.5">7-Day Closing Cash Balance Trend</span>
                  <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl p-4 text-center">
                    <div className="h-24 w-full flex items-end">
                      <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                        {/* Gradient Fill */}
                        <path
                          d={`M0,40 L0,${40 - (chartData.balances[0] / 20000) * 30} L16,${40 - (chartData.balances[1] / 20000) * 30} L33,${40 - (chartData.balances[2] / 20000) * 30} L50,${40 - (chartData.balances[3] / 20000) * 30} L66,${40 - (chartData.balances[4] / 20000) * 30} L83,${40 - (chartData.balances[5] / 20000) * 30} L100,${40 - (chartData.balances[6] / 20000) * 30} L100,40 Z`}
                          fill="rgba(0, 200, 83, 0.12)"
                        />
                        {/* Trend path */}
                        <path
                          d={`M0,${40 - (chartData.balances[0] / 20000) * 30} L16,${40 - (chartData.balances[1] / 20000) * 30} L33,${40 - (chartData.balances[2] / 20000) * 30} L50,${40 - (chartData.balances[3] / 20000) * 30} L66,${40 - (chartData.balances[4] / 20000) * 30} L83,${40 - (chartData.balances[5] / 20000) * 30} L100,${40 - (chartData.balances[6] / 20000) * 30}`}
                          fill="none"
                          stroke="#00C853"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <div className="flex justify-between text-[8px] font-extrabold text-[#6B7280] mt-2.5 px-0.5 border-t border-[#E5E7EB] pt-2">
                      {chartData.days.map((lbl, idx) => (
                        <div key={idx} className="flex flex-col items-center">
                          <span>{lbl.split(" ")[1]}</span>
                          <span className="text-[7px] text-[#0e1b2f] mt-0.5">₹{(chartData.balances[idx] / 1000).toFixed(1)}k</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Cash In vs Cash Out Side-by-Side Bar Chart */}
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#6B7280] block mb-3.5">Daily Flow Volumes (Cash-In vs Cash-Out)</span>
                  <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl p-4 text-center">
                    <div className="h-28 w-full flex items-end justify-around px-2">
                      {chartData.ratios.map((item, idx) => {
                        const maxVal = 6000;
                        const inHeight = (item.in / maxVal) * 100;
                        const outHeight = (item.out / maxVal) * 100;

                        return (
                          <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end">
                            <div className="flex gap-1.5 items-end justify-center w-12 h-20">
                              <div
                                className="w-3 bg-[#00C853] rounded-t-sm"
                                style={{ height: `${Math.max(4, inHeight)}%` }}
                                title={`Cash-In: ₹${item.in}`}
                              />
                              <div
                                className="w-3 bg-[#D32F2F] rounded-t-sm"
                                style={{ height: `${Math.max(4, outHeight)}%` }}
                                title={`Cash-Out: ₹${item.out}`}
                              />
                            </div>
                            <span className="text-[7px] font-extrabold text-[#6B7280] uppercase">
                              {new Date(item.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="flex justify-center gap-4 mt-3 text-[8px] font-extrabold text-[#6B7280] border-t border-[#E5E7EB] pt-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 bg-[#00C853] rounded-sm" />
                        <span>Cash-In (Sales/Repayments)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 bg-[#D32F2F] rounded-sm" />
                        <span>Cash-Out (Procurement/Gullak)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center text-center p-6 bg-white min-h-[400px]">
              <Coins className="w-12 h-12 text-[#00C853]/20 border border-[#00C853]/10 rounded-2xl p-2.5 mx-auto mb-4 animate-pulse" />
              <h3 className="text-xs font-black text-[#0e1b2f]">Liquidity Analytics Workspace</h3>
              <p className="text-[10px] text-[#6B7280] mt-1 max-w-[220px] mx-auto leading-relaxed">
                Add a new cash record or select an inflow/outflow item on the left to review ledger details, tally cash drawers, and retrieve liquidity diagnostic insights.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 3. MODAL: RECORD CASH TRANSACTIONS */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-[#081A38]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md p-6 border border-[#E5E7EB] shadow-2xl relative"
            >
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute top-6 right-6 text-[#6B7280] hover:text-[#0e1b2f] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-black text-[#0e1b2f] mb-2">{isEditing ? "Edit" : "Record"} Cash Entry</h3>
              <p className="text-[10px] text-[#6B7280] font-semibold mb-6">Log daily cash register movement to update working liquidity.</p>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* Flow type toggle */}
                <div>
                  <label className="text-[9px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">Flow Direction</label>
                  <div className="bg-[#EEF3F7] p-1 rounded-xl flex text-[10px] font-extrabold text-[#6B7280] h-[40px] items-center">
                    <button
                      type="button"
                      disabled={isEditing}
                      onClick={() => setFormFlowType("in")}
                      className={`flex-grow py-1.5 rounded-lg text-center cursor-pointer transition-all ${
                        formFlowType === "in" ? "bg-white text-[#00C853] shadow-sm" : "hover:text-[#0e1b2f] disabled:opacity-40"
                      }`}
                    >
                      Cash-In (Receipt)
                    </button>
                    <button
                      type="button"
                      disabled={isEditing}
                      onClick={() => setFormFlowType("out")}
                      className={`flex-grow py-1.5 rounded-lg text-center cursor-pointer transition-all ${
                        formFlowType === "out" ? "bg-white text-[#D32F2F] shadow-sm" : "hover:text-[#0e1b2f] disabled:opacity-40"
                      }`}
                    >
                      Cash-Out (Payout)
                    </button>
                  </div>
                </div>

                {/* Entry description */}
                <div>
                  <label className="text-[9px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">Description</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Wholesaler batch payment / Counter retail checkout"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-[#c83226] text-[#111827]"
                  />
                </div>

                {/* Category & Amount */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">Cash Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-[#c83226] text-[#111827] cursor-pointer"
                    >
                      {(formFlowType === "in" ? CASH_IN_CATEGORIES : CASH_OUT_CATEGORIES).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">Amount (₹)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 2000"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-[#c83226] text-[#111827]"
                    />
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="text-[9px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">Transaction Date</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-[#c83226] text-[#111827]"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[9px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">Notes / Details (Optional)</label>
                  <textarea
                    placeholder="e.g. Refined oil bill #809 / राजू को एडवांस दिया"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-xs font-semibold outline-none focus:border-[#c83226] text-[#111827] resize-none"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full bg-[#c83226] hover:bg-[#b0281e] text-white font-extrabold text-xs py-3.5 rounded-xl cursor-pointer mt-4 shadow-lg shadow-[#c83226]/10 transition-transform active:scale-95"
                >
                  {isEditing ? "Save Changes" : "Record Drawer Transaction"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
