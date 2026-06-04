import React, { useState, useEffect } from "react";
import VoiceAssistant from "./VoiceAssistant";

// --- INTERFACES ---

interface LoanScoreBreakdown {
  revenue_score: number;
  consistency_score: number;
  growth_score: number;
}

interface LoanScoreData {
  score: number;
  max_score: number;
  label: string;
  estimated_amount: number;
  reason: string;
  breakdown: LoanScoreBreakdown;
}

interface UdharEntry {
  id: number;
  customer_name: string;
  amount: number;
  date_added: string;
  merchant_id: string;
}


interface Customer {
  id: number;
  customer_name: string;
  merchant_id: string;
  relationship_type: string;
  late_repayments: number;
  total_repayments: number;
  last_reminder_sent: string | null;
  phone_number: string | null;
  pending_amount: number;
  days_pending: number;
  risk_score: number;
  risk_level: string;
}

interface UdharHealth {
  total_udhar: number;
  healthy_amount: number;
  warning_amount: number;
  risky_amount: number;
  insights: string[];
}

export default function Dashboard() {
  const [merchantId] = useState("merchant_001");
  const [activeTab, setActiveTab] = useState<"cfo" | "udhar" | "voice">("cfo");

  // Loan Score State
  const [loanData, setLoanData] = useState<LoanScoreData | null>(null);
  const [loadingScore, setLoadingScore] = useState(true);
  const [scoreError, setScoreError] = useState<string | null>(null);

  // Udhar Add Form State
  const [newUdharName, setNewUdharName] = useState("");
  const [newUdharAmount, setNewUdharAmount] = useState("");
  const [newUdharDate, setNewUdharDate] = useState("");
  const [newUdharPhone, setNewUdharPhone] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addMessage, setAddMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);


  // Udhar Accounts list State
  const [udharEntries, setUdharEntries] = useState<UdharEntry[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [skip, setSkip] = useState(0);
  const [limit] = useState(10);
  const [sortBy, setSortBy] = useState("date_added");
  const [sortOrder, setSortOrder] = useState("desc");
  const [loadingEntries, setLoadingEntries] = useState(true);

  // Reset Demo State
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);

  // Business Summary & GST Monitor States
  const [summaryData, setSummaryData] = useState<any>(null);
  const [gstData, setGstData] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingGst, setLoadingGst] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [gstError, setGstError] = useState<string | null>(null);

  // Udhar Health & Customer Intelligence States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  const [udharHealth, setUdharHealth] = useState<UdharHealth | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [sendingReminderFor, setSendingReminderFor] = useState<string | null>(null);
  const [reminderStatus, setReminderStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [globalToast, setGlobalToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);


  // --- API FETCHERS ---

  const fetchLoanScore = async () => {
    setLoadingScore(true);
    setScoreError(null);
    try {
      const response = await fetch(`/api/loan-score?merchant_id=${merchantId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch loan readiness score");
      }
      const data = await response.json();
      setLoanData(data);
    } catch (err: any) {
      setScoreError(err.message || "An unexpected error occurred");
    } finally {
      setLoadingScore(false);
    }
  };

  const fetchUdharEntries = async () => {
    setLoadingEntries(true);
    try {
      const response = await fetch(
        `/api/udhar/all?merchant_id=${merchantId}&skip=${skip}&limit=${limit}&sort_by=${sortBy}&sort_order=${sortOrder}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch udhar records");
      }
      const data = await response.json();
      setUdharEntries(data.items);
      setTotalEntries(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEntries(false);
    }
  };

  const fetchSummaryAndGst = async () => {
    setLoadingSummary(true);
    setLoadingGst(true);
    setSummaryError(null);
    setGstError(null);
    
    try {
      const summaryRes = await fetch(`/api/summary?merchant_id=${merchantId}`);
      if (!summaryRes.ok) throw new Error("Failed to fetch business summary");
      const sData = await summaryRes.json();
      setSummaryData(sData);
    } catch (err: any) {
      setSummaryError(err.message || "Error fetching summary");
    } finally {
      setLoadingSummary(false);
    }

    try {
      const gstRes = await fetch(`/api/gst-status?merchant_id=${merchantId}`);
      if (!gstRes.ok) throw new Error("Failed to fetch GST status");
      const gData = await gstRes.json();
      setGstData(gData);
    } catch (err: any) {
      setGstError(err.message || "Error fetching GST status");
    } finally {
      setLoadingGst(false);
    }
  };

  const fetchUdharHealth = async () => {
    setLoadingHealth(true);
    setHealthError(null);
    try {
      const response = await fetch(`/api/udhar/health?merchant_id=${merchantId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch Udhar health indicators");
      }
      const data = await response.json();
      setUdharHealth(data);
    } catch (err: any) {
      setHealthError(err.message || "An unexpected error occurred");
    } finally {
      setLoadingHealth(false);
    }
  };

  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const response = await fetch(`/api/customers?merchant_id=${merchantId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch customers list");
      }
      const data = await response.json();
      setCustomers(data);
      if (selectedCustomer) {
        const updated = data.find((c: Customer) => c.customer_name === selectedCustomer.customer_name);
        if (updated) {
          setSelectedCustomer(updated);
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch customers:", err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleSavePhone = async () => {
    if (!selectedCustomer || !phoneInput.trim()) return;
    if (!phoneInput.trim().startsWith("+")) {
      showToast("error", "❌ Number must start with country code e.g. +919876543210");
      return;
    }
    setSavingPhone(true);
    try {
      const r = await fetch(`/api/customers/${selectedCustomer.id}/phone`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phoneInput.trim() })
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.detail || "Failed to save phone number");
      }
      showToast("success", `✅ Phone number saved for ${selectedCustomer.customer_name}`);
      setEditingPhone(false);
      await fetchCustomers(); // refresh so detail panel shows new number
    } catch (err: any) {
      showToast("error", `❌ ${err.message}`);
    } finally {
      setSavingPhone(false);
    }
  };

  const showToast = (type: "success" | "error", text: string) => {
    setGlobalToast({ type, text });
    setReminderStatus({ type, text });
    setTimeout(() => setGlobalToast(null), 4000);
  };

  const handleSendReminder = async (customerName: string) => {
    setSendingReminderFor(customerName);
    setReminderStatus(null);
    setGlobalToast(null);
    try {
      const response = await fetch("/api/reminder/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_name: customerName })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to send payment reminder");
      }
      const data = await response.json();
      if (data.success) {
        showToast("success", `✅ WhatsApp reminder sent to ${customerName}!`);
        fetchCustomers();
        fetchUdharHealth();
      } else {
        throw new Error(data.error || "Sending failed");
      }
    } catch (err: any) {
      showToast("error", `❌ ${err.message || "Failed to send reminder"}`);
    } finally {
      setSendingReminderFor(null);
    }
  };

  // Initial load
  useEffect(() => {
    fetchLoanScore();
    fetchSummaryAndGst();
    fetchUdharHealth();
    fetchCustomers();
  }, [merchantId]);

  useEffect(() => {
    fetchUdharEntries();
  }, [merchantId, skip, sortBy, sortOrder]);


  // Handle Add Udhar
  const handleAddUdhar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUdharName || !newUdharAmount) {
      setAddMessage({ type: "error", text: "Please enter customer name and credit amount." });
      return;
    }
    
    setAddLoading(true);
    setAddMessage(null);
    try {
      const payload: any = {
        customer_name: newUdharName,
        amount: parseFloat(newUdharAmount),
        merchant_id: merchantId
      };
      if (newUdharDate) {
        payload.date_added = newUdharDate;
      }
      if (newUdharPhone.trim()) {
        payload.phone_number = newUdharPhone.trim();
      }

      const response = await fetch("/api/udhar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Server rejected credit submission");
      }

      setAddMessage({ type: "success", text: `Credit of ₹${payload.amount} added for ${payload.customer_name}!` });
      setNewUdharName("");
      setNewUdharAmount("");
      setNewUdharDate("");
      setNewUdharPhone("");
      
      // Refresh score and entries list
      fetchLoanScore();
      fetchUdharEntries();
      fetchUdharHealth();
      fetchCustomers();
    } catch (err: any) {
      setAddMessage({ type: "error", text: err.message || "Failed to save credit entry" });
    } finally {
      setAddLoading(false);
    }
  };


  // Handle DB Reset
  const handleResetDemo = async () => {
    if (!window.confirm("Are you sure you want to reset and generate fresh 180-day demo data?")) {
      return;
    }
    setResetLoading(true);
    setResetResult(null);
    try {
      const response = await fetch("/api/v1/analytics/reset-demo", { method: "POST" });
      if (!response.ok) {
        throw new Error("Failed to reset demo data");
      }
      const data = await response.json();
      setResetResult(`Successfully seeded ${data.details.transactions_seeded} transactions across 180 days!`);
      
      // Reload UI
      fetchLoanScore();
      fetchUdharEntries();
      fetchSummaryAndGst();
      fetchUdharHealth();
      fetchCustomers();
    } catch (err: any) {
      setResetResult(`Error: ${err.message}`);
    } finally {
      setResetLoading(false);
    }
  };


  // --- RENDERS ---

  // Score label colors
  const getScoreColor = (label: string) => {
    switch (label) {
      case "Excellent": return "text-emerald-400 stroke-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      case "Good": return "text-blue-400 stroke-blue-500 bg-blue-500/10 border-blue-500/20";
      case "Fair": return "text-amber-400 stroke-amber-500 bg-amber-500/10 border-amber-500/20";
      default: return "text-rose-400 stroke-rose-500 bg-rose-500/10 border-rose-500/20";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              CFO
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">AI Munshi</h1>
              <p className="text-xs text-slate-400 font-medium">Hindi Voice CFO for Small Merchants</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-slate-300 font-mono">
              Merchant: Ramesh Kirana
            </span>
            <button
              onClick={handleResetDemo}
              disabled={resetLoading}
              className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors shadow-md shadow-blue-600/15"
            >
              {resetLoading ? "Resetting..." : "Reset Demo Data"}
            </button>
          </div>
        </div>
      </header>

      {/* Global floating toast notification */}
      {globalToast && (
        <div
          className={`fixed bottom-6 right-6 z-[999] flex items-center gap-3 px-5 py-4 rounded-2xl border shadow-2xl text-sm font-semibold transition-all duration-300 ${
            globalToast.type === "success"
              ? "bg-emerald-900/90 border-emerald-500/40 text-emerald-200 shadow-emerald-900/50"
              : "bg-rose-900/90 border-rose-500/40 text-rose-200 shadow-rose-900/50"
          }`}
          style={{ backdropFilter: "blur(12px)" }}
        >
          <span>{globalToast.text}</span>
          <button
            onClick={() => setGlobalToast(null)}
            className="ml-2 text-xs opacity-60 hover:opacity-100 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-6 mt-8">
        {/* Reset feedback banner */}
        {resetResult && (
          <div className={`mb-6 p-4 rounded-xl border flex items-center justify-between ${resetResult.startsWith("Error") ? "bg-rose-500/10 border-rose-500/20 text-rose-300" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"}`}>
            <span className="text-sm font-medium">{resetResult}</span>
            <button onClick={() => setResetResult(null)} className="text-xs font-bold hover:underline">Dismiss</button>
          </div>
        )}

        {/* Tab selection */}
        <div className="flex border-b border-slate-800 mb-8 gap-6">
          <button
            onClick={() => setActiveTab("cfo")}
            className={`pb-4 text-sm font-bold tracking-wide transition-all border-b-2 ${
              activeTab === "cfo"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Loan Readiness Score
          </button>
          <button
            onClick={() => setActiveTab("udhar")}
            className={`pb-4 text-sm font-bold tracking-wide transition-all border-b-2 ${
              activeTab === "udhar"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Udhar Ledger
          </button>
          <button
            onClick={() => setActiveTab("voice")}
            className={`pb-4 text-sm font-bold tracking-wide transition-all border-b-2 ${
              activeTab === "voice"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Voice Assistant
          </button>
        </div>

        {/* --- CFO TAB CONTENT --- */}
        {activeTab === "cfo" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Loading / Error States */}
            {loadingScore ? (
              <div className="col-span-3 py-16 flex flex-col items-center justify-center gap-4 bg-slate-900/40 rounded-2xl border border-slate-800/60">
                <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                <p className="text-sm text-slate-400 font-medium">Calculating Loan Readiness Indicators...</p>
              </div>
            ) : scoreError ? (
              <div className="col-span-3 p-8 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center">
                <h3 className="text-rose-400 font-bold mb-2">Failed to calculate Score</h3>
                <p className="text-sm text-rose-300/80 mb-4">{scoreError}</p>
                <button
                  onClick={fetchLoanScore}
                  className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                >
                  Try Again
                </button>
              </div>
            ) : loanData ? (
              <>
                {/* Score Dial and Eligibility Card */}
                <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/80 p-8 shadow-xl flex flex-col justify-between">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-slate-200 mb-6">Loan Readiness Score</h2>
                    <div className="flex flex-col md:flex-row items-center gap-8 justify-around mb-8">
                      {/* Gauge SVG */}
                      <div className="relative w-44 h-44 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="88"
                            cy="88"
                            r="70"
                            className="stroke-slate-800"
                            strokeWidth="12"
                            fill="transparent"
                          />
                          <circle
                            cx="88"
                            cy="88"
                            r="70"
                            className={`gauge-path ${getScoreColor(loanData.label).split(" ")[1]}`}
                            strokeWidth="12"
                            fill="transparent"
                            strokeDasharray="440"
                            strokeDashoffset={440 - (loanData.score / 100) * 440}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute text-center">
                          <span className="text-4xl font-extrabold tracking-tight">{loanData.score}</span>
                          <span className="text-slate-400 text-xs font-semibold block mt-0.5">/ 100</span>
                        </div>
                      </div>

                      {/* Label & Details */}
                      <div className="text-center md:text-left">
                        <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold tracking-wide border mb-4 ${getScoreColor(loanData.label).split(" ").slice(0, 3).join(" ")}`}>
                          {loanData.label} Risk Profile
                        </span>
                        <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">
                          Estimated Loan Amount Limit
                        </div>
                        <div className="text-4xl font-extrabold tracking-tight text-white mb-4">
                          ₹{loanData.estimated_amount.toLocaleString("en-IN")}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Explainable AI Block */}
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-5">
                    <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1.5">AI Insights (Explainable CFO)</h4>
                    <p className="text-sm text-slate-300 leading-relaxed font-medium">
                      "{loanData.reason}"
                    </p>
                  </div>
                </div>

                {/* Score Breakdown Widget */}
                <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/80 p-8 shadow-xl flex flex-col justify-between">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-slate-200 mb-6">Metrics Breakdown</h2>
                    <div className="space-y-6">
                      {/* Revenue Progress */}
                      <div>
                        <div className="flex justify-between text-sm font-medium mb-2">
                          <span className="text-slate-400">Monthly Revenue Vol (40%)</span>
                          <span className="text-slate-200 font-bold">{loanData.breakdown.revenue_score} / 40</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-500 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${(loanData.breakdown.revenue_score / 40) * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Consistency Progress */}
                      <div>
                        <div className="flex justify-between text-sm font-medium mb-2">
                          <span className="text-slate-400">Sales Consistency (30%)</span>
                          <span className="text-slate-200 font-bold">{loanData.breakdown.consistency_score} / 30</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${(loanData.breakdown.consistency_score / 30) * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Growth Progress */}
                      <div>
                        <div className="flex justify-between text-sm font-medium mb-2">
                          <span className="text-slate-400">Revenue Growth (30%)</span>
                          <span className="text-slate-200 font-bold">{loanData.breakdown.growth_score} / 30</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-purple-500 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${(loanData.breakdown.growth_score / 30) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 font-medium border-t border-slate-800/80 pt-6 mt-6">
                    Scoring engine weighs 40% absolute transaction volumes, 30% daily sales variance, and 30% month-over-month growth calculations.
                  </div>
                </div>
                {/* --- Row 2: 7-Day Revenue Chart & GST Card --- */}
                <div className="lg:col-span-2">
                  <RevenueBarChart
                    data={summaryData?.seven_day_revenue || []}
                    loading={loadingSummary}
                    error={summaryError}
                    onRetry={fetchSummaryAndGst}
                  />
                </div>
                
                <div className="lg:col-span-1">
                  <GSTProgressCard
                    data={gstData}
                    loading={loadingGst}
                    error={gstError}
                    onRetry={fetchSummaryAndGst}
                  />
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* --- UDHAR TAB CONTENT --- */}
        {activeTab === "udhar" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT COLUMN: Add Form + Health + Insights */}
            <div className="lg:col-span-1 space-y-8">
              {/* Record Credit Entry Card */}
              <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/80 p-8 shadow-xl">
                <h2 className="text-lg font-bold tracking-tight text-slate-200 mb-6">Add New Udhar Entry</h2>
                <form onSubmit={handleAddUdhar} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newUdharName}
                      onChange={(e) => setNewUdharName(e.target.value)}
                      placeholder="e.g. Mohan"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-slate-100 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                      Credit Amount (₹)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newUdharAmount}
                      onChange={(e) => setNewUdharAmount(e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-slate-100 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                      Date Extended (Optional)
                    </label>
                    <input
                      type="date"
                      value={newUdharDate}
                      onChange={(e) => setNewUdharDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-slate-100 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                      WhatsApp Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={newUdharPhone}
                      onChange={(e) => setNewUdharPhone(e.target.value)}
                      placeholder="e.g. +919876543210"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 text-slate-100 transition-colors"
                    />
                    <p className="text-[10px] text-slate-500 mt-1.5">Used to send WhatsApp payment reminders</p>
                  </div>
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-lg shadow-emerald-600/15"
                  >
                    {addLoading ? "Saving credit..." : "Save Credit Entry"}
                  </button>
                </form>

                {addMessage && (
                  <div className={`mt-4 p-3 rounded-lg border text-xs font-medium ${addMessage.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-rose-500/10 border-rose-500/20 text-rose-300"}`}>
                    {addMessage.text}
                  </div>
                )}
              </div>

              {/* Udhar Health Dashboard Card */}
              <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/80 p-8 shadow-xl">
                <h2 className="text-lg font-bold tracking-tight text-slate-200 mb-6">UDHAR HEALTH</h2>
                {loadingHealth ? (
                  <div className="py-8 flex justify-center">
                    <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                  </div>
                ) : healthError || !udharHealth ? (
                  <div className="text-xs text-rose-400">Failed to load health status</div>
                ) : (
                  <div className="space-y-6">
                    {/* Conic Gradient Donut Chart */}
                    <div className="flex justify-center items-center">
                      <div className="relative w-36 h-36 flex items-center justify-center rounded-full overflow-hidden" style={{
                        background: (() => {
                          const total = udharHealth.total_udhar || 1;
                          const hPct = Math.round((udharHealth.healthy_amount / total) * 100);
                          const wPct = Math.round((udharHealth.warning_amount / total) * 100);
                          return `conic-gradient(#10b981 0% ${hPct}%, #f59e0b ${hPct}% ${hPct + wPct}%, #ef4444 ${hPct + wPct}% 100%)`;
                        })()
                      }}>
                        {/* Cutout to make it a donut */}
                        <div className="w-24 h-24 rounded-full bg-slate-950 flex flex-col justify-center items-center">
                          <span className="text-xl font-extrabold text-white">₹{Math.round(udharHealth.total_udhar).toLocaleString("en-IN")}</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total</span>
                        </div>
                      </div>
                    </div>

                    {/* Breakdown legend */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5">
                        <span className="text-[10px] text-emerald-400 font-bold block mb-0.5">Healthy</span>
                        <span className="font-extrabold text-white">₹{Math.round(udharHealth.healthy_amount).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
                        <span className="text-[10px] text-amber-400 font-bold block mb-0.5">Warning</span>
                        <span className="font-extrabold text-white">₹{Math.round(udharHealth.warning_amount).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">
                        <span className="text-[10px] text-rose-400 font-bold block mb-0.5">Risky</span>
                        <span className="font-extrabold text-white">₹{Math.round(udharHealth.risky_amount).toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Udhar Insights Card */}
              <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/80 p-8 shadow-xl">
                <h2 className="text-lg font-bold tracking-tight text-slate-200 mb-4">Udhar Insights</h2>
                {loadingHealth ? (
                  <div className="py-4 flex justify-center">
                    <div className="w-4 h-4 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                  </div>
                ) : udharHealth && udharHealth.insights ? (
                  <ul className="space-y-3">
                    {udharHealth.insights.map((insight, idx) => (
                      <li key={idx} className="flex gap-2.5 items-start text-xs font-semibold leading-relaxed text-slate-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0"></div>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500">No insights available.</p>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Customer List & Detail Panel + Entry Table */}
            <div className="lg:col-span-2 space-y-8">
              {/* Customer Directory Table */}
              <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/80 p-8 shadow-xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-slate-200">Customer Profiles</h2>
                    <p className="text-xs text-slate-400 mt-1">Select a customer row to open their Detail Panel.</p>
                  </div>
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search by name..."
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none w-full sm:w-48"
                  />
                </div>

                {loadingCustomers ? (
                  <div className="py-8 flex justify-center">
                    <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold tracking-wider">
                          <th className="pb-3 pr-4">Customer</th>
                          <th className="pb-3 px-4">Pending Amount</th>
                          <th className="pb-3 px-4">Days Pending</th>
                          <th className="pb-3 px-4">Risk Score</th>
                          <th className="pb-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {customers.filter(c => c.customer_name.toLowerCase().includes(customerSearch.toLowerCase())).length > 0 ? (
                          customers
                            .filter(c => c.customer_name.toLowerCase().includes(customerSearch.toLowerCase()))
                            .map((c) => (
                              <tr
                                key={c.id}
                                onClick={() => { setSelectedCustomer(c); setEditingPhone(false); setPhoneInput(""); }}
                                className={`text-slate-300 font-medium hover:bg-slate-800/20 transition-colors cursor-pointer ${selectedCustomer?.customer_name === c.customer_name ? "bg-slate-800/30" : ""}`}
                              >
                                <td className="py-3.5 pr-4 font-bold text-white flex items-center gap-2">
                                  {c.customer_name}
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide border ${
                                    c.relationship_type === "loyal" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                                    c.relationship_type === "risky" ? "bg-rose-500/10 border-rose-500/20 text-rose-400" :
                                    "bg-slate-500/10 border-slate-500/20 text-slate-400"
                                  }`}>
                                    {c.relationship_type}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-rose-400 font-bold">₹{c.pending_amount.toLocaleString("en-IN")}</td>
                                <td className="py-3.5 px-4 text-amber-500">{c.days_pending} days</td>
                                <td className="py-3.5 px-4">
                                  <span className={`font-semibold ${
                                    c.risk_level === "low" ? "text-emerald-400" :
                                    c.risk_level === "medium" ? "text-amber-500" :
                                    "text-rose-500"
                                  }`}>
                                    {c.risk_score} ({c.risk_level})
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => handleSendReminder(c.customer_name)}
                                    disabled={sendingReminderFor === c.customer_name}
                                    className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 px-3 rounded-lg disabled:opacity-30 cursor-pointer"
                                  >
                                    {sendingReminderFor === c.customer_name ? "Sending..." : "Send Reminder"}
                                  </button>
                                </td>
                              </tr>
                            ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-slate-500 font-medium">No customers found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Customer Detail Panel (Shown when customer is selected) */}
              {selectedCustomer && (
                <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/80 p-8 shadow-xl relative">
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="absolute top-6 right-6 text-slate-400 hover:text-slate-200 text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Close
                  </button>
                  <h2 className="text-lg font-bold tracking-tight text-slate-200 mb-6 flex items-center gap-3">
                    <span>Customer Detail Panel:</span>
                    <span className="text-white font-extrabold">{selectedCustomer.customer_name}</span>
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* General Credit Profile */}
                    <div className="bg-slate-950/70 border border-slate-850 rounded-xl p-5 space-y-4">
                      <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest border-b border-slate-800/50 pb-2">Credit Profile</h4>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Relationship Type</span>
                        <span className={`px-2.5 py-0.5 rounded text-xs font-extrabold uppercase tracking-wide border ${
                          selectedCustomer.relationship_type === "loyal" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                          selectedCustomer.relationship_type === "risky" ? "bg-rose-500/10 border-rose-500/20 text-rose-400" :
                          "bg-slate-500/10 border-slate-500/20 text-slate-400"
                        }`}>
                          {selectedCustomer.relationship_type}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Udhar Risk Score</span>
                        <span className={`font-bold ${
                          selectedCustomer.risk_level === "low" ? "text-emerald-400" :
                          selectedCustomer.risk_level === "medium" ? "text-amber-500" :
                          "text-rose-500"
                        }`}>
                          {selectedCustomer.risk_score} / 100 ({selectedCustomer.risk_level})
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Total Outstanding</span>
                        <span className="font-bold text-rose-400">₹{selectedCustomer.pending_amount.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Oldest Days Pending</span>
                        <span className="font-bold text-amber-500">{selectedCustomer.days_pending} days</span>
                      </div>
                    </div>

                    {/* Repayment & Activity Statistics */}
                    <div className="bg-slate-950/70 border border-slate-850 rounded-xl p-5 space-y-4">
                      <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest border-b border-slate-800/50 pb-2">Activity & Reminders</h4>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Total Repayments</span>
                        <span className="font-bold text-white">{selectedCustomer.total_repayments}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Late Repayments</span>
                        <span className="font-bold text-rose-400">{selectedCustomer.late_repayments}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Last Reminder Sent</span>
                        <span className="font-mono text-xs text-slate-300">
                          {selectedCustomer.last_reminder_sent 
                            ? new Date(selectedCustomer.last_reminder_sent).toLocaleString("en-IN", {
                                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                              }) 
                            : "Never"}
                        </span>
                      </div>
                      {/* Inline phone editor */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                            WhatsApp Number
                          </span>
                          {!editingPhone ? (
                            <div className="flex items-center gap-2">
                              <span className={`font-mono text-xs ${selectedCustomer.phone_number ? "text-emerald-400" : "text-slate-500 italic"}`}>
                                {selectedCustomer.phone_number || "Not set"}
                              </span>
                              <button
                                onClick={() => { setEditingPhone(true); setPhoneInput(selectedCustomer.phone_number || ""); }}
                                className="text-[10px] text-blue-400 hover:text-blue-300 font-bold px-1.5 py-0.5 rounded border border-blue-500/30 hover:border-blue-400/50 transition-colors"
                                title="Edit phone number"
                              >
                                ✏️ Edit
                              </button>
                            </div>
                          ) : null}
                        </div>
                        {editingPhone && (
                          <div className="flex flex-col gap-2 mt-1">
                            <input
                              autoFocus
                              type="tel"
                              value={phoneInput}
                              onChange={(e) => setPhoneInput(e.target.value)}
                              placeholder="+919876543210"
                              className="w-full bg-slate-900 border border-blue-500/40 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-400 transition-colors"
                              onKeyDown={(e) => { if (e.key === "Enter") handleSavePhone(); if (e.key === "Escape") setEditingPhone(false); }}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={handleSavePhone}
                                disabled={savingPhone || !phoneInput.trim()}
                                className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold py-1.5 rounded-lg transition-colors"
                              >
                                {savingPhone ? "Saving..." : "✓ Save"}
                              </button>
                              <button
                                onClick={() => setEditingPhone(false)}
                                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-1.5 px-3 rounded-lg transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                            <p className="text-[10px] text-slate-500">Include country code, e.g. +91 for India</p>
                          </div>
                        )}
                      </div>
                      <div className="pt-2">
                        <button
                          onClick={() => handleSendReminder(selectedCustomer.customer_name)}
                          disabled={sendingReminderFor === selectedCustomer.customer_name}
                          className="w-full text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg disabled:opacity-30 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a.598.598 0 0 1-.655-.705l.347-2.27c-1.522-1.34-2.482-3.23-2.482-5.317C2.625 7.444 6.655 3.75 11.625 3.75S20.625 7.444 20.625 12Z" />
                          </svg>
                          {sendingReminderFor === selectedCustomer.customer_name ? "Sending WhatsApp..." : "Send WhatsApp Reminder"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {reminderStatus && (
                    <div className={`p-4 rounded-xl border text-xs font-semibold text-center ${reminderStatus.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"}`}>
                      {reminderStatus.text}
                    </div>
                  )}
                </div>
              )}

              {/* Paginated Outstanding Udhar Entries Table */}
              <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/80 p-8 shadow-xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h2 className="text-lg font-bold tracking-tight text-slate-200">Raw Outstanding Credit Entries</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Sort by:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg text-xs px-3 py-1.5 text-slate-200 outline-none"
                    >
                      <option value="date_added">Date Added</option>
                      <option value="customer_name">Customer</option>
                      <option value="amount">Amount</option>
                    </select>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg text-xs px-3 py-1.5 text-slate-200 outline-none"
                    >
                      <option value="desc">Desc</option>
                      <option value="asc">Asc</option>
                    </select>
                  </div>
                </div>

                {loadingEntries ? (
                  <div className="py-8 flex justify-center">
                    <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold tracking-wider">
                          <th className="pb-3 pr-4">Customer</th>
                          <th className="pb-3 px-4">Amount</th>
                          <th className="pb-3 px-4">Date Added</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {udharEntries.length > 0 ? (
                          udharEntries.map((entry) => (
                            <tr key={entry.id} className="text-slate-300 font-medium hover:bg-slate-800/10 transition-colors">
                              <td className="py-3.5 pr-4 font-bold text-white">{entry.customer_name}</td>
                              <td className="py-3.5 px-4 text-rose-400">₹{entry.amount.toLocaleString()}</td>
                              <td className="py-3.5 px-4 text-slate-400 font-mono text-xs">{entry.date_added}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="py-6 text-center text-slate-500 font-medium">No outstanding credit records found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* Pagination */}
                    {totalEntries > limit && (
                      <div className="flex justify-between items-center mt-6">
                        <button
                          disabled={skip === 0}
                          onClick={() => setSkip(Math.max(0, skip - limit))}
                          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold disabled:opacity-30"
                        >
                          Previous
                        </button>
                        <span className="text-xs text-slate-400">
                          Showing {skip + 1} - {Math.min(skip + limit, totalEntries)} of {totalEntries}
                        </span>
                        <button
                          disabled={skip + limit >= totalEntries}
                          onClick={() => setSkip(skip + limit)}
                          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold disabled:opacity-30"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- VOICE ASSISTANT TAB CONTENT --- */}
        {activeTab === "voice" && (
          <VoiceAssistant />
        )}
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS FOR DAILY SUMMARY & GST MONITOR ---

function GSTProgressCard({ data, loading, error, onRetry }: { data: any, loading: boolean, error: string | null, onRetry: () => void }) {
  if (loading) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/80 p-8 shadow-xl flex flex-col items-center justify-center min-h-[280px]">
        <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-3"></div>
        <p className="text-xs text-slate-400 font-medium">Loading GST status...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/80 p-8 shadow-xl flex flex-col items-center justify-center min-h-[280px] text-center">
        <p className="text-xs text-rose-400 font-semibold mb-3">Error: {error || "No data available"}</p>
        <button onClick={onRetry} className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold">
          Retry
        </button>
      </div>
    );
  }

  const { ytd_revenue, threshold, percentage, alert_level } = data;

  const getAlertConfig = (level: string) => {
    switch (level.toLowerCase()) {
      case "safe":
        return {
          barColor: "bg-emerald-500",
          textColor: "text-emerald-400",
          bgColor: "bg-emerald-500/10",
          borderColor: "border-emerald-500/20",
          badgeText: "Safe",
        };
      case "warning":
        return {
          barColor: "bg-amber-500",
          textColor: "text-amber-400",
          bgColor: "bg-amber-500/10",
          borderColor: "border-amber-500/20",
          badgeText: "Warning",
        };
      case "critical":
        return {
          barColor: "bg-rose-500",
          textColor: "text-rose-400",
          bgColor: "bg-rose-500/10",
          borderColor: "border-rose-500/20",
          badgeText: "Critical",
        };
      default:
        return {
          barColor: "bg-slate-500",
          textColor: "text-slate-400",
          bgColor: "bg-slate-500/10",
          borderColor: "border-slate-500/20",
          badgeText: "Unknown",
        };
    }
  };

  const config = getAlertConfig(alert_level);

  return (
    <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/80 p-8 shadow-xl flex flex-col justify-between min-h-[280px]">
      <div>
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-lg font-bold tracking-tight text-slate-200">GST Monitor</h2>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border tracking-wider ${config.textColor} ${config.bgColor} ${config.borderColor}`}>
            {config.badgeText}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1.5">
              <span>YTD Sales / Turnover</span>
              <span className="text-slate-200">₹{ytd_revenue.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-slate-400 mb-2">
              <span>GST Threshold limit</span>
              <span className="text-slate-200">₹{threshold.toLocaleString("en-IN")}</span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-slate-850 h-3.5 rounded-full overflow-hidden relative">
              <div
                className={`${config.barColor} h-full rounded-full transition-all duration-1000`}
                style={{ width: `${Math.min(100, percentage)}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className={`text-base font-extrabold ${config.textColor}`}>
                {percentage}% Reached
              </span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                ₹20 Lakh Threshold
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="text-xs text-slate-500 font-medium border-t border-slate-800/80 pt-4 mt-6">
        Mandatory GST registration is required when annual taxable sales turnover exceeds ₹20 Lakhs.
      </div>
    </div>
  );
}

function RevenueBarChart({ data, loading, error, onRetry }: { data: any[], loading: boolean, error: string | null, onRetry: () => void }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/80 p-8 shadow-xl flex flex-col items-center justify-center min-h-[280px]">
        <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-3"></div>
        <p className="text-xs text-slate-400 font-medium">Loading sales history...</p>
      </div>
    );
  }

  if (error || !data || data.length === 0) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/80 p-8 shadow-xl flex flex-col items-center justify-center min-h-[280px] text-center">
        <p className="text-xs text-rose-400 font-semibold mb-3">Error: {error || "No data available"}</p>
        <button onClick={onRetry} className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold">
          Retry
        </button>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map(d => d.revenue), 1000);
  const gridLines = [0.25, 0.5, 0.75, 1];

  return (
    <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/80 p-8 shadow-xl flex flex-col justify-between min-h-[280px]">
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold tracking-tight text-slate-200">Revenue Last 7 Days</h2>
          <span className="text-xs font-bold text-slate-400">Weekly sales activity</span>
        </div>

        {/* SVG Chart Container */}
        <div className="relative w-full h-44 flex items-end">
          {/* Y Axis Guide Lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pr-8">
            {gridLines.reverse().map((ratio, idx) => (
              <div key={idx} className="w-full flex items-center gap-2">
                <span className="text-[9px] text-slate-500 font-mono w-10 text-right">
                  ₹{Math.round(maxRevenue * ratio).toLocaleString()}
                </span>
                <div className="flex-1 border-t border-slate-800/50"></div>
              </div>
            ))}
          </div>

          {/* Bar Chart Columns */}
          <div className="w-full h-36 flex justify-between items-end pl-12 relative z-10">
            {data.map((item, idx) => {
              const heightPercent = (item.revenue / maxRevenue) * 100;
              const isHovered = hoveredIndex === idx;
              
              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center group relative cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Tooltip on hover */}
                  {isHovered && (
                    <div className="absolute -top-12 z-20 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] font-extrabold text-blue-300 shadow-xl pointer-events-none font-mono">
                      ₹{item.revenue.toLocaleString()}
                    </div>
                  )}

                  {/* Bar */}
                  <div className="w-8 sm:w-10 bg-slate-850 h-full rounded-t-lg flex items-end overflow-hidden hover:bg-slate-800/60 transition-colors">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-1000 ${
                        isHovered 
                          ? "bg-gradient-to-t from-blue-600 to-blue-400 shadow-lg shadow-blue-500/10" 
                          : "bg-gradient-to-t from-blue-700 to-blue-500"
                      }`}
                      style={{ height: `${Math.max(4, heightPercent)}%` }}
                    ></div>
                  </div>

                  {/* Label */}
                  <span className={`text-[10px] font-bold mt-2.5 transition-colors ${
                    isHovered ? "text-blue-400" : "text-slate-400 group-hover:text-slate-200"
                  }`}>
                    {item.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
