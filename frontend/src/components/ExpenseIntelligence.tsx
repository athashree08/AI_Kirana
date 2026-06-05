import React, { useState, useMemo, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  CreditCard,
  Sparkles,
  Trash2,
  Edit,
  X,
  Info,
  ChevronRight,
  Activity,
  CheckCircle,
  AlertTriangle
} from "lucide-react";

// --- INTERFACES ---
interface TransactionItem {
  id: string;
  name: string;
  category: string;
  amount: number;
  date: string;
  type: "expense" | "purchase" | "sale";
  paymentMethod: "UPI" | "Cash" | "Wallet" | "Card";
}

// --- CONSTANTS ---
const EXPENSE_CATEGORIES = ["Rent & Utility", "Staff & Salary", "Packaging & Transport", "Marketing", "Miscellaneous"];
const PURCHASE_CATEGORIES = ["Rice & Grains", "Grocery", "Oil & Dairy", "Spices", "Snacks", "Beverages"];
const SALE_CATEGORIES = ["Grocery", "Dairy", "Snacks", "Beverages", "Household"];

const INITIAL_MOCK_DATA: TransactionItem[] = [
  // Expenses (Operating Costs)
  {
    id: "exp_1",
    name: "Store Rent (June)",
    category: "Rent & Utility",
    amount: 25000,
    date: "2026-06-01",
    type: "expense",
    paymentMethod: "Card"
  },
  {
    id: "exp_2",
    name: "Electricity Bill (May)",
    category: "Rent & Utility",
    amount: 4800,
    date: "2026-06-03",
    type: "expense",
    paymentMethod: "UPI"
  },
  {
    id: "exp_3",
    name: "Staff Salary (Raju)",
    category: "Staff & Salary",
    amount: 12000,
    date: "2026-05-31",
    type: "expense",
    paymentMethod: "UPI"
  },
  {
    id: "exp_4",
    name: "Packaging Bags (Bulk)",
    category: "Packaging & Transport",
    amount: 2500,
    date: "2026-06-02",
    type: "expense",
    paymentMethod: "Cash"
  },
  {
    id: "exp_5",
    name: "Transport to Mandi",
    category: "Packaging & Transport",
    amount: 1800,
    date: "2026-06-04",
    type: "expense",
    paymentMethod: "Cash"
  },
  {
    id: "exp_6",
    name: "Tea & Snacks for staff",
    category: "Miscellaneous",
    amount: 650,
    date: "2026-06-05",
    type: "expense",
    paymentMethod: "Cash"
  },
  {
    id: "exp_7",
    name: "Internet Broadband",
    category: "Rent & Utility",
    amount: 999,
    date: "2026-05-28",
    type: "expense",
    paymentMethod: "UPI"
  },
  {
    id: "exp_8",
    name: "Flyer Printing",
    category: "Marketing",
    amount: 1500,
    date: "2026-05-26",
    type: "expense",
    paymentMethod: "Wallet"
  },

  // Purchases (Stock/Suppliers)
  {
    id: "pur_1",
    name: "Rice Purchase",
    category: "Rice & Grains",
    amount: 15000,
    date: "2026-06-04",
    type: "purchase",
    paymentMethod: "UPI"
  },
  {
    id: "pur_2",
    name: "Atta Shaktibhog 50 Bags",
    category: "Grocery",
    amount: 18500,
    date: "2026-06-03",
    type: "purchase",
    paymentMethod: "UPI"
  },
  {
    id: "pur_3",
    name: "Refined Oil 10 tins",
    category: "Oil & Dairy",
    amount: 14000,
    date: "2026-06-02",
    type: "purchase",
    paymentMethod: "Cash"
  },
  {
    id: "pur_4",
    name: "Spices Assortment",
    category: "Spices",
    amount: 6200,
    date: "2026-05-30",
    type: "purchase",
    paymentMethod: "UPI"
  },
  {
    id: "pur_5",
    name: "Biscuit Cartons (Britannia)",
    category: "Snacks",
    amount: 8500,
    date: "2026-05-29",
    type: "purchase",
    paymentMethod: "UPI"
  },
  {
    id: "pur_6",
    name: "Pulses (Arhar & Chana Dal)",
    category: "Grocery",
    amount: 12000,
    date: "2026-05-27",
    type: "purchase",
    paymentMethod: "Cash"
  },

  // Sales (Inflow/Customers)
  {
    id: "sal_1",
    name: "Amit Sharma Store Sale",
    category: "Grocery",
    amount: 1200,
    date: "2026-06-05",
    type: "sale",
    paymentMethod: "UPI"
  },
  {
    id: "sal_2",
    name: "Sandeep Gupta Order",
    category: "Dairy",
    amount: 650,
    date: "2026-06-05",
    type: "sale",
    paymentMethod: "Cash"
  },
  {
    id: "sal_3",
    name: "Walk-in Customer #322",
    category: "Snacks",
    amount: 350,
    date: "2026-06-05",
    type: "sale",
    paymentMethod: "Cash"
  },
  {
    id: "sal_4",
    name: "Walk-in Customer #701",
    category: "Grocery",
    amount: 2100,
    date: "2026-06-04",
    type: "sale",
    paymentMethod: "UPI"
  },
  {
    id: "sal_5",
    name: "Suresh Patel (Monthly Bill)",
    category: "Beverages",
    amount: 1800,
    date: "2026-06-04",
    type: "sale",
    paymentMethod: "UPI"
  },
  {
    id: "sal_6",
    name: "Priya Singh Order",
    category: "Dairy",
    amount: 950,
    date: "2026-06-03",
    type: "sale",
    paymentMethod: "UPI"
  },
  {
    id: "sal_7",
    name: "Walk-in Customer #105",
    category: "Grocery",
    amount: 480,
    date: "2026-06-03",
    type: "sale",
    paymentMethod: "Cash"
  },
  {
    id: "sal_8",
    name: "Regular Kirana Bill Sale",
    category: "Household",
    amount: 4500,
    date: "2026-06-01",
    type: "sale",
    paymentMethod: "Card"
  }
];

