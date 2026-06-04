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

interface UdharSummary {
  customer: string;
  amount: number;
  days_pending: number;
  merchant_id: string;
  entries_count: number;
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
  const [addLoading, setAddLoading] = useState(false);
  const [addMessage, setAddMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Udhar Search State
  const [searchName, setSearchName] = useState("");
  const [searchResult, setSearchResult] = useState<UdharSummary | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

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

  // Initial load
  useEffect(() => {
    fetchLoanScore();
    fetchSummaryAndGst();
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
      
      // Refresh score and entries list
      fetchLoanScore();
      fetchUdharEntries();
    } catch (err: any) {
      setAddMessage({ type: "error", text: err.message || "Failed to save credit entry" });
    } finally {
      setAddLoading(false);
    }
  };

  // Handle Search Customer Udhar
  const handleSearchCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchName) return;

    setSearchLoading(true);
    setSearchError(null);
    setSearchResult(null);
    try {
      const response = await fetch(`/api/udhar?merchant_id=${merchantId}&name=${encodeURIComponent(searchName)}`);
      if (response.status === 404) {
        throw new Error(`No active credit records found for "${searchName}"`);
      }
      if (!response.ok) {
        throw new Error("Error querying customer balance");
      }
      const data = await response.json();
      setSearchResult(data);
    } catch (err: any) {
      setSearchError(err.message || "Query failed");
    } finally {
      setSearchLoading(false);
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
                    placeholder="e.g. Ramesh Kumar"
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

            {/* Check Customer Credit & List Accounts */}
            <div className="lg:col-span-2 space-y-8">
              {/* Check customer aggregation balance */}
              <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/80 p-8 shadow-xl">
                <h2 className="text-lg font-bold tracking-tight text-slate-200 mb-4">Check Customer Aggregate Balance</h2>
                <p className="text-xs text-slate-400 mb-6">Enter a customer name to calculate total outstanding credit and days pending (e.g. search "Mohan").</p>
                <form onSubmit={handleSearchCustomer} className="flex gap-3 mb-6">
                  <input
                    type="text"
                    required
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder="Search customer..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-slate-100 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={searchLoading}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors shadow-lg shadow-blue-600/15"
                  >
                    {searchLoading ? "Querying..." : "Search"}
                  </button>
                </form>

                {searchError && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-medium text-rose-400">
                    {searchError}
                  </div>
                )}

                {searchResult && (
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-5 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <span className="text-xs text-slate-400 block mb-1">Customer</span>
                      <span className="text-base font-bold text-white">{searchResult.customer}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block mb-1">Total credit</span>
                      <span className="text-base font-bold text-rose-400">₹{searchResult.amount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block mb-1">Days Pending</span>
                      <span className="text-base font-bold text-amber-500">{searchResult.days_pending} days</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Paginated and sorted accounts list */}
              <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/80 p-8 shadow-xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h2 className="text-lg font-bold tracking-tight text-slate-200">Outstanding Udhar Records</h2>
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
