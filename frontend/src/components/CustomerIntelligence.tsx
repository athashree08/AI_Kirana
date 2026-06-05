import { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";

// --- INTERFACES ---
interface TopCustomerItem {
  customer_name: string;
  total_spent: number;
  visit_count: number;
  relationship_type: string;
  last_transaction_date?: string | null;
}

interface CustomerInsightsData {
  total_customers: number;
  vip_customers: number;
  regular_customers: number;
  new_customers: number;
  avg_customer_spend: number;
  top_by_spend: TopCustomerItem[];
  top_by_frequency: TopCustomerItem[];
  newest_customers: TopCustomerItem[];
  ai_insights: string[];
}

interface PaymentInsightModal {
  show: boolean;
  customer_name: string;
  visit_count: number;
  total_spent: number;
  relationship_type: string;
  insight_message: string;
  is_milestone: boolean;
}

// --- TIER BADGE ---
function TierBadge({ tier }: { tier: string }) {
  const styles: Record<string, string> = {
    VIP: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    Regular: "bg-[#0066c0]/20 text-[#0066c0] border border-[#0066c0]/30",
    New: "bg-slate-700/50 text-slate-300 border border-slate-600/40",
  };
  const icons: Record<string, string> = { VIP: "👑", Regular: "⭐", New: "🆕" };
  const style = styles[tier] || styles["New"];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${style}`}>
      <span>{icons[tier] || "🆕"}</span>
      {tier}
    </span>
  );
}

// --- MINI BAR ---
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full bg-[#1e2a3a] rounded-full h-1.5 overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// --- AI INSIGHT CARD ---
function InsightCard({ text, index }: { text: string; index: number }) {
  const icons = ["💡", "🏆", "🔁", "📈", "🎯", "🌟"];
  const icon = icons[index % icons.length];
  return (
    <div className="flex items-start gap-3 p-3 bg-[#0e1a2a]/60 border border-[#1e3a5a]/40 rounded-xl">
      <span className="text-base flex-shrink-0">{icon}</span>
      <p className="text-xs text-[#94a3b8] leading-relaxed font-medium">{text}</p>
    </div>
  );
}

// --- MILESTONE POPUP ---
function MilestonePopup({ data, onClose }: { data: PaymentInsightModal; onClose: () => void }) {
  if (!data.show) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#0c1526] border border-[#1e3a5a] rounded-3xl p-8 max-w-sm w-full shadow-2xl shadow-[#0e1b2f]/30"
        onClick={(e) => e.stopPropagation()}
      >
        {data.is_milestone ? (
          <div className="text-center mb-6">
            <div className="text-6xl mb-3 animate-bounce">🎉</div>
            <div className="text-amber-400 text-xs font-extrabold uppercase tracking-widest mb-1">Milestone!</div>
          </div>
        ) : (
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">📊</div>
            <div className="text-[#0066c0] text-xs font-extrabold uppercase tracking-widest mb-1">AI Customer Insight</div>
          </div>
        )}

        <h2 className="text-lg font-extrabold text-white text-center mb-2">{data.customer_name}</h2>
        <p className="text-[#94a3b8] text-sm text-center leading-relaxed mb-5">{data.insight_message}</p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[#1e2a3a] rounded-xl p-3 text-center">
            <div className="text-lg font-extrabold text-white">{data.visit_count}</div>
            <div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider">Visits</div>
          </div>
          <div className="bg-[#1e2a3a] rounded-xl p-3 text-center">
            <div className="text-sm font-extrabold text-white">₹{Math.round(data.total_spent).toLocaleString("en-IN")}</div>
            <div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider">Spent</div>
          </div>
          <div className="bg-[#1e2a3a] rounded-xl p-3 text-center">
            <TierBadge tier={data.relationship_type} />
            <div className="text-[10px] text-[#64748b] font-semibold uppercase tracking-wider mt-1">Tier</div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-[#c83226] hover:bg-[#b0281e] text-white font-bold py-3 rounded-xl transition-all text-sm cursor-pointer"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}

// ===============================================================
// MAIN COMPONENT
// ===============================================================

interface CustomerIntelligenceProps {
  merchantId?: string;
}

export default function CustomerIntelligence({ merchantId = "merchant_001" }: CustomerIntelligenceProps) {
  const { t } = useLanguage();
  const [data, setData] = useState<CustomerInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"spend" | "frequency" | "newest">("spend");
  const [milestone, setMilestone] = useState<PaymentInsightModal>({
    show: false,
    customer_name: "",
    visit_count: 0,
    total_spent: 0,
    relationship_type: "New",
    insight_message: "",
    is_milestone: false,
  });

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customer-insights?merchant_id=${merchantId}`);
      if (!res.ok) throw new Error("Failed to load customer intelligence");
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [merchantId]);

  const activeList: TopCustomerItem[] =
    activeTab === "spend" ? data?.top_by_spend ?? []
    : activeTab === "frequency" ? data?.top_by_frequency ?? []
    : data?.newest_customers ?? [];

  const maxValue =
    activeTab === "spend"
      ? Math.max(...(data?.top_by_spend.map((c) => c.total_spent) ?? [1]))
      : Math.max(...(data?.top_by_frequency.map((c) => c.visit_count) ?? [1]));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 border-4 border-[#c83226]/20 border-t-[#c83226] rounded-full animate-spin" />
        <p className="text-sm text-[#64748b] font-medium">Loading Customer Intelligence...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-rose-900/20 border border-rose-500/20 rounded-2xl text-center">
        <h3 className="text-rose-400 font-bold mb-2">Failed to load</h3>
        <p className="text-sm text-rose-300/70 mb-4">{error}</p>
        <button onClick={fetchInsights} className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-sm transition-all cursor-pointer">
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const vipPct = data.total_customers > 0 ? Math.round((data.vip_customers / data.total_customers) * 100) : 0;
  const regularPct = data.total_customers > 0 ? Math.round((data.regular_customers / data.total_customers) * 100) : 0;
  const newPct = data.total_customers > 0 ? Math.round((data.new_customers / data.total_customers) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Milestone Popup */}
      <MilestonePopup data={milestone} onClose={() => setMilestone((p) => ({ ...p, show: false }))} />

      {/* ---- HEADER ---- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span className="text-2xl">📊</span>
            {t("cust_intel_title")}
          </h2>
          <p className="text-xs text-[#64748b] mt-1 font-medium">
            Automated customer analytics — updated on every transaction.
          </p>
        </div>
        <button
          onClick={fetchInsights}
          className="flex items-center gap-2 px-4 py-2 bg-[#1e2a3a] hover:bg-[#253446] border border-[#2a3f5a] rounded-xl text-xs font-bold text-[#94a3b8] hover:text-white transition-all cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {t("refresh")}
        </button>
      </div>

      {/* ---- KPI CARDS ---- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div className="bg-[#0c1526] border border-[#1e3a5a]/50 rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-[#64748b] uppercase tracking-widest">{t("total_customers")}</span>
            <span className="w-8 h-8 rounded-lg bg-[#0066c0]/10 flex items-center justify-center text-base">👥</span>
          </div>
          <span className="text-3xl font-black text-white">{data.total_customers}</span>
          <p className="text-[10px] text-[#64748b]">All-time unique buyers</p>
        </div>

        {/* VIP */}
        <div className="bg-[#0c1526] border border-amber-500/20 rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-amber-500/70 uppercase tracking-widest">{t("vip_customers")}</span>
            <span className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-base">👑</span>
          </div>
          <span className="text-3xl font-black text-amber-400">{data.vip_customers}</span>
          <div className="flex items-center gap-1.5">
            <MiniBar value={vipPct} max={100} color="bg-amber-500" />
            <span className="text-[10px] text-amber-500/70 font-bold w-8">{vipPct}%</span>
          </div>
        </div>

        {/* Regular */}
        <div className="bg-[#0c1526] border border-[#0066c0]/20 rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-blue-500/70 uppercase tracking-widest">{t("regular_customers")}</span>
            <span className="w-8 h-8 rounded-lg bg-[#0066c0]/10 flex items-center justify-center text-base">⭐</span>
          </div>
          <span className="text-3xl font-black text-[#0066c0]">{data.regular_customers}</span>
          <div className="flex items-center gap-1.5">
            <MiniBar value={regularPct} max={100} color="bg-[#0066c0]" />
            <span className="text-[10px] text-blue-500/70 font-bold w-8">{regularPct}%</span>
          </div>
        </div>

        {/* Avg Spend */}
        <div className="bg-[#0c1526] border border-emerald-500/20 rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-emerald-500/70 uppercase tracking-widest">{t("avg_spend")}</span>
            <span className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-base">💰</span>
          </div>
          <span className="text-2xl font-black text-emerald-400">₹{Math.round(data.avg_customer_spend).toLocaleString("en-IN")}</span>
          <p className="text-[10px] text-[#64748b]">Per customer lifetime</p>
        </div>
      </div>

      {/* ---- MIDDLE SECTION: Customer Distribution + AI Insights ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Tier Distribution */}
        <div className="bg-[#0c1526] border border-[#1e3a5a]/50 rounded-2xl p-6">
          <h3 className="text-sm font-extrabold text-white mb-5 flex items-center gap-2">
            <span className="text-base">📊</span> {t("tier_dist")}
          </h3>

          {/* Segmented bar */}
          <div className="flex h-4 rounded-full overflow-hidden gap-0.5 mb-5">
            {vipPct > 0 && (
              <div className="bg-amber-500 h-full transition-all duration-700" style={{ width: `${vipPct}%` }} title={`VIP: ${vipPct}%`} />
            )}
            {regularPct > 0 && (
              <div className="bg-[#0066c0] h-full transition-all duration-700" style={{ width: `${regularPct}%` }} title={`Regular: ${regularPct}%`} />
            )}
            {newPct > 0 && (
              <div className="bg-slate-600 h-full transition-all duration-700" style={{ width: `${newPct}%` }} title={`New: ${newPct}%`} />
            )}
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-xs text-[#94a3b8] font-medium">{t("vip_desc")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">{data.vip_customers}</span>
                <span className="text-[10px] text-amber-500/70">({vipPct}%)</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#0066c0]" />
                <span className="text-xs text-[#94a3b8] font-medium">{t("regular_desc")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">{data.regular_customers}</span>
                <span className="text-[10px] text-blue-500/70">({regularPct}%)</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                <span className="text-xs text-[#94a3b8] font-medium">{t("new_desc")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">{data.new_customers}</span>
                <span className="text-[10px] text-slate-400">({newPct}%)</span>
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-[#1e3a5a]/40 pt-4">
            <p className="text-[10px] text-[#64748b] leading-relaxed">
              Classification auto-updates after every transaction via the Customer Intelligence engine.
            </p>
          </div>
        </div>

        {/* AI Insights */}
        <div className="lg:col-span-2 bg-[#0c1526] border border-[#1e3a5a]/50 rounded-2xl p-6">
          <h3 className="text-sm font-extrabold text-white mb-4 flex items-center gap-2">
            <span className="text-base">📈</span> {t("ai_cust_insights")}
            <span className="ml-2 text-[10px] bg-[#0066c0]/10 border border-[#0066c0]/20 text-[#0066c0] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Live
            </span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.ai_insights.length > 0 ? (
              data.ai_insights.map((insight, i) => (
                <InsightCard key={i} text={insight} index={i} />
              ))
            ) : (
              <div className="col-span-2 text-center py-8">
                <p className="text-sm text-[#64748b]">No insights yet. Reset demo data to populate the database.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---- BOTTOM: TOP CUSTOMERS TABLE ---- */}
      <div className="bg-[#0c1526] border border-[#1e3a5a]/50 rounded-2xl p-6">
        {/* Table Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
            <span className="text-base">🏆</span> {t("top_customers")}
          </h3>
          <div className="flex gap-1 bg-[#1e2a3a] p-1 rounded-xl">
            {(["spend", "frequency", "newest"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === tab
                    ? "bg-[#c83226] text-white shadow-md"
                    : "text-[#64748b] hover:text-white"
                }`}
              >
                {tab === "spend" ? t("by_spend") : tab === "frequency" ? t("by_freq") : t("newest")}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {activeList.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-[#64748b]">No customer data available. Reset demo to generate data.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] font-extrabold text-[#64748b] uppercase tracking-widest">
                  <th className="text-left pb-3 pr-4">#</th>
                  <th className="text-left pb-3 pr-4">Customer</th>
                  <th className="text-left pb-3 pr-4">Tier</th>
                  <th className="text-right pb-3 pr-4">
                    {activeTab === "frequency" ? "Visits" : "Total Spent"}
                  </th>
                  {activeTab === "spend" && (
                    <th className="text-right pb-3 pr-4">Visits</th>
                  )}
                  <th className="text-right pb-3">Last Purchase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e3a5a]/30">
                {activeList.map((c, i) => (
                  <tr key={c.customer_name} className="hover:bg-[#1e2a3a]/40 transition-colors group">
                    {/* Rank */}
                    <td className="py-3 pr-4">
                      <span className={`text-sm font-extrabold ${i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-700" : "text-[#64748b]"}`}>
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center flex-shrink-0 border border-[#0066c0]/20">
                          <span className="text-xs font-extrabold text-[#0066c0]">
                            {c.customer_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-white group-hover:text-[#0066c0] transition-colors">
                          {c.customer_name}
                        </span>
                      </div>
                    </td>

                    {/* Tier */}
                    <td className="py-3 pr-4">
                      <TierBadge tier={c.relationship_type} />
                    </td>

                    {/* Primary value */}
                    <td className="py-3 pr-4 text-right">
                      {activeTab === "frequency" ? (
                        <div>
                          <span className="text-sm font-extrabold text-white">{c.visit_count}</span>
                          <span className="text-[10px] text-[#64748b] ml-1">visits</span>
                          <MiniBar value={c.visit_count} max={maxValue} color="bg-[#0066c0]" />
                        </div>
                      ) : (
                        <div>
                          <span className="text-sm font-extrabold text-emerald-400">
                            ₹{Math.round(c.total_spent).toLocaleString("en-IN")}
                          </span>
                          {activeTab === "spend" && (
                            <MiniBar value={c.total_spent} max={maxValue} color="bg-emerald-500" />
                          )}
                        </div>
                      )}
                    </td>

                    {/* Visits (only for spend tab) */}
                    {activeTab === "spend" && (
                      <td className="py-3 pr-4 text-right">
                        <span className="text-xs font-semibold text-[#94a3b8]">{c.visit_count} <span className="text-[#64748b]">visits</span></span>
                      </td>
                    )}

                    {/* Last purchase */}
                    <td className="py-3 text-right">
                      <span className="text-xs text-[#64748b] font-medium">
                        {c.last_transaction_date
                          ? new Date(c.last_transaction_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                          : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---- VOICE QUERY HINTS ---- */}
      <div className="bg-[#0c1526] border border-[#1e3a5a]/30 rounded-2xl p-5">
        <h4 className="text-xs font-extrabold text-[#64748b] uppercase tracking-widest mb-3 flex items-center gap-2">
          <span>🎙️</span> {t("voice_hints_title")}
        </h4>
        <div className="flex flex-wrap gap-2">
          {[
            "Sabse accha customer kaun hai?",
            "Top 5 customers dikhao",
            "Sabse zyada aata kaun hai?",
            "Kitne customers hain mere?",
          ].map((q) => (
            <span
              key={q}
              className="text-[11px] bg-[#1e2a3a] border border-[#2a3f5a] text-[#94a3b8] px-3 py-1.5 rounded-lg font-medium cursor-default hover:text-white hover:border-[#0066c0]/40 transition-colors"
            >
              "{q}"
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
