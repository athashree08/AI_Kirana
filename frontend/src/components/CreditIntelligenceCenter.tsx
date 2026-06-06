import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../context/LanguageContext";
import ExpenseIntelligence from "./ExpenseIntelligence";
import CashbookIntelligence from "./CashbookIntelligence";
import StaffManagement from "./StaffManagement";
import ReportsAnalytics from "./ReportsAnalytics";
import CustomerIntelligence from "./CustomerIntelligence";
import LiveQRTerminal from "./LiveQRTerminal";
import ImportHub from "./ImportHub";
import {
  Search,
  QrCode,
  ArrowUpRight,
  ArrowDownLeft,
  Phone,
  MessageSquare,
  Mic,
  Shield,
  RefreshCw,
  LayoutDashboard,
  Plus,
  Settings,
  Sparkles,
  Filter,
  SlidersHorizontal,
  BookOpen,
  X,
  ChevronDown,
  Calendar,
  Award,
  FolderOpen,
  TrendingUp,
  LineChart,
  Wallet
} from "lucide-react";

interface CreditIntelligenceCenterProps {
  onLogout?: () => void;
}

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

interface Customer {
  id: number;
  customer_name: string;
  merchant_id: string;
  relationship_type: string; // VIP, Regular, New (sales-based) or loyal, risky, normal (udhar-based)
  late_repayments: number;
  total_repayments: number;
  last_reminder_sent: string | null;
  phone_number: string | null;
  pending_amount: number;
  days_pending: number;
  risk_score: number;
  risk_level: string; // low, medium, high
  // Sales-intelligence fields
  visit_count?: number;
  total_spent?: number;
  average_transaction?: number;
  first_transaction_date?: string | null;
  last_transaction_date?: string | null;
}

interface UdharHealth {
  total_udhar: number;
  healthy_amount: number;
  warning_amount: number;
  risky_amount: number;
  insights: string[];
}

interface UdharEntry {
  id: number;
  customer_name: string;
  amount: number;
  date_added: string;
  merchant_id: string;
}

// --- SUPPLIER INTERFACES ---
interface Supplier {
  id: number;
  name: string;
  phone: string;
  pending_amount: number; // positive means You'll Give (we owe them)
  last_purchase_date: string;
  risk_level: string; // low, medium, high
  reliability_score: number; // 0-100
  next_due_date: string;
  avg_payment_delay: number; // days
  monthly_purchases: number; // amount
  insights: string[];
  reorder_qty: string;
  purchase_trend: number[]; // last 6 months
  spending_trend: number[]; // last 6 months
  category: string;
}

interface SupplierLedgerEntry {
  id: number;
  supplier_id: number;
  amount: number; // positive means purchase (increases what we owe), negative means repayment (decreases what we owe)
  date_added: string;
  description: string;
}

type SidebarView = "ledger" | "cfo" | "voice" | "settings" | "expenses" | "cashbook" | "staff" | "reports" | "customers" | "terminal" | "import";
type AssistantState = "idle" | "requesting" | "recording" | "processing";