export default function ExpenseIntelligence() {
  const { t } = useLanguage();
  // --- STATE ---
  const [transactions, setTransactions] = useState<TransactionItem[]>(() => {
    const local = localStorage.getItem("ai_munshi_expenses_data");
    return local ? JSON.parse(local) : INITIAL_MOCK_DATA;
  });

  const [activeTab, setActiveTab] = useState<"expense" | "purchase" | "sale">("expense");
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Filters State
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all"); // all, today, week, month
  const [amountFilter, setAmountFilter] = useState("all"); // all, under_1k, 1k_5k, over_5k

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [formType, setFormType] = useState<"expense" | "purchase" | "sale">("expense");
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formPaymentMethod, setFormPaymentMethod] = useState<"UPI" | "Cash" | "Wallet" | "Card">("UPI");

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem("ai_munshi_expenses_data", JSON.stringify(transactions));
  }, [transactions]);

  // Set default category when formType changes
  useEffect(() => {
    if (formType === "expense") setFormCategory(EXPENSE_CATEGORIES[0]);
    else if (formType === "purchase") setFormCategory(PURCHASE_CATEGORIES[0]);
    else setFormCategory(SALE_CATEGORIES[0]);
  }, [formType]);

  // Set default selected item
  const filteredList = useMemo(() => {
    return transactions.filter(t => {
      if (t.type !== activeTab) return false;
      const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = categoryFilter === "all" || t.category === categoryFilter;
      
      // Date filter logic
      let matchesDate = true;
      const tDate = new Date(t.date);
      const today = new Date("2026-06-05"); // Using mock today
      if (dateFilter === "today") {
        matchesDate = t.date === "2026-06-05";
      } else if (dateFilter === "week") {
        const diffTime = Math.abs(today.getTime() - tDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        matchesDate = diffDays <= 7;
      } else if (dateFilter === "month") {
        matchesDate = t.date.startsWith("2026-06");
      }

      // Amount filter logic
      let matchesAmt = true;
      if (amountFilter === "under_1k") {
        matchesAmt = t.amount < 1000;
      } else if (amountFilter === "1k_5k") {
        matchesAmt = t.amount >= 1000 && t.amount <= 5000;
      } else if (amountFilter === "over_5k") {
        matchesAmt = t.amount > 5000;
      }

      return matchesSearch && matchesCat && matchesDate && matchesAmt;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, activeTab, searchTerm, categoryFilter, dateFilter, amountFilter]);

  // Set selected item on tab switch or list filter changes
  useEffect(() => {
    if (filteredList.length > 0) {
      if (!filteredList.some(item => item.id === selectedTxId)) {
        setSelectedTxId(filteredList[0].id);
      }
    } else {
      setSelectedTxId(null);
    }
  }, [filteredList, selectedTxId]);

  const selectedTx = useMemo(() => {
    return transactions.find(t => t.id === selectedTxId) || null;
  }, [transactions, selectedTxId]);

  // --- CALCULATION OF METRICS ---
  const summaries = useMemo(() => {
    // Current date matches mock framework (June 5, 2026)
    const todayStr = "2026-06-05";
    const currentMonthPrefix = "2026-06";
    const prevMonthPrefix = "2026-05";

    const expensesOnly = transactions.filter(t => t.type === "expense");

    const todayExpenses = expensesOnly
      .filter(t => t.date === todayStr)
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyExpenses = expensesOnly
      .filter(t => t.date.startsWith(currentMonthPrefix))
      .reduce((sum, t) => sum + t.amount, 0);

    const prevMonthExpenses = expensesOnly
      .filter(t => t.date.startsWith(prevMonthPrefix))
      .reduce((sum, t) => sum + t.amount, 0);

    // Growth percentage calculation
    let growthPct = 0;
    if (prevMonthExpenses > 0) {
      growthPct = ((monthlyExpenses - prevMonthExpenses) / prevMonthExpenses) * 100;
    } else {
      growthPct = 12.4; // Fallback realistic visual rate
    }

    // Largest category finder
    const catMap: Record<string, number> = {};
    expensesOnly.forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    });
    
    let maxCatName = "None";
    let maxCatVal = 0;
    Object.entries(catMap).forEach(([cat, val]) => {
      if (val > maxCatVal) {
        maxCatVal = val;
        maxCatName = cat;
      }
    });

    return {
      todayExpenses,
      monthlyExpenses,
      largestCategory: maxCatName,
      growthPct: growthPct.toFixed(1)
    };
  }, [transactions]);

  // AI predictions & health score metrics
  const predictionMetrics = useMemo(() => {
    const monthlyExpenses = transactions
      .filter(t => t.type === "expense" && t.date.startsWith("2026-06"))
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlySales = transactions
      .filter(t => t.type === "sale" && t.date.startsWith("2026-06"))
      .reduce((sum, t) => sum + t.amount, 0);

    const expectedExpenses = monthlyExpenses * 1.05; // 5% growth projection
    const dailyBurnRate = monthlyExpenses / 5; // June MTD is 5 days
    
    // Health score calculations (Scale out of 100 based on Expense/Sales ratio)
    let healthScore = 85;
    if (monthlySales > 0) {
      const ratio = (monthlyExpenses / monthlySales) * 100;
      if (ratio < 40) healthScore = 92;
      else if (ratio < 60) healthScore = 82;
      else if (ratio < 80) healthScore = 68;
      else healthScore = 48;
    }
    
    return {
      expectedExpenses: Math.round(expectedExpenses),
      burnRate: Math.round(dailyBurnRate),
      healthScore
    };
  }, [transactions]);

  // SVG Chart Computations
  const chartData = useMemo(() => {
    // Generate monthly spend totals (Dec '25 to May '26)
    // We will supply mock monthly values, but adjust them dynamically with new entries
    const monthLabels = ["Dec", "Jan", "Feb", "Mar", "Apr", "May"];
    const baseMonthlyVals = [32000, 28000, 35000, 42000, 38000, 45300];

    // Read dynamic additions to May to show feedback
    const addMay = transactions
      .filter(t => t.type === "expense" && t.date.startsWith("2026-05"))
      .reduce((sum, t) => sum + t.amount, 0);
    
    if (addMay > 14499) {
      baseMonthlyVals[5] = addMay;
    }

    // Category distribution calculations for Active Tab
    const catData: Record<string, number> = {};
    const items = transactions.filter(t => t.type === activeTab);
    items.forEach(t => {
      catData[t.category] = (catData[t.category] || 0) + t.amount;
    });

    const totalAmt = items.reduce((sum, t) => sum + t.amount, 0);

    const categoryBreakdown = Object.entries(catData).map(([name, value]) => {
      return {
        name,
        value,
        percentage: totalAmt > 0 ? Math.round((value / totalAmt) * 100) : 0
      };
    }).sort((a, b) => b.value - a.value);

    return {
      monthlyValues: baseMonthlyVals,
      monthLabels,
      categoryBreakdown
    };
  }, [transactions, activeTab]);

  // Context-aware AI Insight Generator
  const aiAnalysis = useMemo(() => {
    if (!selectedTx) return null;

    const name = selectedTx.name;
    const cat = selectedTx.category;
    const amt = selectedTx.amount;

    if (name.toLowerCase().includes("rice")) {
      return {
        observation: "Rice purchases increased 18% compared to last month.",
        warning: "Inventory cost for grains is rising faster than retail revenue.",
        recommendation: "Reduce next week's rice purchase volume by 10% or negotiate a 5% credit limit extension with Rice Supplier."
      };
    }

    if (cat === "Rent & Utility") {
      return {
        observation: `Utility payments for ${name} represent ${Math.round((amt / summaries.monthlyExpenses) * 100) || 5}% of June operating costs.`,
        warning: "Electricity consumption is 8% higher than the peak summer average.",
        recommendation: "Switch off secondary cold storage units during off-peak afternoon hours (1 PM - 4 PM) to save up to ₹1,500/month."
      };
    }

    if (cat === "Staff & Salary") {
      return {
        observation: `Staff salary (₹${amt.toLocaleString()}) remains your second largest outflow category.`,
        warning: "Staff efficiency ratios have slightly dropped due to slower weekday afternoon walk-ins.",
        recommendation: "Maintain current staffing levels. Shift staff breaks to the 2 PM - 4 PM slot to keep peak evening hours fully staffed."
      };
    }

    if (cat === "Packaging & Transport") {
      return {
        observation: "Logistics and packaging expenses are up 12% MTD.",
        warning: "Single-use packaging costs have spiked due to raw material increases.",
        recommendation: "Purchase paper bags in bulk batches of 1,000+ units. This reduces unit pricing by 15%."
      };
    }

    return {
      observation: `${name} is currently cataloged in ${cat} payment loops.`,
      warning: "Operating cash burn has reached ₹1,450/day this week.",
      recommendation: "Consider scheduling payments of this category to the 1st week of the month to match peak customer receivables cash flow."
    };
  }, [selectedTx, summaries.monthlyExpenses]);

  // Handle Form Submission
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formAmount || !formDate) return;

    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0) return;

    if (isEditing && selectedTxId) {
      // Edit transaction
      setTransactions(prev => prev.map(t => {
        if (t.id === selectedTxId) {
          return {
            ...t,
            name: formName,
            category: formCategory,
            amount: amt,
            date: formDate,
            type: formType,
            paymentMethod: formPaymentMethod
          };
        }
        return t;
      }));
      setIsEditing(false);
    } else {
      // Add new transaction
      const newTx: TransactionItem = {
        id: `tx_${Date.now()}`,
        name: formName,
        category: formCategory,
        amount: amt,
        date: formDate,
        type: formType,
        paymentMethod: formPaymentMethod
      };
      setTransactions(prev => [newTx, ...prev]);
      setSelectedTxId(newTx.id);
    }

    // Reset Form & Modal
    setFormName("");
    setFormAmount("");
    setFormDate("");
    setShowAddModal(false);
  };

  // Delete transaction
  const handleDeleteTx = (id: string) => {
    if (window.confirm("Are you sure you want to delete this transaction record?")) {
      setTransactions(prev => prev.filter(t => t.id !== id));
      setSelectedTxId(null);
    }
  };

  // Start Edit Mode
  const startEditMode = () => {
    if (!selectedTx) return;
    setFormType(selectedTx.type);
    setFormName(selectedTx.name);
    setFormCategory(selectedTx.category);
    setFormAmount(selectedTx.amount.toString());
    setFormDate(selectedTx.date);
    setFormPaymentMethod(selectedTx.paymentMethod);
    setIsEditing(true);
    setShowAddModal(true);
  };

  // Open Modal to Add
  const openAddModal = () => {
    setFormType(activeTab);
    setFormName("");
    setFormAmount("");
    setFormDate(new Date().toISOString().split("T")[0]); // Today
    setFormPaymentMethod("UPI");
    setIsEditing(false);
    setShowAddModal(true);
  };

  // Color mapping functions
  const getCategoryColor = (_cat: string, index: number) => {
    const colors = [
      "#00BAF2", // Paytm Cyan/Blue
      "#00C853", // Green
      "#D32F2F", // Red
      "#FF9100", // Orange
      "#7C4DFF", // Purple
      "#00E5FF", // Light Cyan
    ];
    return colors[index % colors.length];
  };

  // Calculate donut segment drawing properties
  const donutSegments = useMemo(() => {
    let currentPercentage = 0;
    return chartData.categoryBreakdown.map((cat, idx) => {
      const percentage = cat.percentage;
      const offset = currentPercentage;
      currentPercentage += percentage;
      return {
        ...cat,
        color: getCategoryColor(cat.name, idx),
        offset: offset,
        strokeDash: `${percentage} ${100 - percentage}`
      };
    });
  }, [chartData.categoryBreakdown]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F8F9FB] h-full text-[#111827] relative">
      
      {/* 1. TOP SUMMARY CARDS HEADER */}
      <div className="p-6 pb-2 shrink-0">
        <div className="flex justify-between items-center mb-5 border-b border-[#E5E7EB] pb-3">
          <div>
            <h2 className="text-xl font-black text-[#002970] flex items-center gap-2">
              {t("exp_intel_title")}
              <span className="bg-[#00BAF2]/10 text-[#00BAF2] text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">AI Powered</span>
            </h2>
            <p className="text-[11px] text-[#6B7280] font-semibold mt-0.5">Real-time expense diagnostic audit, cash burn ratios, and inventory analysis.</p>
          </div>
          <button
            onClick={openAddModal}
            className="bg-[#00BAF2] hover:bg-[#009FD0] text-white font-extrabold text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-lg shadow-[#00BAF2]/15 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{t("add_expense")}</span>
          </button>
        </div>

        {/* SUMMARY CARDS GRID */}
        <div className="grid grid-cols-4 gap-4">
          {/* Card 1: Today's Expenses */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#D32F2F]" />
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-extrabold uppercase text-[#6B7280] tracking-wider block">Today's Expenses</span>
                <h3 className="text-xl font-black text-[#002970] mt-1">₹{summaries.todayExpenses.toLocaleString("en-IN")}</h3>
              </div>
              <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-[#D32F2F]">
                <ArrowUpRight className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-rose-500">
              <TrendingUp className="w-3 h-3" />
              <span>Outflow registered today</span>
            </div>
          </div>

          {/* Card 2: Monthly Expenses */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#00BAF2]" />
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-extrabold uppercase text-[#6B7280] tracking-wider block">June Outflows MTD</span>
                <h3 className="text-xl font-black text-[#002970] mt-1">₹{summaries.monthlyExpenses.toLocaleString("en-IN")}</h3>
              </div>
              <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center text-[#00BAF2]">
                <Wallet className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-sky-500">
              <Activity className="w-3 h-3 animate-pulse" />
              <span>Normal operating outflow</span>
            </div>
          </div>

          {/* Card 3: Largest Expense Category */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#FF9100]" />
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-extrabold uppercase text-[#6B7280] tracking-wider block">Largest Category</span>
                <h3 className="text-sm font-black text-[#002970] mt-2 truncate w-40">{summaries.largestCategory}</h3>
              </div>
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-[#FF9100]">
                <Info className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-amber-600">
              <span>Primary cost driver</span>
            </div>
          </div>

          {/* Card 4: Expense Growth Rate */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#7C4DFF]" />
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-extrabold uppercase text-[#6B7280] tracking-wider block">Expense Change %</span>
                <h3 className="text-xl font-black text-[#002970] mt-1">{summaries.growthPct}%</h3>
              </div>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-[#7C4DFF]">
                <TrendingDown className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-emerald-600">
              <CheckCircle className="w-3 h-3" />
              <span>Optimizing relative outflow</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <div className="flex-1 flex min-h-0 p-6 pt-2 overflow-hidden gap-6">
        
        {/* LEFT COMPONENT: TABS & TRANSACTION LIST */}
        <div className="flex-1 flex flex-col bg-white border border-[#E5E7EB] rounded-3xl overflow-hidden shadow-sm">
          {/* List Toolbar (Tabs & Searching) */}
          <div className="p-4 border-b border-[#E5E7EB] bg-white space-y-4 shrink-0">
            {/* TAB SWITCHER */}
            <div className="bg-[#F8F9FB] p-1 rounded-2xl flex text-xs font-black text-[#6B7280] h-[44px] items-center border border-[#E5E7EB]">
              <button
                onClick={() => {
                  setActiveTab("expense");
                  setCategoryFilter("all");
                }}
                className={`flex-grow h-full py-2 rounded-xl text-center cursor-pointer transition-all flex items-center justify-center gap-2 ${
                  activeTab === "expense" ? "bg-white text-[#D32F2F] shadow-sm border border-[#E5E7EB]/50" : "hover:text-[#002970]"
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Expenses</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab("purchase");
                  setCategoryFilter("all");
                }}
                className={`flex-grow h-full py-2 rounded-xl text-center cursor-pointer transition-all flex items-center justify-center gap-2 ${
                  activeTab === "purchase" ? "bg-white text-[#00BAF2] shadow-sm border border-[#E5E7EB]/50" : "hover:text-[#002970]"
                }`}
              >
                <Wallet className="w-4 h-4" />
                <span>Purchases</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab("sale");
                  setCategoryFilter("all");
                }}
                className={`flex-grow h-full py-2 rounded-xl text-center cursor-pointer transition-all flex items-center justify-center gap-2 ${
                  activeTab === "sale" ? "bg-white text-[#00C853] shadow-sm border border-[#E5E7EB]/50" : "hover:text-[#002970]"
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>Sales</span>
              </button>
            </div>

            {/* SEARCH & FILTER BAR */}
            <div className="flex gap-2">
              <div className="flex-1 bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl px-4 flex items-center gap-2.5 h-11 focus-within:border-[#00BAF2] transition-colors">
                <Search className="w-4 h-4 text-[#6B7280] shrink-0" />
                <input
                  type="text"
                  placeholder={`Search by ${activeTab} item name...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold outline-none text-[#111827]"
                />
              </div>

              {/* Filters toggle controls */}
              <div className="flex gap-2 shrink-0">
                {/* Category Filter */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl px-3 py-2 text-[10px] font-extrabold text-[#002970] outline-none cursor-pointer focus:border-[#00BAF2]"
                >
                  <option value="all">Categories: All</option>
                  {(activeTab === "expense" ? EXPENSE_CATEGORIES : 
                    activeTab === "purchase" ? PURCHASE_CATEGORIES : 
                    SALE_CATEGORIES).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                {/* Date Filter */}
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl px-3 py-2 text-[10px] font-extrabold text-[#002970] outline-none cursor-pointer focus:border-[#00BAF2]"
                >
                  <option value="all">Date: All History</option>
                  <option value="today">Today (June 5)</option>
                  <option value="week">Past 7 Days</option>
                  <option value="month">June MTD</option>
                </select>

                {/* Amount Filter */}
                <select
                  value={amountFilter}
                  onChange={(e) => setAmountFilter(e.target.value)}
                  className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl px-3 py-2 text-[10px] font-extrabold text-[#002970] outline-none cursor-pointer focus:border-[#00BAF2]"
                >
                  <option value="all">Amount: All</option>
                  <option value="under_1k">Under ₹1,000</option>
                  <option value="1k_5k">₹1,000 - ₹5,000</option>
                  <option value="over_5k">Above ₹5,000</option>
                </select>
              </div>
            </div>
          </div>

          {/* scrollable transaction list */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#E5E7EB] bg-[#F8F9FB]">
            {filteredList.length > 0 ? (
              filteredList.map((item) => {
                const isSelected = item.id === selectedTxId;
                const formattedDate = new Date(item.date).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric"
                });

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedTxId(item.id)}
                    className={`flex items-center justify-between p-4 cursor-pointer transition-all ${
                      isSelected ? "bg-white border-l-4 border-[#00BAF2] shadow-sm relative z-10" : "hover:bg-white/50"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        item.type === "expense" ? "bg-rose-50 text-[#D32F2F]" :
                        item.type === "purchase" ? "bg-sky-50 text-[#00BAF2]" :
                        "bg-emerald-50 text-[#00C853]"
                      }`}>
                        {item.type === "expense" ? <ArrowUpRight className="w-5 h-5" /> :
                         item.type === "purchase" ? <Wallet className="w-5 h-5" /> :
                         <ArrowDownLeft className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-extrabold text-[#002970] truncate">{item.name}</h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[9px] font-bold text-[#6B7280]">{formattedDate}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span className="text-[9px] font-extrabold text-[#6B7280] uppercase tracking-wide">{item.category}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black shrink-0 ${
                        item.type === "expense" ? "text-[#D32F2F]" :
                        item.type === "purchase" ? "text-[#00BAF2]" :
                        "text-[#00C853]"
                      }`}>
                        {item.type === "sale" ? "+" : "-"} ₹{item.amount.toLocaleString("en-IN")}
                      </span>
                      <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isSelected ? "translate-x-0.5" : ""}`} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-center p-6 bg-white h-full">
                <AlertTriangle className="w-10 h-10 text-slate-300 mb-3" />
                <h4 className="text-xs font-extrabold text-[#002970]">No transaction records found</h4>
                <p className="text-[10px] text-[#6B7280] mt-1 max-w-[200px] leading-relaxed">Try adjusting your filters, search term, or select another tab to seed fresh records.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COMPONENT: DETAILS, AI INSIGHTS & ANALYTICS */}
        <div className="w-[450px] flex flex-col min-h-0 bg-white border border-[#E5E7EB] rounded-3xl overflow-y-auto shadow-sm">
          {selectedTx ? (
            <div className="flex-grow flex flex-col justify-between min-h-0">
              
              {/* SECTION 1: SELECTED TX DETAILS */}
              <div className="p-5 border-b border-[#E5E7EB] shrink-0">
                <div className="flex justify-between items-start">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                    selectedTx.type === "expense" ? "bg-rose-50 border-rose-100 text-[#D32F2F]" :
                    selectedTx.type === "purchase" ? "bg-sky-50 border-sky-100 text-[#00BAF2]" :
                    "bg-emerald-50 border-emerald-100 text-[#00C853]"
                  }`}>
                    {selectedTx.type} ID: #{selectedTx.id.split("_")[1] || "5001"}
                  </span>
                  
                  {/* Actions buttons (Edit/Delete) */}
                  <div className="flex gap-2.5">
                    <button
                      onClick={startEditMode}
                      className="text-[#00BAF2] hover:text-[#009FD0] text-[10px] font-extrabold uppercase flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Edit className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTx(selectedTx.id)}
                      className="text-rose-500 hover:text-rose-600 text-[10px] font-extrabold uppercase flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm border uppercase ${
                    selectedTx.type === "expense" ? "bg-rose-50 border-rose-100 text-[#D32F2F]" :
                    selectedTx.type === "purchase" ? "bg-sky-50 border-sky-100 text-[#00BAF2]" :
                    "bg-emerald-50 border-emerald-100 text-[#00C853]"
                  }`}>
                    {selectedTx.name.substring(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#002970] leading-snug">{selectedTx.name}</h3>
                    <p className="text-[10px] text-[#6B7280] font-semibold mt-0.5">
                      {new Date(selectedTx.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric"
                      })}
                    </p>
                  </div>
                </div>

                {/* Information matrix grid */}
                <div className="grid grid-cols-3 gap-3.5 mt-5 bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl p-3.5">
                  <div>
                    <span className="text-[8px] font-extrabold uppercase text-[#6B7280] tracking-wider block">Category</span>
                    <span className="text-[10px] font-extrabold text-[#002970] block mt-0.5 truncate">{selectedTx.category}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-extrabold uppercase text-[#6B7280] tracking-wider block">Gross Total</span>
                    <span className="text-[10px] font-black text-[#002970] block mt-0.5">₹{selectedTx.amount.toLocaleString("en-IN")}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-extrabold uppercase text-[#6B7280] tracking-wider block">Payment Method</span>
                    <span className="text-[10px] font-extrabold text-[#002970] block mt-0.5 flex items-center gap-1">
                      {selectedTx.paymentMethod === "UPI" ? <Activity className="w-3 h-3 text-emerald-500" /> : <CreditCard className="w-3 h-3 text-slate-500" />}
                      {selectedTx.paymentMethod}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: AI ANALYSIS CARD */}
              {aiAnalysis && (
                <div className="p-5 border-b border-[#E5E7EB] bg-gradient-to-tr from-sky-50/20 to-indigo-50/20 shrink-0">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#00BAF2] flex items-center gap-1 mb-2.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#00BAF2]" /> AI Diagnostics & Recommendations
                  </span>
                  
                  <div className="space-y-3">
                    <div className="bg-white/80 border border-[#E5E7EB] rounded-2xl p-3.5 shadow-sm text-xs font-semibold text-[#002970] leading-relaxed relative overflow-hidden">
                      <div className="absolute left-0 top-0 h-full w-1.5 bg-[#00BAF2]" />
                      <span className="font-extrabold block text-[9px] uppercase text-[#6B7280] tracking-wider mb-1">Observation</span>
                      {aiAnalysis.observation}
                    </div>

                    <div className="bg-white/80 border border-[#E5E7EB] rounded-2xl p-3.5 shadow-sm text-xs font-semibold text-amber-900 leading-relaxed relative overflow-hidden">
                      <div className="absolute left-0 top-0 h-full w-1.5 bg-[#FF9100]" />
                      <span className="font-extrabold block text-[9px] uppercase text-[#6B7280] tracking-wider mb-1">Cost Alert</span>
                      {aiAnalysis.warning}
                    </div>

                    <div className="bg-white/80 border border-[#E5E7EB] rounded-2xl p-3.5 shadow-sm text-xs font-semibold text-emerald-950 leading-relaxed relative overflow-hidden">
                      <div className="absolute left-0 top-0 h-full w-1.5 bg-[#00C853]" />
                      <span className="font-extrabold block text-[9px] uppercase text-[#6B7280] tracking-wider mb-1">CFO Recommendation</span>
                      {aiAnalysis.recommendation}
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 3: INTERACTIVE SVG CHARTS */}
              <div className="p-5 border-b border-[#E5E7EB] shrink-0 space-y-6">
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#6B7280] block mb-3.5">Monthly Expense Trend (Line Chart)</span>
                  <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl p-4 text-center">
                    <div className="h-24 w-full flex items-end">
                      <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                        {/* Area Gradient fill */}
                        <path
                          d={`M0,40 L0,${40 - (chartData.monthlyValues[0] / 60000) * 32} L20,${40 - (chartData.monthlyValues[1] / 60000) * 32} L40,${40 - (chartData.monthlyValues[2] / 60000) * 32} L60,${40 - (chartData.monthlyValues[3] / 60000) * 32} L80,${40 - (chartData.monthlyValues[4] / 60000) * 32} L100,${40 - (chartData.monthlyValues[5] / 60000) * 32} L100,40 Z`}
                          fill="rgba(0, 186, 242, 0.12)"
                        />
                        {/* Spline line */}
                        <path
                          d={`M0,${40 - (chartData.monthlyValues[0] / 60000) * 32} L20,${40 - (chartData.monthlyValues[1] / 60000) * 32} L40,${40 - (chartData.monthlyValues[2] / 60000) * 32} L60,${40 - (chartData.monthlyValues[3] / 60000) * 32} L80,${40 - (chartData.monthlyValues[4] / 60000) * 32} L100,${40 - (chartData.monthlyValues[5] / 60000) * 32}`}
                          fill="none"
                          stroke="#00BAF2"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <div className="flex justify-between text-[8px] font-extrabold text-[#6B7280] mt-2.5 px-0.5 border-t border-[#E5E7EB] pt-2">
                      {chartData.monthLabels.map((lbl, idx) => (
                        <div key={idx} className="flex flex-col items-center">
                          <span>{lbl}</span>
                          <span className="text-[7px] text-[#002970] mt-0.5">₹{(chartData.monthlyValues[idx] / 1000).toFixed(0)}k</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Category breakdown donut chart */}
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#6B7280] block mb-3.5">{activeTab} Category Breakdown (Donut Chart)</span>
                  <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl p-4 flex items-center justify-around gap-2">
                    
                    {/* SVG Donut Chart */}
                    <div className="relative w-24 h-24 shrink-0">
                      {chartData.categoryBreakdown.length > 0 ? (
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 42 42">
                          <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#E5E7EB" strokeWidth="4.5" />
                          {donutSegments.map((seg, idx) => (
                            <circle
                              key={idx}
                              cx="21"
                              cy="21"
                              r="15.915"
                              fill="transparent"
                              stroke={seg.color}
                              strokeWidth="4.5"
                              strokeDasharray={seg.strokeDash}
                              strokeDashoffset={100 - seg.offset}
                            />
                          ))}
                        </svg>
                      ) : (
                        <div className="w-full h-full rounded-full border-4 border-slate-200 flex items-center justify-center font-bold text-[8px] text-[#6B7280]">0%</div>
                      )}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-[8px] font-extrabold text-[#6B7280] uppercase tracking-wider">Total</span>
                        <span className="text-[9px] font-black text-[#002970] mt-0.5">₹{(transactions.filter(t => t.type === activeTab).reduce((sum, t) => sum + t.amount, 0) / 1000).toFixed(0)}k</span>
                      </div>
                    </div>

                    {/* Donut Legend */}
                    <div className="space-y-1.5 flex-1 min-w-0 px-2">
                      {donutSegments.slice(0, 4).map((seg, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[8px] font-extrabold min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                            <span className="text-[#6B7280] truncate">{seg.name}</span>
                          </div>
                          <span className="text-[#002970] shrink-0">{seg.percentage}%</span>
                        </div>
                      ))}
                    </div>

                  </div>
                </div>

                {/* Top Spending Categories List */}
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#6B7280] block mb-3.5">Top Spending Categories</span>
                  <div className="space-y-3">
                    {chartData.categoryBreakdown.slice(0, 3).map((cat, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-extrabold">
                          <span className="text-[#002970]">{cat.name}</span>
                          <span className="text-[#6B7280]">₹{cat.value.toLocaleString("en-IN")} ({cat.percentage}%)</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${cat.percentage}%`,
                              backgroundColor: getCategoryColor(cat.name, idx)
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* SECTION 4: AI PREDICTIONS & HEALTH SCORE DIAL */}
              <div className="p-5 bg-gradient-to-tr from-sky-50/10 to-emerald-50/10 shrink-0">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#002970] flex items-center gap-1 mb-4">
                  <Activity className="w-3.5 h-3.5 text-[#00BAF2]" /> AI Predictions & Diagnostics
                </span>

                <div className="grid grid-cols-2 gap-4">
                  {/* Health score Dial Gauge */}
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
                    <span className="text-[8px] font-extrabold text-[#6B7280] uppercase tracking-wider">Expense Health Score</span>
                    
                    <div className="relative w-20 h-20 flex items-center justify-center mt-3">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="14" fill="transparent" stroke="#E5E7EB" strokeWidth="3.5" />
                        <circle
                          cx="18"
                          cy="18"
                          r="14"
                          fill="transparent"
                          stroke={predictionMetrics.healthScore >= 75 ? "#00C853" : predictionMetrics.healthScore >= 60 ? "#FF9100" : "#D32F2F"}
                          strokeWidth="3.5"
                          strokeDasharray={`${predictionMetrics.healthScore} ${100 - predictionMetrics.healthScore}`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-base font-black text-[#002970]">{predictionMetrics.healthScore}</span>
                        <span className="text-[7px] text-[#6B7280] font-extrabold uppercase tracking-wide">
                          {predictionMetrics.healthScore >= 75 ? "Healthy" : predictionMetrics.healthScore >= 60 ? "Warning" : "Critical"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Calculations card (Expected expenses, burn rate) */}
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 space-y-4">
                    <div>
                      <span className="text-[8px] font-extrabold uppercase text-[#6B7280] tracking-wider block">Expected Next Month</span>
                      <h4 className="text-sm font-black text-[#002970] mt-0.5">₹{predictionMetrics.expectedExpenses.toLocaleString("en-IN")}</h4>
                      <p className="text-[8px] text-[#6B7280] font-semibold mt-0.5">Based on June run rate</p>
                    </div>

                    <div>
                      <span className="text-[8px] font-extrabold uppercase text-[#6B7280] tracking-wider block">Daily Cash Burn Rate</span>
                      <h4 className="text-sm font-black text-[#002970] mt-0.5">₹{predictionMetrics.burnRate.toLocaleString("en-IN")} / day</h4>
                      <p className="text-[8px] text-[#6B7280] font-semibold mt-0.5">Average operational outflows</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center text-center p-6 bg-white min-h-[400px]">
              <Sparkles className="w-12 h-12 text-[#00BAF2]/20 border border-[#00BAF2]/10 rounded-2xl p-2.5 mx-auto mb-4 animate-pulse" />
              <h3 className="text-xs font-black text-[#002970]">AI Analytics Workspace</h3>
              <p className="text-[10px] text-[#6B7280] mt-1 max-w-[220px] mx-auto leading-relaxed">
                Add a new record or select a transaction item from the list on the left to audit cost structures, retrieve recommendations, and review predictions.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 3. MODALS: ADD & EDIT TRANSACTION POPUP */}
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
                className="absolute top-6 right-6 text-[#6B7280] hover:text-[#002970] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-black text-[#002970] mb-2">{isEditing ? "Edit" : "Record"} Transaction Entry</h3>
              <p className="text-[10px] text-[#6B7280] font-semibold mb-6">Store transactional details for diagnostics reporting audits.</p>
              
              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* 1. Transaction Type Toggle (Disable in Edit Mode for database sanity) */}
                <div>
                  <label className="text-[9px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">Transaction Type</label>
                  <div className="bg-[#EEF3F7] p-1 rounded-xl flex text-[10px] font-extrabold text-[#6B7280] h-[40px] items-center">
                    <button
                      type="button"
                      disabled={isEditing}
                      onClick={() => setFormType("expense")}
                      className={`flex-grow py-1.5 rounded-lg text-center cursor-pointer transition-all ${
                        formType === "expense" ? "bg-white text-[#D32F2F] shadow-sm" : "hover:text-[#002970] disabled:opacity-40"
                      }`}
                    >
                      Expense
                    </button>
                    <button
                      type="button"
                      disabled={isEditing}
                      onClick={() => setFormType("purchase")}
                      className={`flex-grow py-1.5 rounded-lg text-center cursor-pointer transition-all ${
                        formType === "purchase" ? "bg-white text-[#00BAF2] shadow-sm" : "hover:text-[#002970] disabled:opacity-40"
                      }`}
                    >
                      Purchase
                    </button>
                    <button
                      type="button"
                      disabled={isEditing}
                      onClick={() => setFormType("sale")}
                      className={`flex-grow py-1.5 rounded-lg text-center cursor-pointer transition-all ${
                        formType === "sale" ? "bg-white text-[#00C853] shadow-sm" : "hover:text-[#002970] disabled:opacity-40"
                      }`}
                    >
                      Sale
                    </button>
                  </div>
                </div>

                {/* 2. Name field */}
                <div>
                  <label className="text-[9px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">Entry Name / Item</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rice Purchase / Rent / Electricity Bill"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-[#00BAF2] text-[#111827]"
                  />
                </div>

                {/* 3. Category & Amount Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-[#00BAF2] text-[#111827] cursor-pointer"
                    >
                      {(formType === "expense" ? EXPENSE_CATEGORIES : 
                        formType === "purchase" ? PURCHASE_CATEGORIES : 
                        SALE_CATEGORIES).map(cat => (
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
                      placeholder="e.g. 15000"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-[#00BAF2] text-[#111827]"
                    />
                  </div>
                </div>

                {/* 4. Date & Payment Method Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">Transaction Date</label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-[#00BAF2] text-[#111827]"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">Payment Mode</label>
                    <select
                      value={formPaymentMethod}
                      onChange={(e) => setFormPaymentMethod(e.target.value as any)}
                      className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-[#00BAF2] text-[#111827] cursor-pointer"
                    >
                      <option value="UPI">UPI Payment</option>
                      <option value="Cash">Cash Ledger</option>
                      <option value="Wallet">Digital Wallet</option>
                      <option value="Card">Bank Card</option>
                    </select>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full bg-[#00BAF2] hover:bg-[#009FD0] text-white font-extrabold text-xs py-3.5 rounded-xl cursor-pointer mt-4 shadow-lg shadow-[#00BAF2]/10 transition-transform active:scale-95"
                >
                  {isEditing ? "Save Changes" : "Record Transaction Entry"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