export default function CreditIntelligenceCenter({ onLogout }: CreditIntelligenceCenterProps) {
  const { language, setLanguage, t } = useLanguage();
  const [merchantId] = useState("merchant_001");
  const [currentView, setCurrentView] = useState<SidebarView>("ledger");
  const [activeLedgerTab, setActiveLedgerTab] = useState<"customers" | "suppliers">("customers");

  // Core Data States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [udharHealth, setUdharHealth] = useState<UdharHealth | null>(null);
  const [loanData, setLoanData] = useState<LoanScoreData | null>(null);
  const [rawUdharEntries, setRawUdharEntries] = useState<UdharEntry[]>([]);
  
  // Loaders & Errors
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [loadingScore, setLoadingScore] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(true);
  
  // Interactive Panel States (Customer)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [filterRisk, setFilterRisk] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("active"); // active, amount, risk

  // --- SUPPLIER STATES ---
  const [suppliers, setSuppliers] = useState<Supplier[]>([
    {
      id: 1,
      name: "Rice Supplier",
      phone: "+917894568956",
      pending_amount: 80000,
      last_purchase_date: "2026-06-04",
      risk_level: "medium",
      reliability_score: 78,
      next_due_date: "2026-06-15",
      avg_payment_delay: 12,
      monthly_purchases: 120000,
      category: "Rice & Grains",
      reorder_qty: "150 kg",
      insights: [
        "You usually purchase rice every 12 days.",
        "Current inventory may last only 5 more days.",
        "Recommended reorder quantity: 150 kg"
      ],
      purchase_trend: [40000, 60000, 50000, 70000, 85000, 80000],
      spending_trend: [45000, 58000, 52000, 68000, 80000, 80000]
    },
    {
      id: 2,
      name: "Tel-Ghee Distributor",
      phone: "+919876543210",
      pending_amount: 35000,
      last_purchase_date: "2026-05-28",
      risk_level: "low",
      reliability_score: 92,
      next_due_date: "2026-06-10",
      avg_payment_delay: 6,
      monthly_purchases: 95000,
      category: "Oil & Dairy",
      reorder_qty: "80 Liters",
      insights: [
        "You purchase oil every 15 days.",
        "Next batch recommended on 10th June.",
        "Recommended reorder quantity: 80 Liters"
      ],
      purchase_trend: [30000, 45000, 38000, 42000, 50000, 35000],
      spending_trend: [30000, 40000, 39000, 41000, 48000, 35000]
    },
    {
      id: 3,
      name: "Masale Vendor",
      phone: "+919988776655",
      pending_amount: 12000,
      last_purchase_date: "2026-05-15",
      risk_level: "high",
      reliability_score: 64,
      next_due_date: "2026-06-08",
      avg_payment_delay: 18,
      monthly_purchases: 30000,
      category: "Spices",
      reorder_qty: "25 kg",
      insights: [
        "Delays in payment to Masale wale have reached 18 days.",
        "Interest penalties may apply if not cleared by 8th June.",
        "Recommended reorder quantity: 25 kg"
      ],
      purchase_trend: [10000, 15000, 12000, 18000, 22000, 12000],
      spending_trend: [8000, 14000, 11000, 19000, 21000, 12000]
    }
  ]);

  const [supplierEntries, setSupplierEntries] = useState<SupplierLedgerEntry[]>([
    { id: 1, supplier_id: 1, amount: 80000, date_added: "2026-06-04", description: "Opening Balance" },
    { id: 2, supplier_id: 2, amount: 35000, date_added: "2026-05-28", description: "Batch purchase" },
    { id: 3, supplier_id: 3, amount: 12000, date_added: "2026-05-15", description: "Spices import" }
  ]);

  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [filterSupplierRisk, setFilterSupplierRisk] = useState<string>("all");
  const [sortSupplierBy, setSortSupplierBy] = useState<string>("amount"); // amount, reliability, date

  // Action triggers
  const [sendingReminderFor, setSendingReminderFor] = useState<string | null>(null);
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  
  // Modals States
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
  const [showLoanDetailsModal, setShowLoanDetailsModal] = useState(false);

  // New Supplier Modals
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showAddSupplierEntryModal, setShowAddSupplierEntryModal] = useState(false);
  
  // Add Customer Form States
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustAmount, setNewCustAmount] = useState("");
  const [newCustType, setNewCustType] = useState<"give" | "got">("give");
  const [newCustDate, setNewCustDate] = useState("");
  const [submittingCustomer, setSubmittingCustomer] = useState(false);

  // Add Supplier Form States
  const [newSuppName, setNewSuppName] = useState("");
  const [newSuppPhone, setNewSuppPhone] = useState("");
  const [newSuppCategory, setNewSuppCategory] = useState("Rice & Grains");
  const [newSuppAmount, setNewSuppAmount] = useState("");
  const [newSuppDate, setNewSuppDate] = useState("");
  const [newSuppRisk, setNewSuppRisk] = useState("low");
  const [submittingSupplier, setSubmittingSupplier] = useState(false);
  
  // Add Transaction Form States
  const [newTxAmount, setNewTxAmount] = useState("");
  const [newTxType, setNewTxType] = useState<"give" | "got">("give");
  const [newTxDate, setNewTxDate] = useState("");
  const [submittingTx, setSubmittingTx] = useState(false);

  // Add Supplier Transaction Form States
  const [newSuppTxAmount, setNewSuppTxAmount] = useState("");
  const [newSuppTxType, setNewSuppTxType] = useState<"give" | "got">("give"); // give = repayment (decreases outstanding), got = purchase (increases outstanding)
  const [newSuppTxDate, setNewSuppTxDate] = useState("");
  const [newSuppTxDesc, setNewSuppTxDesc] = useState("");
  const [submittingSuppTx, setSubmittingSuppTx] = useState(false);
  
  // Reset Data States
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);

  // Global Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Payment AI Insight State (shown after successful payment/transaction)
  const [paymentInsight, setPaymentInsight] = useState<{
    show: boolean;
    customer_name: string;
    visit_count: number;
    total_spent: number;
    relationship_type: string;
    insight_message: string;
    is_milestone: boolean;
  } | null>(null);

  // Voice Assistant States
  const [voiceStatus, setVoiceStatus] = useState<AssistantState>("idle");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceIntent, setVoiceIntent] = useState("");
  const [voiceResponse, setVoiceResponse] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceInputText, setVoiceInputText] = useState("");
  
  // Voice Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingTimeoutRef = useRef<any>(null);
  const permissionTimeoutRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const localTranscriptRef = useRef<string>("");
  const isRecordingCancelledRef = useRef<boolean>(false);
  const activeRequestIdRef = useRef<number>(0);

  // --- API CALLS ---
  
  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const response = await fetch(`/api/customers?merchant_id=${merchantId}`);
      if (!response.ok) throw new Error("Failed to fetch customers list");
      const data = await response.json();
      setCustomers(data);
      
      // Update selected customer if already chosen
      if (selectedCustomer) {
        const updated = data.find((c: Customer) => c.customer_name === selectedCustomer.customer_name);
        if (updated) setSelectedCustomer(updated);
      }
    } catch (err: any) {
      console.error("Failed to load customers:", err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const fetchUdharHealth = async () => {
    setLoadingHealth(true);
    try {
      const response = await fetch(`/api/udhar/health?merchant_id=${merchantId}`);
      if (!response.ok) throw new Error("Failed to fetch ledger health");
      const data = await response.json();
      setUdharHealth(data);
    } catch (err: any) {
      console.error("Failed to load health status:", err);
    } finally {
      setLoadingHealth(false);
    }
  };

  const fetchLoanScore = async () => {
    setLoadingScore(true);
    try {
      const response = await fetch(`/api/loan-score?merchant_id=${merchantId}`);
      if (!response.ok) throw new Error("Failed to fetch loan details");
      const data = await response.json();
      setLoanData(data);
    } catch (err: any) {
      console.error("Failed to load loan data:", err);
    } finally {
      setLoadingScore(false);
    }
  };

  const fetchRawEntries = async () => {
    setLoadingEntries(true);
    try {
      const response = await fetch(`/api/udhar/all?merchant_id=${merchantId}&limit=500`);
      if (!response.ok) throw new Error("Failed to fetch transactions logs");
      const data = await response.json();
      setRawUdharEntries(data.items);
    } catch (err: any) {
      console.error("Failed to load transactions logs:", err);
    } finally {
      setLoadingEntries(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/state/suppliers');
      if (!response.ok) throw new Error("Failed to fetch suppliers");
      const data = await response.json();
      if (data && data.value) {
        setSuppliers(data.value);
        if (selectedSupplier) {
          const updated = data.value.find((s: Supplier) => s.id === selectedSupplier.id);
          if (updated) setSelectedSupplier(updated);
        }
      }
    } catch (err) {
      console.error("Failed to load suppliers:", err);
    }
  };

  const fetchSupplierEntries = async () => {
    try {
      const response = await fetch('/api/state/supplier_entries');
      if (!response.ok) throw new Error("Failed to fetch supplier entries");
      const data = await response.json();
      if (data && data.value) {
        setSupplierEntries(data.value);
      }
    } catch (err) {
      console.error("Failed to load supplier entries:", err);
    }
  };

  const loadAllData = () => {
    fetchCustomers();
    fetchUdharHealth();
    fetchLoanScore();
    fetchRawEntries();
    fetchSuppliers();
    fetchSupplierEntries();
  };

  useEffect(() => {
    loadAllData();
  }, [merchantId]);

  // --- ACTIONS ---

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSavePhone = async () => {
    if (activeLedgerTab === "suppliers" && selectedSupplier) {
      setSavingPhone(true);
      try {
        const updatedSuppliers = suppliers.map(s => s.id === selectedSupplier.id ? { ...s, phone: phoneInput } : s);
        const res = await fetch('/api/state/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: updatedSuppliers })
        });
        if (!res.ok) throw new Error("Failed to save phone number");
        setSelectedSupplier(prev => prev ? { ...prev, phone: phoneInput } : null);
        showToast("success", `Phone updated for ${selectedSupplier.name}`);
        setEditingPhone(false);
        fetchSuppliers();
      } catch (err: any) {
        showToast("error", err.message);
      } finally {
        setSavingPhone(false);
      }
      return;
    }

    if (!selectedCustomer || !phoneInput.trim()) return;
    if (!phoneInput.trim().startsWith("+")) {
      showToast("error", "Number must start with country code, e.g. +919876543210");
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
        throw new Error(e.detail || "Failed to update phone number");
      }
      showToast("success", `Phone number updated for ${selectedCustomer.customer_name}`);
      setEditingPhone(false);
      fetchCustomers();
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setSavingPhone(false);
    }
  };

  const handleSendReminder = async (customerName: string) => {
    setSendingReminderFor(customerName);
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
        showToast("success", `WhatsApp reminder sent to ${customerName}!`);
        fetchCustomers();
        fetchUdharHealth();
      } else {
        throw new Error(data.error || "Sending failed");
      }
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setSendingReminderFor(null);
    }
  };

  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustAmount) {
      showToast("error", "Please provide a name and transaction amount.");
      return;
    }
    setSubmittingCustomer(true);
    try {
      const amt = parseFloat(newCustAmount) * (newCustType === "got" ? -1 : 1);
      const payload: any = {
        merchant_id: merchantId,
        customer_name: newCustName.trim(),
        amount: amt,
      };
      if (newCustPhone.trim()) payload.phone_number = newCustPhone.trim();
      if (newCustDate) payload.date_added = newCustDate;

      const response = await fetch("/api/udhar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Server rejected credit submission");
      
      showToast("success", `Customer ${newCustName} added with initial ledger entry.`);
      setShowAddCustomerModal(false);
      setNewCustName("");
      setNewCustPhone("");
      setNewCustAmount("");
      setNewCustDate("");
      loadAllData();
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setSubmittingCustomer(false);
    }
  };

  const handleAddSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuppName || !newSuppAmount) {
      showToast("error", "Please fill in Name and Initial Outstanding.");
      return;
    }
    setSubmittingSupplier(true);
    try {
      const parsedAmt = parseFloat(newSuppAmount);
      const newSupp: Supplier = {
        id: suppliers.length + 1,
        name: newSuppName.trim(),
        phone: newSuppPhone.trim() || "+917000000000",
        pending_amount: parsedAmt,
        last_purchase_date: newSuppDate || new Date().toISOString().split("T")[0],
        risk_level: newSuppRisk,
        reliability_score: 80,
        next_due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        avg_payment_delay: 10,
        monthly_purchases: parsedAmt,
        category: newSuppCategory,
        reorder_qty: "100 units",
        insights: [
          `New supplier created.`,
          `Initial pending outstanding balance set to ₹${parsedAmt.toLocaleString()}.`
        ],
        purchase_trend: [0, 0, 0, 0, 0, parsedAmt],
        spending_trend: [0, 0, 0, 0, 0, 0]
      };

      const updatedSuppliers = [...suppliers, newSupp];
      const newEntry: SupplierLedgerEntry = {
        id: supplierEntries.length + 1,
        supplier_id: newSupp.id,
        amount: parsedAmt,
        date_added: newSupp.last_purchase_date,
        description: "Opening Balance Outstanding"
      };
      const updatedEntries = [...supplierEntries, newEntry];

      const resSupp = await fetch('/api/state/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: updatedSuppliers })
      });
      if (!resSupp.ok) throw new Error("Failed to save supplier data");

      const resEnt = await fetch('/api/state/supplier_entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: updatedEntries })
      });
      if (!resEnt.ok) throw new Error("Failed to save supplier entries data");

      showToast("success", `Supplier ${newSuppName} added to ledger.`);
      setShowAddSupplierModal(false);
      setNewSuppName("");
      setNewSuppPhone("");
      setNewSuppAmount("");
      setNewSuppDate("");
      loadAllData();
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setSubmittingSupplier(false);
    }
  };

  const handleAddTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !newTxAmount) return;
    
    setSubmittingTx(true);
    try {
      const amt = parseFloat(newTxAmount) * (newTxType === "got" ? -1 : 1);
      const payload: any = {
        merchant_id: merchantId,
        customer_name: selectedCustomer.customer_name,
        amount: amt,
      };
      if (newTxDate) payload.date_added = newTxDate;
      if (selectedCustomer.phone_number) payload.phone_number = selectedCustomer.phone_number;

      const response = await fetch("/api/udhar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Server rejected ledger transaction");

      showToast("success", `Entry of ₹${newTxAmount} saved to ${selectedCustomer.customer_name}'s ledger.`);
      setShowAddTransactionModal(false);
      setNewTxAmount("");
      setNewTxDate("");
      loadAllData();

      // Fetch AI insight after successful transaction
      try {
        const insightRes = await fetch(
          `/api/payment-insight?customer_name=${encodeURIComponent(selectedCustomer.customer_name)}&merchant_id=${merchantId}&payment_amount=${Math.abs(parseFloat(newTxAmount))}`
        );
        if (insightRes.ok) {
          const insightData = await insightRes.json();
          setPaymentInsight({ ...insightData, show: true });
        }
      } catch (e) {
        // Non-fatal
      }

    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setSubmittingTx(false);
    }
  };

  const handleTerminalPaymentSuccess = async (customerName: string, amount: number) => {
    loadAllData();
    try {
      const insightRes = await fetch(
        `/api/payment-insight?customer_name=${encodeURIComponent(customerName)}&merchant_id=${merchantId}&payment_amount=${amount}`
      );
      if (insightRes.ok) {
        const insightData = await insightRes.json();
        setPaymentInsight({ ...insightData, show: true });
      }
    } catch (e) {
      // Non-fatal
    }
  };

  const handleAddSupplierTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || !newSuppTxAmount) return;

    setSubmittingSuppTx(true);
    try {
      const parsedAmt = parseFloat(newSuppTxAmount) * (newSuppTxType === "give" ? -1 : 1); // give = repayment (decreases what we owe), got = purchase (increases what we owe)
      
      const newEntry: SupplierLedgerEntry = {
        id: supplierEntries.length + 1,
        supplier_id: selectedSupplier.id,
        amount: parsedAmt,
        date_added: newSuppTxDate || new Date().toISOString().split("T")[0],
        description: newSuppTxDesc.trim() || (newSuppTxType === "give" ? "Payment Repayment" : "Goods Purchase")
      };

      const updatedEntries = [...supplierEntries, newEntry];
      const updatedSuppliers = suppliers.map(s => {
        if (s.id === selectedSupplier.id) {
          const updatedAmt = s.pending_amount + parsedAmt;
          return {
            ...s,
            pending_amount: updatedAmt,
            last_purchase_date: newSuppTxType === "got" ? (newSuppTxDate || s.last_purchase_date) : s.last_purchase_date
          };
        }
        return s;
      });

      const resSupp = await fetch('/api/state/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: updatedSuppliers })
      });
      if (!resSupp.ok) throw new Error("Failed to save supplier data");

      const resEnt = await fetch('/api/state/supplier_entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: updatedEntries })
      });
      if (!resEnt.ok) throw new Error("Failed to save supplier entries data");

      showToast("success", `Supplier entry of ₹${newSuppTxAmount} saved.`);
      setShowAddSupplierEntryModal(false);
      setNewSuppTxAmount("");
      setNewSuppTxDate("");
      setNewSuppTxDesc("");
      loadAllData();
    } catch (err: any) {
      showToast("error", err.message);
    } finally {
      setSubmittingSuppTx(false);
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm("Are you sure you want to reset the database? This deletes all data and generates fresh 180-day transactions.")) {
      return;
    }
    setResetLoading(true);
    setResetResult(null);
    try {
      const response = await fetch("/api/v1/analytics/reset-demo", { method: "POST" });
      if (!response.ok) throw new Error("Failed to reset demo data");
      const data = await response.json();
      setResetResult(`Successfully seeded ${data.details.transactions_seeded} transactions!`);
      showToast("success", "Demo database reset and seeded successfully.");
      setSelectedCustomer(null);
      setSelectedSupplier(null);
      loadAllData();
    } catch (err: any) {
      setResetResult(`Error: ${err.message}`);
      showToast("error", "Database reset failed.");
    } finally {
      setResetLoading(false);
    }
  };

  // --- LOCAL SPEECH SYNTHESIS FALLBACK ---
  const speakTextLocally = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const hindiVoice = voices.find(v => v.lang.includes("hi-IN") || v.lang.toLowerCase().includes("hi"));
      if (hindiVoice) {
        utterance.voice = hindiVoice;
      } else {
        const indianEnglishVoice = voices.find(v => v.lang.includes("en-IN") || v.lang.toLowerCase().includes("in"));
        if (indianEnglishVoice) utterance.voice = indianEnglishVoice;
      }
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Local SpeechSynthesis failed:", e);
    }
  };

  // --- VOICE CFO ASSISTANT LOGIC ---
  const startVoiceRecording = async (customerPreset?: string) => {
    const requestId = ++activeRequestIdRef.current;
    setVoiceError(null);
    audioChunksRef.current = [];
    setVoiceTranscript("");
    setVoiceIntent("");
    setVoiceResponse("");
    localTranscriptRef.current = "";
    isRecordingCancelledRef.current = false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setVoiceError("Audio recording is not supported in this browser context (requires localhost or HTTPS). You can type your query in the fallback field!");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setVoiceError("MediaRecorder API is not supported in your browser. Use the fallback typing field.");
      return;
    }

    if (permissionTimeoutRef.current) clearTimeout(permissionTimeoutRef.current);
    permissionTimeoutRef.current = setTimeout(() => {
      if (requestId === activeRequestIdRef.current && !streamRef.current) {
        setVoiceError("Microphone access request timed out. Please check permissions.");
        setVoiceStatus("idle");
      }
    }, 5000);

    try {
      setVoiceStatus("requesting");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      if (permissionTimeoutRef.current) {
        clearTimeout(permissionTimeoutRef.current);
        permissionTimeoutRef.current = null;
      }

      if (isRecordingCancelledRef.current || requestId !== activeRequestIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
        mimeType = "audio/ogg";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      } else {
        mimeType = "";
      }

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        setTimeout(async () => {
          if (requestId !== activeRequestIdRef.current) return;
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || "audio/webm" });
          await sendAudioToVoiceBackend(audioBlob, requestId, customerPreset);
        }, 250);
      };

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = false;
          recognition.lang = 'hi-IN';
          
          recognition.onresult = (event: any) => {
            const results = event.results;
            let final = "";
            for (let i = event.resultIndex; i < results.length; i++) {
              if (results[i].isFinal) final += results[i][0].transcript + " ";
            }
            if (final) {
              localTranscriptRef.current = (localTranscriptRef.current + " " + final).trim();
            }
          };

          recognitionRef.current = recognition;
          recognition.start();
        } catch (e) {
          console.warn("SpeechRecognition start failed:", e);
        }
      }

      mediaRecorder.start();
      setVoiceStatus("recording");

      if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = setTimeout(() => {
        if (requestId === activeRequestIdRef.current) stopVoiceRecording();
      }, 15000);

    } catch (err: any) {
      if (permissionTimeoutRef.current) {
        clearTimeout(permissionTimeoutRef.current);
        permissionTimeoutRef.current = null;
      }
      if (requestId === activeRequestIdRef.current) {
        setVoiceError(err.name === "NotAllowedError" ? "Microphone permission denied." : err.message);
        setVoiceStatus("idle");
      }
    }
  };

  const stopVoiceRecording = () => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }

    let isStopping = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
        isStopping = true;
      } catch (e) {}
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }

    setVoiceStatus(isStopping ? "processing" : "idle");
  };

  const cancelVoiceRecording = () => {
    isRecordingCancelledRef.current = true;
    ++activeRequestIdRef.current;

    if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
    if (permissionTimeoutRef.current) clearTimeout(permissionTimeoutRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    
    setVoiceStatus("idle");
    setVoiceError("Recording cancelled.");
  };

  const sendAudioToVoiceBackend = async (blob: Blob, requestId: number, customerPreset?: string) => {
    setVoiceStatus("processing");
    try {
      const formData = new FormData();
      formData.append("file", blob, "recording.webm");
      if (localTranscriptRef.current) {
        formData.append("local_transcript", localTranscriptRef.current);
      }
      if (customerPreset && localTranscriptRef.current) {
        formData.set("local_transcript", `${customerPreset} ${localTranscriptRef.current}`);
      }

      const res = await fetch("/api/voice", {
        method: "POST",
        body: formData,
      });

      if (requestId !== activeRequestIdRef.current) return;

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Voice engine failed to parse request.");
      }

      const data = await res.json();
      setVoiceTranscript(data.transcript || localTranscriptRef.current);
      setVoiceIntent(data.intent);
      setVoiceResponse(data.response_text);
      speakTextLocally(data.response_text);

      loadAllData();
      showToast("success", `AI Voice input processed: ${data.intent}`);
    } catch (err: any) {
      if (requestId !== activeRequestIdRef.current) return;
      setVoiceError(err.message);
    } finally {
      if (requestId === activeRequestIdRef.current) setVoiceStatus("idle");
    }
  };

  const handleTextSubmit = async (text: string, customerPreset?: string) => {
    // Check if the query is a supplier voice command example: "Chawal wale supplier ko kitna dena hai?"
    if (activeLedgerTab === "suppliers" || text.toLowerCase().includes("supplier") || text.toLowerCase().includes("chawal wale")) {
      const requestId = ++activeRequestIdRef.current;
      setVoiceStatus("processing");
      setTimeout(() => {
        if (requestId !== activeRequestIdRef.current) return;
        
        let targetSupp = selectedSupplier || suppliers[0]; // Rice Supplier
        if (text.toLowerCase().includes("tel") || text.toLowerCase().includes("ghee") || text.toLowerCase().includes("distributor")) {
          targetSupp = suppliers[1]; // Tel-Ghee
        } else if (text.toLowerCase().includes("masale") || text.toLowerCase().includes("spices") || text.toLowerCase().includes("vendor")) {
          targetSupp = suppliers[2]; // Masale
        }

        setVoiceTranscript(text);
        setVoiceIntent("supplier_query");
        const resp = `Aapko ${targetSupp.name} ko ₹${targetSupp.pending_amount.toLocaleString("en-IN")} dene hain.`;
        setVoiceResponse(resp);
        speakTextLocally(resp);
        setVoiceStatus("idle");
        showToast("success", "AI Command processed successfully.");
      }, 500);
      return;
    }

    const requestId = ++activeRequestIdRef.current;
    setVoiceStatus("processing");
    setVoiceError(null);
    setVoiceTranscript("");
    setVoiceIntent("");
    setVoiceResponse("");

    try {
      const formData = new FormData();
      const finalQuery = customerPreset ? `${customerPreset} ko ${text}` : text;
      formData.append("mock_text", finalQuery);

      const res = await fetch("/api/voice", {
        method: "POST",
        body: formData,
      });

      if (requestId !== activeRequestIdRef.current) return;

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Server rejected request.");
      }

      const data = await res.json();
      setVoiceTranscript(data.transcript);
      setVoiceIntent(data.intent);
      setVoiceResponse(data.response_text);
      speakTextLocally(data.response_text);
      
      loadAllData();
      showToast("success", "AI Command processed successfully.");
    } catch (err: any) {
      if (requestId !== activeRequestIdRef.current) return;
      setVoiceError(err.message);
    } finally {
      if (requestId === activeRequestIdRef.current) setVoiceStatus("idle");
    }
  };

  const handleMicClick = (customerPreset?: string) => {
    if (voiceStatus === "idle") {
      startVoiceRecording(customerPreset);
    } else if (voiceStatus === "recording") {
      stopVoiceRecording();
    } else {
      cancelVoiceRecording();
    }
  };

  // --- DERIVED CALCULATIONS ---
  
  const customerList = customers.filter((c) => {
    const matchesSearch = c.customer_name.toLowerCase().includes(customerSearch.toLowerCase()) || 
      (c.phone_number && c.phone_number.includes(customerSearch));
    const matchesRisk = filterRisk === "all" || c.risk_level === filterRisk;
    return matchesSearch && matchesRisk;
  }).sort((a, b) => {
    if (sortBy === "amount") return b.pending_amount - a.pending_amount;
    if (sortBy === "risk") return b.risk_score - a.risk_score;
    return b.days_pending - a.days_pending;
  });

  const totalOutstanding = customers.reduce((sum, c) => sum + (c.pending_amount > 0 ? c.pending_amount : 0), 0);
  const totalYouGive = customers.reduce((sum, c) => sum + (c.pending_amount < 0 ? Math.abs(c.pending_amount) : 0), 0);

  const selectedCustomerTx = rawUdharEntries.filter(
    (tx) => selectedCustomer && tx.customer_name.toLowerCase() === selectedCustomer.customer_name.toLowerCase()
  ).sort((a, b) => new Date(b.date_added).getTime() - new Date(a.date_added).getTime());

  // --- DERIVED SUPPLIER CALCULATIONS ---
  const supplierList = suppliers.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(supplierSearch.toLowerCase()) || s.phone.includes(supplierSearch);
    const matchesRisk = filterSupplierRisk === "all" || s.risk_level === filterSupplierRisk;
    return matchesSearch && matchesRisk;
  }).sort((a, b) => {
    if (sortSupplierBy === "reliability") return b.reliability_score - a.reliability_score;
    if (sortSupplierBy === "date") return new Date(b.last_purchase_date).getTime() - new Date(a.last_purchase_date).getTime();
    return b.pending_amount - a.pending_amount; // default amount
  });

  const totalSupplierOutstanding = suppliers.reduce((sum, s) => sum + s.pending_amount, 0);
  const avgSupplierReliability = Math.round(suppliers.reduce((sum, s) => sum + s.reliability_score, 0) / suppliers.length);
  const avgSupplierPaymentDelay = Math.round(suppliers.reduce((sum, s) => sum + s.avg_payment_delay, 0) / suppliers.length);
  const totalMonthlyPurchases = suppliers.reduce((sum, s) => sum + s.monthly_purchases, 0);

  const selectedSupplierTx = supplierEntries.filter(
    (entry) => selectedSupplier && entry.supplier_id === selectedSupplier.id
  ).sort((a, b) => new Date(b.date_added).getTime() - new Date(a.date_added).getTime());

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8F9FB] text-[#111827] font-['Inter',sans-serif] select-none">
      
      {/* ============================================================== */}
      {/* 1. LEFT SIDEBAR                                               */}
      {/* ============================================================== */}
      <div className="w-[280px] h-full bg-[#081A38] text-white flex flex-col justify-between shrink-0 relative z-30">
        
        {/* Top Branding Section */}
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00BAF2] to-[#00C853] flex items-center justify-center shadow-lg shadow-[#00BAF2]/10">
              <svg className="w-5.5 h-5.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight block">{t("app_title")}</span>
              <span className="text-[10px] uppercase tracking-widest text-[#00BAF2] font-extrabold -mt-1 block">{t("sub_title")}</span>
            </div>
          </div>

          {/* Business Profile Card */}
          <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00BAF2]/20 border border-[#00BAF2]/30 flex items-center justify-center font-bold text-[#00BAF2] text-sm shrink-0">
                RK
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-white truncate">Ramesh Kirana Store</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00C853] animate-pulse"></span>
                  <span className="text-[9px] text-white/50 font-semibold uppercase tracking-wider">Online</span>
                </div>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-white/40 shrink-0" />
          </div>

          {/* Language Selector Dropdown */}
          <div className="mt-4 px-1">
            <label className="text-[9px] font-extrabold text-white/30 uppercase tracking-widest block mb-1.5">
              Select Language / भाषा
            </label>
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-white shadow-sm outline-none cursor-pointer hover:bg-white/10 transition-all focus:border-[#00BAF2]"
              >
                <option value="en" className="bg-[#081A38] text-white">🇬🇧 English</option>
                <option value="hinglish" className="bg-[#081A38] text-white">🇮🇳 Hinglish</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <div className="flex-1 px-4 py-2 space-y-6 overflow-y-auto">
          <div>
            <span className="px-3 text-[9px] font-extrabold text-white/30 uppercase tracking-widest block mb-3">
              {t("mgmt_header")}
            </span>
            <nav className="space-y-1.5">
              <button
                onClick={() => { setCurrentView("ledger"); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentView === "ledger"
                    ? "bg-[#00BAF2] text-white shadow-md shadow-[#00BAF2]/25"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4.5 h-4.5" />
                  <span>{t("ledgers")}</span>
                </div>
              </button>

              <button
                onClick={() => setCurrentView("cfo")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentView === "cfo"
                    ? "bg-[#00BAF2] text-white shadow-md shadow-[#00BAF2]/25"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <LayoutDashboard className="w-4.5 h-4.5" />
                <span>{t("cfo")}</span>
              </button>

              <button
                onClick={() => setCurrentView("voice")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentView === "voice"
                    ? "bg-[#00BAF2] text-white shadow-md shadow-[#00BAF2]/25"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Mic className="w-4.5 h-4.5" />
                <span>{t("voice")}</span>
              </button>

              <button
                onClick={() => setCurrentView("expenses")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentView === "expenses"
                    ? "bg-[#00BAF2] text-white shadow-md shadow-[#00BAF2]/25"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-4.5 h-4.5" />
                  <span>{t("expenses")}</span>
                </div>
                <span className="bg-[#D32F2F] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">AI</span>
              </button>

              <button
                onClick={() => setCurrentView("cashbook")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentView === "cashbook"
                    ? "bg-[#00BAF2] text-white shadow-md shadow-[#00BAF2]/25"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Wallet className="w-4.5 h-4.5" />
                  <span>{t("cashbook")}</span>
                </div>
                <span className="bg-[#00C853] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">LIVE</span>
              </button>

              <button
                onClick={() => setCurrentView("staff")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentView === "staff"
                    ? "bg-[#00BAF2] text-white shadow-md shadow-[#00BAF2]/25"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <SlidersHorizontal className="w-4.5 h-4.5" />
                  <span>{t("staff")}</span>
                </div>
                <span className="bg-[#FF9100] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">ERP</span>
              </button>

              <button
                onClick={() => setCurrentView("reports")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentView === "reports"
                    ? "bg-[#00BAF2] text-white shadow-md shadow-[#00BAF2]/25"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <LineChart className="w-4.5 h-4.5" />
                  <span>{t("reports")}</span>
                </div>
                <span className="bg-[#D32F2F] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">AI</span>
              </button>

              <button
                onClick={() => setCurrentView("customers")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentView === "customers"
                    ? "bg-[#00BAF2] text-white shadow-md shadow-[#00BAF2]/25"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">🧠</span>
                  <span>{t("customers_intel")}</span>
                </div>
                <span className="bg-[#7c3aed] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">NEW</span>
              </button>

              <button
                onClick={() => setCurrentView("terminal")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentView === "terminal"
                    ? "bg-[#00BAF2] text-white shadow-md shadow-[#00BAF2]/25"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <QrCode className="w-4.5 h-4.5" />
                  <span>{t("terminal")}</span>
                </div>
                <span className="bg-[#e11d48] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">QR</span>
              </button>

              <button
                onClick={() => setCurrentView("import")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentView === "import"
                    ? "bg-[#00BAF2] text-white shadow-md shadow-[#00BAF2]/25"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">📥</span>
                  <span>{t("import_hub")}</span>
                </div>
                <span className="bg-[#00BAF2] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">NEW</span>
              </button>
            </nav>
          </div>

          <div>
            <span className="px-3 text-[9px] font-extrabold text-white/30 uppercase tracking-widest block mb-3">
              {t("settings_header")}
            </span>
            <nav className="space-y-1.5">
              <button
                onClick={() => setCurrentView("settings")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentView === "settings"
                    ? "bg-[#00BAF2] text-white shadow-md shadow-[#00BAF2]/25"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Settings className="w-4.5 h-4.5" />
                <span>{t("settings")}</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Footer Area */}
        <div className="p-6 border-t border-white/5 flex items-center justify-between text-[10px] text-white/40 font-semibold">
          <span>Version 1.4.0</span>
          {onLogout && (
            <button onClick={onLogout} className="hover:text-white transition-colors cursor-pointer">
              {t("logout")}
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. CENTER COLUMN                                              */}
      {/* ============================================================== */}
      <div className="flex-1 h-full flex flex-col border-r border-[#E5E7EB] bg-white relative z-20 overflow-hidden">
        
        {/* Toggle between views based on Sidebar */}
        <AnimatePresence mode="wait">
          
          {/* VIEW: LEDGERS */}
          {currentView === "ledger" && (
            <motion.div
              key="ledger"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1 flex flex-col h-full overflow-hidden"
            >
              {/* Center Column Header / Tabs */}
              <div className="px-6 pt-6 pb-4 border-b border-[#E5E7EB] shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold tracking-tight text-[#002970]">
                    {activeLedgerTab === "customers" ? t("cust_intel_title") : "Supplier Intelligence Center"}
                  </h2>
                  
                  {/* Tabs */}
                  <div className="bg-[#EEF3F7] p-1 rounded-xl flex gap-1 text-[11px] font-extrabold text-[#6B7280]">
                    <button
                      onClick={() => {
                        setActiveLedgerTab("customers");
                        setSelectedCustomer(null);
                        setSelectedSupplier(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                        activeLedgerTab === "customers" ? "bg-white text-[#002970] shadow-sm" : "hover:text-[#002970]"
                      }`}
                    >
                      Customers
                    </button>
                    <button
                      onClick={() => {
                        setActiveLedgerTab("suppliers");
                        setSelectedCustomer(null);
                        setSelectedSupplier(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                        activeLedgerTab === "suppliers" ? "bg-white text-[#002970] shadow-sm" : "hover:text-[#002970]"
                      }`}
                    >
                      Suppliers
                    </button>
                  </div>
                </div>

                {/* Ledger Summary Cards - CUSTOMER TAB */}
                {activeLedgerTab === "customers" ? (
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl p-4 flex items-center justify-between shadow-sm">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B7280]">{t("you_give")}</span>
                        <h3 className="text-lg font-black text-[#00C853] mt-1">₹{Math.round(totalYouGive).toLocaleString("en-IN")}</h3>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-[#00C853]/10 flex items-center justify-center shrink-0">
                        <ArrowUpRight className="w-4 h-4 text-[#00C853]" />
                      </div>
                    </div>

                    <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl p-4 flex items-center justify-between shadow-sm">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B7280]">{t("you_get")}</span>
                        <h3 className="text-lg font-black text-[#D32F2F] mt-1">₹{Math.round(totalOutstanding).toLocaleString("en-IN")}</h3>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-[#D32F2F]/10 flex items-center justify-center shrink-0">
                        <ArrowDownLeft className="w-4 h-4 text-[#D32F2F]" />
                      </div>
                    </div>

                    <div 
                      onClick={() => setShowLoanDetailsModal(true)}
                      className="bg-[#081A38] text-white rounded-2xl p-4 flex items-center justify-between shadow-lg cursor-pointer hover:bg-[#002970] transition-colors"
                    >
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/50">{t("cfo_loan_rating")}</span>
                        <h3 className="text-lg font-black text-[#00BAF2] mt-1 flex items-center gap-1.5">
                          {loadingScore ? (
                            <span className="text-xs text-white/50 font-normal">{t("calculating")}</span>
                          ) : (
                            <>
                              <span>{loanData?.label || "Good"}</span>
                              <span className="text-xs bg-[#00BAF2]/20 border border-[#00BAF2]/30 px-1.5 py-0.5 rounded text-white font-bold">
                                {loanData?.score || 720}
                              </span>
                            </>
                          )}
                        </h3>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                        <Award className="w-4 h-4 text-[#00BAF2]" />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Ledger Summary Cards - SUPPLIER TAB (Top Metrics) */
                  <div className="grid grid-cols-4 gap-3 mt-6">
                    <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl p-3.5 shadow-sm text-left">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#6B7280]">{t("total_outstanding")}</span>
                      <h3 className="text-base font-black text-[#00C853] mt-1">₹{totalSupplierOutstanding.toLocaleString("en-IN")}</h3>
                    </div>

                    <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl p-3.5 shadow-sm text-left">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#6B7280]">{t("monthly_purchases")}</span>
                      <h3 className="text-base font-black text-[#002970] mt-1">₹{totalMonthlyPurchases.toLocaleString("en-IN")}</h3>
                    </div>

                    <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl p-3.5 shadow-sm text-left">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#6B7280]">{t("avg_payment_delay")}</span>
                      <h3 className="text-base font-black text-[#f59e0b] mt-1">{avgSupplierPaymentDelay} Days</h3>
                    </div>

                    <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl p-3.5 shadow-sm text-left">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#6B7280]">{t("reliability_score")}</span>
                      <h3 className="text-base font-black text-[#00BAF2] mt-1">{avgSupplierReliability} / 100</h3>
                    </div>
                  </div>
                )}
              </div>

              {/* Filters & Search section - CUSTOMERS */}
              {activeLedgerTab === "customers" ? (
                <div className="px-6 py-4 border-b border-[#E5E7EB] bg-[#F8F9FB] shrink-0 flex items-center gap-4">
                  <div className="flex-1 bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 flex items-center gap-2 shadow-sm">
                    <Search className="w-4 h-4 text-[#6B7280]" />
                    <input
                      type="text"
                      placeholder={t("search_placeholder")}
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="w-full text-xs font-semibold text-[#111827] outline-none placeholder-[#A0AEC0]"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-[#6B7280]" />
                    <select
                      value={filterRisk}
                      onChange={(e) => setFilterRisk(e.target.value)}
                      className="bg-white border border-[#E5E7EB] rounded-xl px-2.5 py-2 text-xs font-bold text-[#002970] shadow-sm outline-none cursor-pointer"
                    >
                      <option value="all">{t("all_risks")}</option>
                      <option value="low">{t("low_risk")}</option>
                      <option value="medium">{t("medium_risk")}</option>
                      <option value="high">{t("high_risk")}</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#6B7280]" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-white border border-[#E5E7EB] rounded-xl px-2.5 py-2 text-xs font-bold text-[#002970] shadow-sm outline-none cursor-pointer"
                    >
                      <option value="active">{t("sort_days")}</option>
                      <option value="amount">{t("sort_outstanding")}</option>
                      <option value="risk">{t("sort_risk")}</option>
                    </select>
                  </div>
                </div>
              ) : (
                /* Filters & Search section - SUPPLIERS */
                <div className="px-6 py-4 border-b border-[#E5E7EB] bg-[#F8F9FB] shrink-0 flex items-center gap-4">
                  <div className="flex-1 bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 flex items-center gap-2 shadow-sm">
                    <Search className="w-4 h-4 text-[#6B7280]" />
                    <input
                      type="text"
                      placeholder="Search suppliers..."
                      value={supplierSearch}
                      onChange={(e) => setSupplierSearch(e.target.value)}
                      className="w-full text-xs font-semibold text-[#111827] outline-none placeholder-[#A0AEC0]"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-[#6B7280]" />
                    <select
                      value={filterSupplierRisk}
                      onChange={(e) => setFilterSupplierRisk(e.target.value)}
                      className="bg-white border border-[#E5E7EB] rounded-xl px-2.5 py-2 text-xs font-bold text-[#002970] shadow-sm outline-none cursor-pointer"
                    >
                      <option value="all">All Risks</option>
                      <option value="low">Low Risk</option>
                      <option value="medium">Medium Risk</option>
                      <option value="high">High Risk</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#6B7280]" />
                    <select
                      value={sortSupplierBy}
                      onChange={(e) => setSortSupplierBy(e.target.value)}
                      className="bg-white border border-[#E5E7EB] rounded-xl px-2.5 py-2 text-xs font-bold text-[#002970] shadow-sm outline-none cursor-pointer"
                    >
                      <option value="amount">Sort: Outstanding</option>
                      <option value="reliability">Sort: Reliability</option>
                      <option value="date">Sort: Last Purchase</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Scrollable Customer/Supplier List */}
              <div className="flex-1 overflow-y-auto divide-y divide-[#E5E7EB]">
                {activeLedgerTab === "customers" ? (
                  /* CUSTOMER LIST */
                  loadingCustomers ? (
                    <div className="py-16 flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-4 border-[#00BAF2]/20 border-t-[#00BAF2] rounded-full animate-spin"></div>
                      <span className="text-xs text-[#6B7280] font-semibold">Loading ledger accounts...</span>
                    </div>
                  ) : customerList.length > 0 ? (
                    customerList.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setSelectedSupplier(null);
                          setEditingPhone(false);
                          setPhoneInput(c.phone_number || "");
                        }}
                        className={`p-5 flex items-center justify-between hover:bg-[#F8F9FB] transition-all cursor-pointer border-l-4 ${
                          selectedCustomer?.customer_name === c.customer_name
                            ? "bg-[#EEF3F7] border-l-[#00BAF2]"
                            : "border-l-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border uppercase bg-slate-100 text-[#002970]`}>
                            {c.customer_name.substring(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-[#002970] text-sm truncate">{c.customer_name}</span>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wide border ${
                                c.relationship_type === "loyal" ? "bg-[#00C853]/10 border-[#00C853]/20 text-[#00C853]" :
                                c.relationship_type === "risky" ? "bg-[#D32F2F]/10 border-[#D32F2F]/20 text-[#D32F2F]" :
                                "bg-[#6B7280]/10 border-[#6B7280]/20 text-[#6B7280]"
                              }`}>
                                {c.relationship_type}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-[11px] font-semibold text-[#6B7280]">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {c.days_pending} days pending
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Shield className="w-3.5 h-3.5" />
                                Risk: {c.risk_score}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`text-base font-black ${
                            c.pending_amount < 0 ? "text-[#00C853]" : "text-[#D32F2F]"
                          }`}>
                            {c.pending_amount < 0 ? "-" : ""}₹{Math.abs(Math.round(c.pending_amount)).toLocaleString("en-IN")}
                          </span>
                          <span className={`block text-[9px] font-extrabold uppercase tracking-wider mt-0.5 ${
                            c.pending_amount < 0 ? "text-[#00C853]" : "text-[#D32F2F]"
                          }`}>
                            {c.pending_amount < 0 ? "You'll Give" : "You'll Get"}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-20 flex flex-col items-center justify-center text-center px-6">
                      <FolderOpen className="w-12 h-12 text-[#6B7280]/30 mb-3" />
                      <h4 className="text-sm font-bold text-[#002970]">No customers found</h4>
                      <p className="text-xs text-[#6B7280] mt-1">Try another name or check filters.</p>
                    </div>
                  )
                ) : (
                  /* SUPPLIER LIST */
                  supplierList.length > 0 ? (
                    supplierList.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          setSelectedSupplier(s);
                          setSelectedCustomer(null);
                          setEditingPhone(false);
                          setPhoneInput(s.phone);
                        }}
                        className={`p-5 flex items-center justify-between hover:bg-[#F8F9FB] transition-all cursor-pointer border-l-4 ${
                          selectedSupplier?.id === s.id
                            ? "bg-[#EEF3F7] border-l-[#00C853]"
                            : "border-l-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border uppercase bg-slate-100 text-[#00C853]`}>
                            {s.name.substring(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-[#002970] text-sm truncate">{s.name}</span>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wide border ${
                                s.risk_level === "low" ? "bg-[#00C853]/10 border-[#00C853]/20 text-[#00C853]" :
                                s.risk_level === "high" ? "bg-[#D32F2F]/10 border-[#D32F2F]/20 text-[#D32F2F]" :
                                "bg-[#f59e0b]/10 border-[#f59e0b]/20 text-[#f59e0b]"
                              }`}>
                                {s.risk_level} Risk
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-[11px] font-semibold text-[#6B7280]">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                Last purchase: {s.last_purchase_date}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Shield className="w-3.5 h-3.5" />
                                Reliability: {s.reliability_score}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-base font-black text-[#00C853]">
                            ₹{s.pending_amount.toLocaleString("en-IN")}
                          </span>
                          <span className="block text-[9px] font-extrabold uppercase tracking-wider text-[#00C853] mt-0.5">
                            You'll Give
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-20 flex flex-col items-center justify-center text-center px-6">
                      <FolderOpen className="w-12 h-12 text-[#6B7280]/30 mb-3" />
                      <h4 className="text-sm font-bold text-[#002970]">No suppliers found</h4>
                      <p className="text-xs text-[#6B7280] mt-1">Try another search name.</p>
                    </div>
                  )
                )}
              </div>

              {/* Bottom Buttons Bar */}
              <div className="p-4 border-t border-[#E5E7EB] bg-[#F8F9FB] shrink-0 flex gap-3">
                {activeLedgerTab === "customers" ? (
                  <>
                    <button
                      onClick={() => setShowAddCustomerModal(true)}
                      className="flex-1 bg-[#00BAF2] hover:bg-[#009FD0] text-white font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#00BAF2]/10"
                    >
                      <Plus className="w-4.5 h-4.5" />
                      <span>{t("add_customer")}</span>
                    </button>
                    <button
                      onClick={() => showToast("success", "Tally & Vyapar customer ledger synchronized successfully.")}
                      className="flex-1 border-2 border-[#E5E7EB] hover:bg-white text-[#002970] font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                    >
                      <RefreshCw className="w-4.5 h-4.5" />
                      <span>{t("sync_ledger")}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setShowAddSupplierModal(true)}
                      className="flex-1 bg-[#00C853] hover:bg-[#00B24A] text-white font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#00C853]/10"
                    >
                      <Plus className="w-4.5 h-4.5" />
                      <span>{t("add_supplier")}</span>
                    </button>
                    <button
                      onClick={() => showToast("success", "Tally & Vyapar supplier database synchronized successfully.")}
                      className="flex-1 border-2 border-[#E5E7EB] hover:bg-white text-[#002970] font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                    >
                      <RefreshCw className="w-4.5 h-4.5" />
                      <span>{t("sync_ledger")}</span>
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* VIEW: CFO DASHBOARD */}
          {currentView === "cfo" && (
            <motion.div
              key="cfo"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1 p-6 overflow-y-auto space-y-6"
            >
              <div className="border-b border-[#E5E7EB] pb-4">
                <h2 className="text-2xl font-black text-[#002970]">AI CFO Loan Diagnostics</h2>
                <p className="text-xs text-[#6B7280] font-medium mt-1">Detailed evaluation of store revenue logs, payment recovery rates, and credit capacity.</p>
              </div>

              {loadingScore ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-4 border-[#00BAF2]/20 border-t-[#00BAF2] rounded-full animate-spin"></div>
                  <span className="text-xs text-[#6B7280]">Calculating analytics...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 bg-[#F8F9FB] border border-[#E5E7EB] rounded-3xl p-6 shadow-sm space-y-6">
                    <h3 className="text-sm font-extrabold uppercase tracking-widest text-[#002970]">Credit Matrix Breakdown</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center text-xs font-bold text-[#002970] mb-1.5">
                          <span>Revenue Turnover Consistency</span>
                          <span>{loanData?.breakdown.revenue_score} / 100</span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-[#00BAF2]" style={{ width: `${loanData?.breakdown.revenue_score || 80}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center text-xs font-bold text-[#002970] mb-1.5">
                          <span>Ledger Repayment Consistency</span>
                          <span>{loanData?.breakdown.consistency_score} / 100</span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-[#00C853]" style={{ width: `${loanData?.breakdown.consistency_score || 70}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center text-xs font-bold text-[#002970] mb-1.5">
                          <span>Store Growth Velocity</span>
                          <span>{loanData?.breakdown.growth_score} / 100</span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-[#00BAF2]" style={{ width: `${loanData?.breakdown.growth_score || 75}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-white border border-[#E5E7EB] rounded-2xl">
                      <span className="text-[10px] font-extrabold uppercase text-[#6B7280]">AI Assessment Reason</span>
                      <p className="text-xs font-semibold text-[#002970] mt-2 leading-relaxed italic">"{loanData?.reason}"</p>
                    </div>
                  </div>

                  <div className="md:col-span-1 bg-[#081A38] text-white rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#00BAF2]">Eligible Loan Capital</span>
                      <h2 className="text-2xl font-black mt-2 text-[#00BAF2]">
                        ₹{(loanData?.estimated_amount || 250000).toLocaleString("en-IN")}
                      </h2>
                      <p className="text-white/60 text-xs mt-3 leading-relaxed">
                        Pre-approved credit line limit calculated automatically based on your daily cashflow variance and transaction records.
                      </p>
                    </div>
                    
                    <div className="mt-8 border-t border-white/5 pt-4">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-white/40">Interest Rate</span>
                        <span className="font-extrabold text-[#00C853]">12.5% p.a.</span>
                      </div>
                      <div className="flex justify-between items-center text-xs mt-2">
                        <span className="text-white/40">Repayment Period</span>
                        <span className="font-extrabold text-white">12 Months</span>
                      </div>
                      <button 
                        onClick={() => showToast("success", "Loan application submitted! Our team will contact you shortly.")}
                        className="w-full mt-6 bg-[#00BAF2] hover:bg-[#009FD0] text-white font-extrabold text-xs py-3 rounded-xl transition-all cursor-pointer text-center"
                      >
                        Apply Capital Now
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* VIEW: VOICE CFO CONSOLE */}
          {currentView === "voice" && (
            <motion.div
              key="voice"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1 p-6 overflow-y-auto space-y-6 flex flex-col h-full"
            >
              <div className="border-b border-[#E5E7EB] pb-4 shrink-0">
                <h2 className="text-2xl font-black text-[#002970]">Voice CFO Assistant</h2>
                <p className="text-xs text-[#6B7280] font-medium mt-1">Talk to AI Munshi in Hindi or Hinglish. Add ledger transactions, verify cash flow balance, or trigger collections.</p>
              </div>

              <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center flex-1 max-w-xl mx-auto w-full gap-6">
                <div className="relative">
                  {voiceStatus === "recording" && (
                    <div className="absolute -inset-4 rounded-full bg-rose-500/20 animate-ping" />
                  )}
                  <button
                    onClick={() => handleMicClick()}
                    className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl cursor-pointer ${
                      voiceStatus === "recording"
                        ? "bg-[#D32F2F] text-white shadow-[#D32F2F]/20 border-2 border-rose-300"
                        : voiceStatus === "processing"
                        ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                        : "bg-[#00BAF2] text-white shadow-[#00BAF2]/20 hover:scale-105 active:scale-95"
                    }`}
                  >
                    {voiceStatus === "processing" ? (
                      <RefreshCw className="w-12 h-12 animate-spin" />
                    ) : (
                      <Mic className="w-12 h-12" />
                    )}
                  </button>
                </div>

                <div className="text-center">
                  <span className={`text-sm font-extrabold uppercase tracking-widest ${
                    voiceStatus === "recording" ? "text-rose-600 animate-pulse" : "text-[#002970]"
                  }`}>
                    {voiceStatus === "recording" ? "Listening to audio..." : voiceStatus === "processing" ? "Parsing speech..." : "Tap to speak"}
                  </span>
                  <p className="text-xs text-[#6B7280] mt-2 max-w-[280px]">
                    Try: *"Priya ko 500 rupay udhaar"* or *"Mera aaj ka business kitna hai?"*
                  </p>
                </div>

                {voiceError && (
                  <p className="text-xs text-[#D32F2F] font-semibold bg-rose-50 border border-rose-100 px-4 py-2.5 rounded-xl">
                    ⚠️ {voiceError}
                  </p>
                )}

                <div className="w-full border-t border-[#E5E7EB] pt-6 mt-4">
                  <label className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">Or type command</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Ramesh ko ₹200 udhaar..."
                      value={voiceInputText}
                      onChange={(e) => setVoiceInputText(e.target.value)}
                      className="flex-1 bg-white border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-xs outline-none focus:border-[#00BAF2] shadow-sm font-semibold"
                    />
                    <button
                      onClick={() => {
                        if (voiceInputText.trim()) {
                          handleTextSubmit(voiceInputText.trim());
                          setVoiceInputText("");
                        }
                      }}
                      className="bg-[#00BAF2] hover:bg-[#009FD0] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer active:scale-95"
                    >
                      Send
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {voiceTranscript && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full space-y-4 text-left border-t border-[#E5E7EB] pt-6 mt-2"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-extrabold text-[#6B7280] uppercase tracking-wider block">Speech Transcript</span>
                          <p className="text-xs font-bold text-[#002970] italic mt-1">"{voiceTranscript}"</p>
                        </div>
                        {voiceIntent && (
                          <span className="bg-[#00BAF2]/15 border border-[#00BAF2]/30 text-[#00BAF2] text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-lg tracking-wider">
                            Intent: {voiceIntent}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-[9px] font-extrabold text-[#6B7280] uppercase tracking-wider block">AI Response</span>
                        <div className="bg-[#EEF3F7] border border-[#E5E7EB] p-4 rounded-xl text-xs font-semibold text-[#002970] mt-1.5 leading-relaxed">
                          "{voiceResponse}"
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* VIEW: SETTINGS / RESET DATA */}
          {currentView === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1 p-6 overflow-y-auto space-y-6"
            >
              <div className="border-b border-[#E5E7EB] pb-4">
                <h2 className="text-2xl font-black text-[#002970]">System Seeders & Tools</h2>
                <p className="text-xs text-[#6B7280] font-medium mt-1">Manage system databases, reset transactions, and simulate live environments.</p>
              </div>

              <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-3xl p-8 max-w-xl shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-extrabold text-[#002970]">Reset Store Data</h3>
                  <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">
                    This triggers a clean wipe of the database. It recreates default schemas and generates a mock history of 180 days containing daily credit, sales, and repayment records.
                  </p>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={handleResetDemo}
                    disabled={resetLoading}
                    className="w-full bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-extrabold text-xs py-3.5 rounded-xl transition-all cursor-pointer active:scale-95 disabled:opacity-40 shadow-md shadow-rose-600/15"
                  >
                    {resetLoading ? "Purging & Seeding Database..." : "Purge & Reset Demo Database"}
                  </button>
                  
                  {resetResult && (
                    <div className="p-4 bg-white border border-[#E5E7EB] rounded-2xl text-xs font-semibold text-[#002970]">
                      📊 {resetResult}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* VIEW: EXPENSE INTELLIGENCE */}
          {currentView === "expenses" && (
            <motion.div
              key="expenses"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1 overflow-hidden flex flex-col"
            >
              <ExpenseIntelligence />
            </motion.div>
          )}

          {/* VIEW: CASHBOOK INTELLIGENCE */}
          {currentView === "cashbook" && (
            <motion.div
              key="cashbook"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1 overflow-hidden flex flex-col"
            >
              <CashbookIntelligence />
            </motion.div>
          )}

          {/* VIEW: STAFF MANAGEMENT */}
          {currentView === "staff" && (
            <motion.div
              key="staff"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1 overflow-hidden flex flex-col"
            >
              <StaffManagement />
            </motion.div>
          )}

          {/* VIEW: REPORTS & ANALYTICS */}
          {currentView === "reports" && (
            <motion.div
              key="reports"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1 overflow-hidden flex flex-col"
            >
              <ReportsAnalytics />
            </motion.div>
          )}

          {/* VIEW: CUSTOMER INTELLIGENCE */}
          {currentView === "customers" && (
            <motion.div
              key="customers"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1 overflow-y-auto p-6"
            >
              <CustomerIntelligence merchantId={merchantId} />
            </motion.div>
          )}

          {/* VIEW: LIVE QR TERMINAL */}
          {currentView === "terminal" && (
            <motion.div
              key="terminal"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1 overflow-hidden flex flex-col"
            >
              <LiveQRTerminal merchantId={merchantId} onPaymentSuccess={handleTerminalPaymentSuccess} />
            </motion.div>
          )}

          {/* VIEW: IMPORT HUB */}
          {currentView === "import" && (
            <motion.div
              key="import"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1 overflow-hidden flex flex-col"
            >
              <ImportHub merchantId={merchantId} setCurrentView={setCurrentView} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ============================================================== */}
      {/* 3. RIGHT COLUMN (Credit / Supplier Intelligence Workspace)    */}
      {/* ============================================================== */}
      {currentView !== "expenses" && currentView !== "cashbook" && currentView !== "staff" && currentView !== "reports" && currentView !== "customers" && currentView !== "terminal" && currentView !== "import" && (
        <div className="w-[420px] h-full flex flex-col bg-[#F8F9FB] shrink-0 overflow-y-auto relative z-10 border-l border-[#E5E7EB]">
        
        {/* TAB: CUSTOMER DETAIL PANEL */}
        {activeLedgerTab === "customers" ? (
          selectedCustomer ? (
            <div className="flex-1 flex flex-col justify-between min-h-0">
              <div className="p-6 border-b border-[#E5E7EB] bg-white shrink-0 relative">
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="absolute top-6 right-6 text-[#6B7280] hover:text-[#002970] text-xs font-bold uppercase tracking-widest cursor-pointer"
                >
                  Close
                </button>
                
                <div className="flex items-center gap-4 mt-2">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg border uppercase bg-slate-100 text-[#002970]`}>
                    {selectedCustomer.customer_name.substring(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-[#002970]">{selectedCustomer.customer_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide border ${
                        selectedCustomer.relationship_type === "loyal" ? "bg-[#00C853]/10 border-[#00C853]/20 text-[#00C853]" :
                        selectedCustomer.relationship_type === "risky" ? "bg-[#D32F2F]/10 border-[#D32F2F]/20 text-[#D32F2F]" :
                        "bg-[#6B7280]/10 border-[#6B7280]/20 text-[#6B7280]"
                      }`}>
                        {selectedCustomer.relationship_type}
                      </span>
                      <span className="text-[11px] font-semibold text-[#6B7280]">
                        Pending for {selectedCustomer.days_pending} days
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-[#E5E7EB] pt-4">
                  <div className="flex justify-between items-center text-xs font-extrabold text-[#6B7280] mb-2 uppercase tracking-wider">
                    <span>WhatsApp Number</span>
                    {!editingPhone && (
                      <button
                        onClick={() => setEditingPhone(true)}
                        className="text-[#00BAF2] hover:text-[#009FD0] cursor-pointer"
                      >
                        Edit Number
                      </button>
                    )}
                  </div>
                  {editingPhone ? (
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="+919876543210"
                        className="flex-1 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-[#00BAF2]"
                      />
                      <button
                        onClick={handleSavePhone}
                        disabled={savingPhone}
                        className="bg-[#00BAF2] hover:bg-[#009FD0] text-white font-extrabold text-xs px-4 py-2 rounded-xl cursor-pointer"
                      >
                        {savingPhone ? "..." : "Save"}
                      </button>
                      <button
                        onClick={() => { setEditingPhone(false); setPhoneInput(selectedCustomer.phone_number || ""); }}
                        className="border border-[#E5E7EB] hover:bg-slate-50 text-[#6B7280] font-extrabold text-xs px-3 py-2 rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#002970]">
                      <Phone className="w-3.5 h-3.5 text-[#00BAF2]" />
                      <span>{selectedCustomer.phone_number || "Not set"}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-b border-[#E5E7EB] bg-[#F8F9FB] shrink-0 space-y-4">
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#6B7280]">AI Credit Score</span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className={`text-2xl font-black ${
                        selectedCustomer.risk_level === "low" ? "text-[#00C853]" :
                        selectedCustomer.risk_level === "medium" ? "text-[#f59e0b]" :
                        "text-[#D32F2F]"
                      }`}>
                        {selectedCustomer.risk_score}
                      </span>
                      <span className="text-xs font-extrabold text-[#6B7280]">/ 100</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#6B7280]">Risk profile</span>
                    <span className={`block text-xs font-bold uppercase tracking-wider mt-1 ${
                      selectedCustomer.risk_level === "low" ? "text-[#00C853]" :
                      selectedCustomer.risk_level === "medium" ? "text-[#f59e0b]" :
                      "text-[#D32F2F]"
                    }`}>
                      {selectedCustomer.risk_level} Risk
                  </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 shadow-sm text-center">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#6B7280]">Total repayments</span>
                    <h4 className="text-base font-black text-[#002970] mt-1">{selectedCustomer.total_repayments}</h4>
                  </div>
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 shadow-sm text-center">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#6B7280]">Late repayments</span>
                    <h4 className="text-base font-black text-[#D32F2F] mt-1">{selectedCustomer.late_repayments}</h4>
                  </div>
                </div>
              </div>

              <div className="p-6 border-b border-[#E5E7EB] bg-white shrink-0 space-y-4">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#6B7280] block">Voice Entry for {selectedCustomer.customer_name}</span>
                
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleMicClick(selectedCustomer.customer_name)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-md transition-all cursor-pointer ${
                      voiceStatus === "recording"
                        ? "bg-[#D32F2F] text-white animate-pulse"
                        : "bg-[#00BAF2] hover:bg-[#009FD0] text-white shadow-[#00BAF2]/20 active:scale-95"
                    }`}
                  >
                    {voiceStatus === "processing" ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Mic className="w-5 h-5" />
                    )}
                  </button>

                  <div className="flex-1 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleTextSubmit("500 chukaya", selectedCustomer.customer_name)}
                      className="text-[10px] bg-[#F8F9FB] border border-[#E5E7EB] hover:bg-[#EEF3F7] rounded-lg px-2.5 py-1.5 text-[#002970] font-extrabold cursor-pointer"
                    >
                      "₹500 chukaya"
                    </button>
                    <button
                      onClick={() => handleTextSubmit("200 udhaar diya", selectedCustomer.customer_name)}
                      className="text-[10px] bg-[#F8F9FB] border border-[#E5E7EB] hover:bg-[#EEF3F7] rounded-lg px-2.5 py-1.5 text-[#002970] font-extrabold cursor-pointer"
                    >
                      "₹200 udhaar"
                    </button>
                  </div>
                </div>

                {voiceTranscript && (
                  <div className="bg-[#F8F9FB] border border-[#E5E7EB] p-3 rounded-xl text-xs">
                    <span className="text-[8px] uppercase tracking-wider font-extrabold text-[#6B7280]">AI Processed</span>
                    <p className="font-bold text-[#002970] leading-snug mt-1">"{voiceResponse}"</p>
                  </div>
                )}
              </div>

              <div className="flex-1 p-6 bg-white min-h-[160px] overflow-y-auto space-y-4">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#6B7280] block">Ledger logs history</span>
                
                <div className="space-y-3">
                  {loadingEntries ? (
                    <div className="py-6 flex justify-center text-xs text-[#6B7280]">Loading logs...</div>
                  ) : selectedCustomerTx.length > 0 ? (
                    selectedCustomerTx.map((tx) => (
                      <div key={tx.id} className="flex justify-between items-center border-b border-[#E5E7EB]/50 pb-2 text-xs">
                        <div>
                          <span className={`font-bold block ${tx.amount > 0 ? "text-[#D32F2F]" : "text-[#00C853]"}`}>
                            {tx.amount > 0 ? "Credit Extended" : "Repayment Received"}
                          </span>
                          <span className="text-[9px] text-[#6B7280] font-semibold">
                            {new Date(tx.date_added).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                        <span className={`font-black text-sm ${tx.amount > 0 ? "text-[#D32F2F]" : "text-[#00C853]"}`}>
                          {tx.amount > 0 ? "+" : "-"}₹{Math.abs(Math.round(tx.amount)).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#6B7280] italic text-center py-4 font-semibold">No recent logs on file.</p>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-[#E5E7EB] bg-[#F8F9FB] shrink-0 flex gap-3">
                <button
                  onClick={() => handleSendReminder(selectedCustomer.customer_name)}
                  disabled={sendingReminderFor === selectedCustomer.customer_name}
                  className="flex-1 bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{sendingReminderFor === selectedCustomer.customer_name ? "Sending..." : "Send Reminder"}</span>
                </button>
                
                <button
                  onClick={() => {
                    setNewTxType("give");
                    setShowAddTransactionModal(true);
                  }}
                  className="flex-1 bg-[#00C853] hover:bg-[#00B24A] text-white font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Transaction</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between p-6 h-full">
              <div className="space-y-6 flex-1 flex flex-col justify-center text-center">
                <div className="w-16 h-16 rounded-3xl bg-[#00BAF2]/10 border border-[#00BAF2]/25 flex items-center justify-center mx-auto shadow-sm">
                  <Shield className="w-8 h-8 text-[#00BAF2]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#002970]">AI Credit Workspace</h3>
                  <p className="text-xs text-[#6B7280] mt-1 max-w-[240px] mx-auto leading-relaxed">
                    Select a merchant customer from the ledger list to analyze repayment consistency, edit numbers, or trigger WhatsApp recovery reminders.
                  </p>
                </div>

                {!loadingHealth && udharHealth && (
                  <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 shadow-sm max-w-sm mx-auto w-full">
                    <span className="text-[9px] font-extrabold uppercase text-[#6B7280] block mb-3">Overall Ledger Health</span>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex">
                      <div className="bg-[#00C853] h-full" style={{ width: `${Math.round((udharHealth.healthy_amount / (udharHealth.total_udhar || 1)) * 100)}%` }} />
                      <div className="bg-[#f59e0b] h-full" style={{ width: `${Math.round((udharHealth.warning_amount / (udharHealth.total_udhar || 1)) * 100)}%` }} />
                      <div className="bg-[#D32F2F] h-full" style={{ width: `${Math.round((udharHealth.risky_amount / (udharHealth.total_udhar || 1)) * 100)}%` }} />
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-[#6B7280] mt-3">
                      <span className="text-[#00C853]">Healthy</span>
                      <span className="text-[#f59e0b]">Warning</span>
                      <span className="text-[#D32F2F]">Risky</span>
                    </div>
                  </div>
                )}
              </div>

              {!loadingHealth && udharHealth && udharHealth.insights && (
                <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 shadow-sm space-y-3 shrink-0">
                  <span className="text-[9px] font-extrabold uppercase text-[#6B7280] block">AI Credit Insights</span>
                  <div className="space-y-2 max-h-[140px] overflow-y-auto">
                    {udharHealth.insights.map((insight, idx) => (
                      <div key={idx} className="flex gap-2 items-start text-xs font-semibold text-[#002970] leading-snug">
                        <Sparkles className="w-3.5 h-3.5 text-[#00BAF2] shrink-0 mt-0.5" />
                        <span>{insight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          
          /* TAB: SUPPLIER INTELLIGENCE PANEL */
          selectedSupplier ? (
            <div className="flex-1 flex flex-col justify-between min-h-0 bg-white">
              
              {/* Profile Header */}
              <div className="p-6 border-b border-[#E5E7EB] bg-white shrink-0 relative">
                <button
                  onClick={() => setSelectedSupplier(null)}
                  className="absolute top-6 right-6 text-[#6B7280] hover:text-[#002970] text-xs font-bold uppercase tracking-widest cursor-pointer"
                >
                  Close
                </button>
                
                <div className="flex items-center gap-4 mt-2">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg border uppercase bg-[#00C853]/10 border-[#00C853]/25 text-[#00C853]`}>
                    {selectedSupplier.name.substring(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-[#002970]">{selectedSupplier.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide border bg-[#00C853]/10 border-[#00C853]/20 text-[#00C853]`}>
                        {selectedSupplier.category}
                      </span>
                      <span className="text-[11px] font-semibold text-[#6B7280]">
                        Due Date: {selectedSupplier.next_due_date}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-[#E5E7EB] pt-4">
                  <div className="flex justify-between items-center text-xs font-extrabold text-[#6B7280] mb-2 uppercase tracking-wider">
                    <span>WhatsApp Number</span>
                    {!editingPhone && (
                      <button
                        onClick={() => setEditingPhone(true)}
                        className="text-[#00C853] hover:text-[#00B24A] cursor-pointer"
                      >
                        Edit Number
                      </button>
                    )}
                  </div>
                  {editingPhone ? (
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="+917894568956"
                        className="flex-1 bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-[#00C853]"
                      />
                      <button
                        onClick={handleSavePhone}
                        disabled={savingPhone}
                        className="bg-[#00C853] hover:bg-[#00B24A] text-white font-extrabold text-xs px-4 py-2 rounded-xl cursor-pointer"
                      >
                        {savingPhone ? "..." : "Save"}
                      </button>
                      <button
                        onClick={() => { setEditingPhone(false); setPhoneInput(selectedSupplier.phone); }}
                        className="border border-[#E5E7EB] hover:bg-slate-50 text-[#6B7280] font-extrabold text-xs px-3 py-2 rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#002970]">
                      <Phone className="w-3.5 h-3.5 text-[#00C853]" />
                      <span>{selectedSupplier.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Supplier Score Gauge & Inventory Insights */}
              <div className="p-6 border-b border-[#E5E7EB] bg-[#F8F9FB] shrink-0 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Gauge Score */}
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#6B7280]">AI Reliability Score</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-black text-[#00BAF2]">{selectedSupplier.reliability_score}</span>
                        <span className="text-xs font-extrabold text-[#6B7280]">/ 100</span>
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-[#00BAF2]/10 flex items-center justify-center shrink-0">
                      <Shield className="w-4 h-4 text-[#00BAF2]" />
                    </div>
                  </div>

                  {/* Outstanding Amount */}
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#6B7280]">Outstanding</span>
                      <h3 className="text-lg font-black text-[#00C853] mt-1">₹{selectedSupplier.pending_amount.toLocaleString("en-IN")}</h3>
                    </div>
                  </div>
                </div>

                {/* AI Insights Card */}
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm space-y-2.5">
                  <span className="text-[9px] font-extrabold uppercase text-[#6B7280] block">AI Inventory & Ordering Insights</span>
                  <div className="space-y-2">
                    {selectedSupplier.insights.map((insight, idx) => (
                      <div key={idx} className="flex gap-2 items-start text-xs font-semibold text-[#002970] leading-snug">
                        <Sparkles className="w-3.5 h-3.5 text-[#00C853] shrink-0 mt-0.5" />
                        <span>{insight}</span>
                      </div>
                    ))}
                    <div className="text-xs font-semibold text-[#6B7280] mt-1 flex justify-between border-t border-[#E5E7EB] pt-2">
                      <span>Recommended Reorder Quantity:</span>
                      <span className="font-extrabold text-[#002970]">{selectedSupplier.reorder_qty}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive SVG Trends Charts */}
              <div className="p-6 border-b border-[#E5E7EB] bg-white shrink-0 space-y-4">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#6B7280] block">Purchase & Spend Trends (Last 6 Months)</span>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Purchase Trend SVG Chart */}
                  <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl p-3.5 text-center">
                    <span className="text-[8px] font-extrabold uppercase text-[#6B7280] tracking-wider flex items-center gap-1 justify-center">
                      <LineChart className="w-3 h-3 text-[#00BAF2]" /> Purchase Trend (₹)
                    </span>
                    <div className="mt-3 h-20 w-full flex items-end">
                      <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                        {/* Area Fill */}
                        <path
                          d={`M0,40 L0,${40 - (selectedSupplier.purchase_trend[0] / 120000) * 30} L20,${40 - (selectedSupplier.purchase_trend[1] / 120000) * 30} L40,${40 - (selectedSupplier.purchase_trend[2] / 120000) * 30} L60,${40 - (selectedSupplier.purchase_trend[3] / 120000) * 30} L80,${40 - (selectedSupplier.purchase_trend[4] / 120000) * 30} L100,${40 - (selectedSupplier.purchase_trend[5] / 120000) * 30} L100,40 Z`}
                          fill="rgba(0, 186, 242, 0.15)"
                        />
                        {/* Trend Line */}
                        <path
                          d={`M0,${40 - (selectedSupplier.purchase_trend[0] / 120000) * 30} L20,${40 - (selectedSupplier.purchase_trend[1] / 120000) * 30} L40,${40 - (selectedSupplier.purchase_trend[2] / 120000) * 30} L60,${40 - (selectedSupplier.purchase_trend[3] / 120000) * 30} L80,${40 - (selectedSupplier.purchase_trend[4] / 120000) * 30} L100,${40 - (selectedSupplier.purchase_trend[5] / 120000) * 30}`}
                          fill="none"
                          stroke="#00BAF2"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <div className="flex justify-between text-[8px] font-bold text-[#6B7280] mt-1.5">
                      <span>Jan</span>
                      <span>Jun</span>
                    </div>
                  </div>

                  {/* Spending Trend SVG Chart */}
                  <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl p-3.5 text-center">
                    <span className="text-[8px] font-extrabold uppercase text-[#6B7280] tracking-wider flex items-center gap-1 justify-center">
                      <TrendingUp className="w-3 h-3 text-[#00C853]" /> Spending Trend (₹)
                    </span>
                    <div className="mt-3 h-20 w-full flex items-end justify-between px-1">
                      {/* Bar graph representing spend trend */}
                      {selectedSupplier.spending_trend.map((val, idx) => (
                        <div key={idx} className="w-3 bg-[#00C853] rounded-t-sm" style={{
                          height: `${Math.max(10, Math.round((val / 120000) * 100))}%`
                        }} />
                      ))}
                    </div>
                    <div className="flex justify-between text-[8px] font-bold text-[#6B7280] mt-1.5">
                      <span>Jan</span>
                      <span>Jun</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Embedded Voice Assistant for Supplier */}
              <div className="p-6 border-b border-[#E5E7EB] bg-[#F8F9FB] shrink-0 space-y-4">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#6B7280] block">Voice Assistant Query</span>
                
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleMicClick(selectedSupplier.name)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-md transition-all cursor-pointer ${
                      voiceStatus === "recording"
                        ? "bg-[#D32F2F] text-white animate-pulse"
                        : "bg-[#00C853] hover:bg-[#00B24A] text-white shadow-[#00C853]/25 active:scale-95"
                    }`}
                  >
                    {voiceStatus === "processing" ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Mic className="w-5 h-5" />
                    )}
                  </button>

                  <div className="flex-1 flex flex-col gap-2">
                    <button
                      onClick={() => handleTextSubmit("kitna dena hai", selectedSupplier.name)}
                      className="text-[10px] bg-white border border-[#E5E7EB] hover:bg-[#EEF3F7] rounded-lg px-2.5 py-1.5 text-[#002970] font-extrabold cursor-pointer text-left w-full truncate"
                    >
                      "Chawal wale supplier ko kitna dena hai?"
                    </button>
                  </div>
                </div>

                {voiceTranscript && (
                  <div className="bg-white border border-[#E5E7EB] p-3 rounded-xl text-xs shadow-sm">
                    <span className="text-[8px] uppercase tracking-wider font-extrabold text-[#6B7280]">AI Response</span>
                    <p className="font-bold text-[#002970] leading-snug mt-1">"{voiceResponse}"</p>
                  </div>
                )}
              </div>

              {/* Supplier Entries ledger logs */}
              <div className="flex-1 p-6 bg-white min-h-[160px] overflow-y-auto space-y-4">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#6B7280] block">Ledger Logs History</span>
                
                <div className="space-y-3">
                  {selectedSupplierTx.length > 0 ? (
                    selectedSupplierTx.map((tx) => (
                      <div key={tx.id} className="flex justify-between items-center border-b border-[#E5E7EB]/50 pb-2 text-xs">
                        <div>
                          <span className={`font-bold block ${tx.amount > 0 ? "text-[#00C853]" : "text-[#D32F2F]"}`}>
                            {tx.amount > 0 ? `${tx.description || 'Goods Purchase'}` : `${tx.description || 'Payment Repayment'}`}
                          </span>
                          <span className="text-[9px] text-[#6B7280] font-semibold">
                            {tx.date_added}
                          </span>
                        </div>
                        <span className={`font-black text-sm ${tx.amount > 0 ? "text-[#00C853]" : "text-[#D32F2F]"}`}>
                          {tx.amount > 0 ? "+" : "-"}₹{Math.abs(Math.round(tx.amount)).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#6B7280] italic text-center py-4 font-semibold">No recent logs on file.</p>
                  )}
                </div>
              </div>

              {/* Smart Actions & Give/Got Entries */}
              <div className="p-4 border-t border-[#E5E7EB] bg-[#F8F9FB] shrink-0 space-y-3">
                
                {/* Supplier specific smart actions */}
                <div className="flex gap-2 text-[10px] font-extrabold">
                  <button
                    onClick={() => {
                      const text = `Dear ${selectedSupplier.name}, regarding our pending balance of Rs. ${selectedSupplier.pending_amount.toLocaleString()} due on ${selectedSupplier.next_due_date}. Please check. Thanks.`;
                      navigator.clipboard.writeText(text);
                      showToast("success", "Purchase reminder message copied to clipboard!");
                    }}
                    className="flex-1 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-[#002970] py-2 px-3 rounded-lg shadow-sm cursor-pointer text-center"
                  >
                    📝 Generate PO/Reminder
                  </button>

                  <a
                    href={`tel:${selectedSupplier.phone}`}
                    className="flex-1 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-[#002970] py-2 px-3 rounded-lg shadow-sm text-center"
                  >
                    📞 Call Supplier
                  </a>

                  <a
                    href={`https://wa.me/${selectedSupplier.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Dear ${selectedSupplier.name}, regarding pending balance of Rs. ${selectedSupplier.pending_amount}...`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-[#002970] py-2 px-3 rounded-lg shadow-sm text-center"
                  >
                    💬 WhatsApp Supplier
                  </a>
                </div>

                {/* Ledger transactions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setNewSuppTxType("give"); // You Gave (Repayment)
                      setNewSuppTxDesc("Ledger Payment Repayment");
                      setShowAddSupplierEntryModal(true);
                    }}
                    className="flex-1 bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <span>You Gave ₹</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setNewSuppTxType("got"); // You Got (Purchase)
                      setNewSuppTxDesc("Goods Purchase Batch");
                      setShowAddSupplierEntryModal(true);
                    }}
                    className="flex-1 bg-[#00C853] hover:bg-[#00B24A] text-white font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <span>You Got ₹</span>
                  </button>
                </div>
              </div>

            </div>
          ) : (
            /* Suppliers Dashboard welcome */
            <div className="flex-1 flex flex-col justify-between p-6 h-full bg-white">
              <div className="space-y-6 flex-1 flex flex-col justify-center text-center">
                <div className="w-16 h-16 rounded-3xl bg-[#00C853]/10 border border-[#00C853]/25 flex items-center justify-center mx-auto shadow-sm">
                  <Shield className="w-8 h-8 text-[#00C853]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#002970]">AI Supplier Workspace</h3>
                  <p className="text-xs text-[#6B7280] mt-1 max-w-[240px] mx-auto leading-relaxed">
                    Select a supplier from the list to analyze purchase trends, reliability scores, reorder recommendations, and manage purchase accounts.
                  </p>
                </div>

                {/* Donut chart for supplier risk */}
                <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-3xl p-6 shadow-sm max-w-sm mx-auto w-full">
                  <span className="text-[9px] font-extrabold uppercase text-[#6B7280] block mb-3">Overall Supplier Risk Health</span>
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex">
                    <div className="bg-[#00C853] h-full" style={{ width: "35%" }} />
                    <div className="bg-[#f59e0b] h-full" style={{ width: "45%" }} />
                    <div className="bg-[#D32F2F] h-full" style={{ width: "20%" }} />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-[#6B7280] mt-3">
                    <span className="text-[#00C853]">Low Risk (35%)</span>
                    <span className="text-[#f59e0b]">Medium (45%)</span>
                    <span className="text-[#D32F2F]">High (20%)</span>
                  </div>
                </div>
              </div>

              {/* Insights list */}
              <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-3xl p-6 shadow-sm space-y-3 shrink-0">
                <span className="text-[9px] font-extrabold uppercase text-[#6B7280] block">AI Supplier Diagnostics</span>
                <div className="space-y-2">
                  <div className="flex gap-2 items-start text-xs font-semibold text-[#002970] leading-snug">
                    <Sparkles className="w-3.5 h-3.5 text-[#00C853] shrink-0 mt-0.5" />
                    <span>Average payment delay to suppliers is 12 days.</span>
                  </div>
                  <div className="flex gap-2 items-start text-xs font-semibold text-[#002970] leading-snug">
                    <Sparkles className="w-3.5 h-3.5 text-[#00C853] shrink-0 mt-0.5" />
                    <span>Recommend paying Masale Vendor (₹12,000) by 8th June to maintain score.</span>
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        </div>
      )}

      {/* ============================================================== */}
      {/* 4. MODALS & POPUPS                                            */}
      {/* ============================================================== */}
      
      {/* PAYMENT INSIGHT AI POPUP */}
      {paymentInsight?.show && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
          onClick={() => setPaymentInsight(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-[#0c1526] border border-[#1e3a5a] rounded-3xl p-7 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-5">
              <div className="text-5xl mb-3">{paymentInsight.is_milestone ? "🎉" : "🧠"}</div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#64748b]">
                {paymentInsight.is_milestone ? "Milestone!" : "AI Customer Insight"}
              </span>
              <h3 className="text-lg font-extrabold text-white mt-1">{paymentInsight.customer_name}</h3>
            </div>
            <p className="text-sm text-[#94a3b8] text-center leading-relaxed mb-5">{paymentInsight.insight_message}</p>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-[#1e2a3a] rounded-xl p-3 text-center">
                <div className="text-lg font-extrabold text-white">{paymentInsight.visit_count}</div>
                <div className="text-[10px] text-[#64748b] font-semibold uppercase">Visits</div>
              </div>
              <div className="bg-[#1e2a3a] rounded-xl p-3 text-center">
                <div className="text-xs font-extrabold text-emerald-400">₹{Math.round(paymentInsight.total_spent).toLocaleString("en-IN")}</div>
                <div className="text-[10px] text-[#64748b] font-semibold uppercase">Spent</div>
              </div>
              <div className="bg-[#1e2a3a] rounded-xl p-3 text-center">
                <div className="text-xs font-extrabold text-amber-400">{paymentInsight.relationship_type}</div>
                <div className="text-[10px] text-[#64748b] font-semibold uppercase">Tier</div>
              </div>
            </div>
            <button
              onClick={() => setPaymentInsight(null)}
              className="w-full bg-[#1a56db] hover:bg-[#1e40af] text-white font-bold py-3 rounded-xl text-sm transition-all cursor-pointer"
            >
              Got it!
            </button>
          </motion.div>
        </div>
      )}

      {/* GLOBAL FLOATING TOAST */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[999] flex items-center gap-3 px-5 py-4 rounded-2xl border shadow-2xl text-sm font-semibold transition-all duration-300 ${
            toast.type === "success"
              ? "bg-[#E8F5E9] border-[#A5D6A7] text-[#2E7D32]"
              : "bg-[#FFEBEE] border-[#FFCDD2] text-[#C62828]"
          }`}
        >
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-xs opacity-60 hover:opacity-100 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* MODAL: ADD CUSTOMER */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-[#081A38]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl w-full max-w-md p-6 border border-[#E5E7EB] shadow-2xl relative"
          >
            <button
              onClick={() => setShowAddCustomerModal(false)}
              className="absolute top-6 right-6 text-[#6B7280] hover:text-[#002970] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-[#002970] mb-6">Create Customer Profile</h3>
            
            <form onSubmit={handleAddCustomerSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">Customer Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mohan Das"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-[#00BAF2] text-[#111827]"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">WhatsApp Number (Optional)</label>
                <input
                  type="tel"
                  placeholder="e.g. +919876543210"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-[#00BAF2] text-[#111827]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 500"
                    value={newCustAmount}
                    onChange={(e) => setNewCustAmount(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-[#00BAF2] text-[#111827]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">Type</label>
                  <div className="bg-[#EEF3F7] p-1 rounded-xl flex text-[10px] font-extrabold text-[#6B7280] h-[46px] items-center">
                    <button
                      type="button"
                      onClick={() => setNewCustType("give")}
                      className={`flex-1 py-2 rounded-lg text-center cursor-pointer transition-all ${
                        newCustType === "give" ? "bg-white text-[#D32F2F] shadow-sm" : "hover:text-[#002970]"
                      }`}
                    >
                      You Gave
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewCustType("got")}
                      className={`flex-1 py-2 rounded-lg text-center cursor-pointer transition-all ${
                        newCustType === "got" ? "bg-white text-[#00C853] shadow-sm" : "hover:text-[#002970]"
                      }`}
                    >
                      You Got
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">Date (Optional)</label>
                <input
                  type="date"
                  value={newCustDate}
                  onChange={(e) => setNewCustDate(e.target.value)}
                  className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-[#00BAF2] text-[#111827]"
                />
              </div>

              <button
                type="submit"
                disabled={submittingCustomer}
                className="w-full bg-[#00BAF2] hover:bg-[#009FD0] text-white font-extrabold text-xs py-3.5 rounded-xl cursor-pointer mt-4"
              >
                {submittingCustomer ? "Creating account..." : "Save Customer"}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: ADD SUPPLIER */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 bg-[#081A38]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl w-full max-w-md p-6 border border-[#E5E7EB] shadow-2xl relative"
          >
            <button
              onClick={() => setShowAddSupplierModal(false)}
              className="absolute top-6 right-6 text-[#6B7280] hover:text-[#002970] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-[#002970] mb-6">Register Supplier Profile</h3>
            
            <form onSubmit={handleAddSupplierSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">Supplier Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rice Supplier Ltd"
                  value={newSuppName}
                  onChange={(e) => setNewSuppName(e.target.value)}
                  className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-[#00C853] text-[#111827]"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. +917894568956"
                  value={newSuppPhone}
                  onChange={(e) => setNewSuppPhone(e.target.value)}
                  className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-[#00C853] text-[#111827]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">Supplier Category</label>
                  <select
                    value={newSuppCategory}
                    onChange={(e) => setNewSuppCategory(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-[#00C853] text-[#111827] cursor-pointer"
                  >
                    <option value="Rice & Grains">Rice & Grains</option>
                    <option value="Oil & Dairy">Oil & Dairy</option>
                    <option value="Spices">Spices</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Packaged Foods">Packaged Foods</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">Risk Level</label>
                  <select
                    value={newSuppRisk}
                    onChange={(e) => setNewSuppRisk(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-[#00C853] text-[#111827] cursor-pointer"
                  >
                    <option value="low">Low Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Risk</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">Initial Balance (You'll Give ₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 80000"
                    value={newSuppAmount}
                    onChange={(e) => setNewSuppAmount(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-[#00C853] text-[#111827]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">Purchase Date</label>
                  <input
                    type="date"
                    value={newSuppDate}
                    onChange={(e) => setNewSuppDate(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-[#00C853] text-[#111827]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingSupplier}
                className="w-full bg-[#00C853] hover:bg-[#00B24A] text-white font-extrabold text-xs py-3.5 rounded-xl cursor-pointer mt-4"
              >
                {submittingSupplier ? "Registering supplier..." : "Save Supplier"}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: ADD TRANSACTION */}
      {showAddTransactionModal && selectedCustomer && (
        <div className="fixed inset-0 bg-[#081A38]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl w-full max-w-md p-6 border border-[#E5E7EB] shadow-2xl relative"
          >
            <button
              onClick={() => setShowAddTransactionModal(false)}
              className="absolute top-6 right-6 text-[#6B7280] hover:text-[#002970] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-[#002970] mb-2">New Ledger Log</h3>
            <p className="text-xs text-[#6B7280] font-semibold mb-6">Record credit or repayment for <span className="text-[#00BAF2]">{selectedCustomer.customer_name}</span></p>
            
            <form onSubmit={handleAddTxSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 500"
                    value={newTxAmount}
                    onChange={(e) => setNewTxAmount(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-[#00BAF2] text-[#111827]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">Transaction Type</label>
                  <div className="bg-[#EEF3F7] p-1 rounded-xl flex text-[10px] font-extrabold text-[#6B7280] h-[46px] items-center">
                    <button
                      type="button"
                      onClick={() => setNewTxType("give")}
                      className={`flex-1 py-2 rounded-lg text-center cursor-pointer transition-all ${
                        newTxType === "give" ? "bg-white text-[#D32F2F] shadow-sm" : "hover:text-[#002970]"
                      }`}
                    >
                      Gave credit
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTxType("got")}
                      className={`flex-1 py-2 rounded-lg text-center cursor-pointer transition-all ${
                        newTxType === "got" ? "bg-white text-[#00C853] shadow-sm" : "hover:text-[#002970]"
                      }`}
                    >
                      Got payment
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">Transaction Date (Optional)</label>
                <input
                  type="date"
                  value={newTxDate}
                  onChange={(e) => setNewTxDate(e.target.value)}
                  className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-[#00BAF2] text-[#111827]"
                />
              </div>

              <button
                type="submit"
                disabled={submittingTx}
                className="w-full bg-[#00C853] hover:bg-[#00B24A] text-white font-extrabold text-xs py-3.5 rounded-xl cursor-pointer mt-4"
              >
                {submittingTx ? "Saving entry..." : "Save Transaction"}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: ADD SUPPLIER TRANSACTION */}
      {showAddSupplierEntryModal && selectedSupplier && (
        <div className="fixed inset-0 bg-[#081A38]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl w-full max-w-md p-6 border border-[#E5E7EB] shadow-2xl relative"
          >
            <button
              onClick={() => setShowAddSupplierEntryModal(false)}
              className="absolute top-6 right-6 text-[#6B7280] hover:text-[#002970] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-[#002970] mb-2">Record Supplier Ledger Log</h3>
            <p className="text-xs text-[#6B7280] font-semibold mb-6">Log purchase or repayment transaction for <span className="text-[#00C853]">{selectedSupplier.name}</span></p>
            
            <form onSubmit={handleAddSupplierTxSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 5000"
                    value={newSuppTxAmount}
                    onChange={(e) => setNewSuppTxAmount(e.target.value)}
                    className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-[#00C853] text-[#111827]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">Log Action</label>
                  <div className="bg-[#EEF3F7] p-1 rounded-xl flex text-[10px] font-extrabold text-[#6B7280] h-[46px] items-center">
                    <button
                      type="button"
                      onClick={() => { setNewSuppTxType("give"); setNewSuppTxDesc("Ledger Payment Repayment"); }}
                      className={`flex-1 py-2 rounded-lg text-center cursor-pointer transition-all ${
                        newSuppTxType === "give" ? "bg-white text-[#D32F2F] shadow-sm" : "hover:text-[#002970]"
                      }`}
                    >
                      You Gave ₹
                    </button>
                    <button
                      type="button"
                      onClick={() => { setNewSuppTxType("got"); setNewSuppTxDesc("Goods Purchase Batch"); }}
                      className={`flex-1 py-2 rounded-lg text-center cursor-pointer transition-all ${
                        newSuppTxType === "got" ? "bg-white text-[#00C853] shadow-sm" : "hover:text-[#002970]"
                      }`}
                    >
                      You Got ₹
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">Transaction Date (Optional)</label>
                <input
                  type="date"
                  value={newSuppTxDate}
                  onChange={(e) => setNewSuppTxDate(e.target.value)}
                  className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-[#00C853] text-[#111827]"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">Description / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Repayment of outstanding / 100kg Rice batch"
                  value={newSuppTxDesc}
                  onChange={(e) => setNewSuppTxDesc(e.target.value)}
                  className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:border-[#00C853] text-[#111827]"
                />
              </div>

              <button
                type="submit"
                disabled={submittingSuppTx}
                className="w-full bg-[#00C853] hover:bg-[#00B24A] text-white font-extrabold text-xs py-3.5 rounded-xl cursor-pointer mt-4"
              >
                {submittingSuppTx ? "Saving entry..." : "Save Ledger Log"}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: LOAN DIAGNOSTICS */}
      {showLoanDetailsModal && (
        <div className="fixed inset-0 bg-[#081A38]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl w-full max-w-lg p-6 border border-[#E5E7EB] shadow-2xl relative"
          >
            <button
              onClick={() => setShowLoanDetailsModal(false)}
              className="absolute top-6 right-6 text-[#6B7280] hover:text-[#002970] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-[#002970] mb-2">AI CFO Credit Diagnoses Report</h3>
            <p className="text-xs text-[#6B7280] font-semibold mb-6">Comprehensive scoring metrics calculations.</p>

            {loadingScore ? (
              <p className="text-xs text-[#6B7280] text-center py-6">Re-calculating metrics...</p>
            ) : loanData ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center justify-center py-4 bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl">
                  <span className="text-[10px] font-extrabold uppercase text-[#6B7280]">Credit Eligibility Grade</span>
                  <h1 className="text-4xl font-black mt-2 text-[#00BAF2] flex items-baseline gap-1">
                    <span>{loanData.score}</span>
                    <span className="text-xs font-semibold text-[#6B7280]">/ 900 ({loanData.label})</span>
                  </h1>
                </div>

                <div className="space-y-3.5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-[#6B7280]">Revenue volume indicator score</span>
                    <span className="font-extrabold text-[#002970]">{loanData.breakdown.revenue_score} / 100</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-[#6B7280]">Daily repayment regularity score</span>
                    <span className="font-extrabold text-[#002970]">{loanData.breakdown.consistency_score} / 100</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-[#6B7280]">Monthly business expansion score</span>
                    <span className="font-extrabold text-[#002970]">{loanData.breakdown.growth_score} / 100</span>
                  </div>
                </div>

                <div className="p-4 bg-[#081A38] text-white rounded-2xl flex justify-between items-center shadow-lg">
                  <div>
                    <span className="text-[8px] uppercase tracking-widest text-[#00BAF2] font-extrabold">Estimated Pre-Approved Capital</span>
                    <h3 className="text-lg font-black text-white mt-0.5">₹{Math.round(loanData.estimated_amount).toLocaleString("en-IN")}</h3>
                  </div>
                  <button 
                    onClick={() => {
                      setShowLoanDetailsModal(false);
                      showToast("success", "Loan request submitted to partners.");
                    }}
                    className="bg-[#00BAF2] text-white text-[10px] font-extrabold py-2 px-3 rounded-lg shadow-md shadow-[#00BAF2]/10"
                  >
                    Apply
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-rose-500 font-semibold text-center">Failed to load diagnosis details.</p>
            )}
          </motion.div>
        </div>
      )}

    </div>
  );
}
