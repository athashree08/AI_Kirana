import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, Check, AlertCircle, Trash2, Edit3, Plus, 
  FileText, ArrowRight, Camera, Sparkles, MessageSquare, 
  RefreshCw, CheckCircle2, ChevronRight, Info, HelpCircle
} from "lucide-react";

interface ImportHubProps {
  merchantId?: string;
  setCurrentView?: (view: any) => void;
}

interface LedgerEntry {
  name: string;
  amount: number;
  type: string;
  date?: string | null;
  notes?: string;
}

interface BillingStats {
  file_type: string;
  total_entries: number;
  total_amount: number;
  breakdown_by_type: Record<string, number>;
}

export default function ImportHub({ merchantId = "merchant_001", setCurrentView }: ImportHubProps) {
  const [activeTab, setActiveTab] = useState<"ocr" | "billing">("ocr");
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  // Loading & Pipeline State
  const [loading, setLoading] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0);
  const [pipelineLogs, setPipelineLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Extracted Data Preview State
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [ocrText, setOcrText] = useState<string>("");
  const [billingStats, setBillingStats] = useState<BillingStats | null>(null);
  
  // Success State
  const [importSuccess, setImportSuccess] = useState(false);
  const [successStats, setSuccessStats] = useState<{
    savedCount: number;
    udharCount?: number;
    saleCount?: number;
    totalAmount: number;
    type: "ocr" | "billing";
  } | null>(null);

  // Inline Editing State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editType, setEditType] = useState("udhar");
  const [editDate, setEditDate] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto Mapping preview info (Billing Import)
  const [detectedColumns, setDetectedColumns] = useState<Record<string, string>>({
    "customer_name": "Mapped automatically (Fuzzy search: Customer, Client, Buyer)",
    "amount": "Mapped automatically (Fuzzy search: Amount, Total, Pending)",
    "date": "Mapped automatically (Fuzzy search: Date, Time, Timestamp)",
    "type": "Mapped automatically (Fuzzy search: Type, Mode, Payment Mode)",
    "notes": "Mapped automatically (Fuzzy search: Notes, Details, Product)"
  });

  const pipelineSteps = [
    "Uploading file securely to server...",
    "Scanning content using pluggable Paytm OCR engine...",
    "Structuring handwriting anomalies using moonshotai Kimi-K2.5 LLM...",
    "Resolving typo names & fuzzy matching with customer database..."
  ];

  // Pipeline simulation timer during API requests
  useEffect(() => {
    let interval: any;
    if (loading) {
      setPipelineStep(0);
      interval = setInterval(() => {
        setPipelineStep((prev) => {
          if (prev < 3) {
            return prev + 1;
          }
          return prev;
        });
      }, 1200);
    } else {
      setPipelineStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const ext = selectedFile.name.toLowerCase().split(".").pop();
    setError(null);
    setEntries([]);
    setBillingStats(null);
    setImportSuccess(false);

    if (activeTab === "ocr") {
      if (["jpg", "jpeg", "png"].includes(ext || "")) {
        setFile(selectedFile);
      } else {
        setError("Please upload an image file (JPG, JPEG, or PNG) for Ledger OCR.");
      }
    } else {
      if (["csv", "xlsx", "xls"].includes(ext || "")) {
        setFile(selectedFile);
      } else {
        setError("Please upload a transaction data file (CSV, XLSX, or XLS) for Billing Import.");
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Run Backend Pipeline
  const handleProcessImport = async () => {
    if (!file) {
      setError("Please select a file to process.");
      return;
    }

    setLoading(true);
    setError(null);
    setEntries([]);
    setOcrText("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("merchant_id", merchantId);

    try {
      const endpoint = activeTab === "ocr" ? "/api/import/ledger-ocr" : "/api/import/billing";
      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Server failed to process import file.");
      }

      const data = await res.json();
      
      // Let the steps animation finish nicely
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (activeTab === "ocr") {
        setEntries(data.entries || []);
        setOcrText(data.ocr_text || "");
      } else {
        setEntries(data.entries || []);
        setBillingStats({
          file_type: data.file_type || "csv",
          total_entries: data.total_entries || 0,
          total_amount: data.total_amount || 0,
          breakdown_by_type: data.breakdown_by_type || {}
        });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during processing.");
    } finally {
      setLoading(false);
    }
  };

  // Simulate Camera Capture
  const handleSimulateCamera = () => {
    // Create a mock image file
    const mockFile = new File(["dummy image bits"], "handwritten_ledger.png", { type: "image/png" });
    validateAndSetFile(mockFile);
  };

  // Simulate Sample CSV Import
  const handleSimulateCSV = () => {
    const mockFile = new File(["dummy csv bits"], "transactions_export.csv", { type: "text/csv" });
    validateAndSetFile(mockFile);
  };

  // Editing Row logic
  const startEdit = (index: number) => {
    const entry = entries[index];
    setEditingIndex(index);
    setEditName(entry.name);
    setEditAmount(entry.amount);
    setEditType(entry.type);
    setEditDate(entry.date || new Date().toISOString().split("T")[0]);
    setEditNotes(entry.notes || "");
  };

  const saveEdit = (index: number) => {
    const updated = [...entries];
    updated[index] = {
      name: editName,
      amount: editAmount,
      type: editType,
      date: editDate || null,
      notes: editNotes
    };
    setEntries(updated);
    setEditingIndex(null);
  };

  const deleteRow = (index: number) => {
    const updated = entries.filter((_, i) => i !== index);
    setEntries(updated);
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const addRow = () => {
    const newRow: LedgerEntry = {
      name: "New Customer",
      amount: 100,
      type: activeTab === "ocr" ? "udhar" : "sale",
      date: new Date().toISOString().split("T")[0],
      notes: "Manual entry"
    };
    setEntries([newRow, ...entries]);
    startEdit(0);
  };

  // Save to DB
  const handleConfirmImport = async () => {
    if (entries.length === 0) return;
    setLoading(true);
    setError(null);

    const payload = {
      merchant_id: merchantId,
      entries: entries.map(e => ({
        name: e.name,
        amount: Number(e.amount),
        type: e.type,
        date: e.date || null,
        notes: e.notes || ""
      }))
    };

    try {
      const endpoint = activeTab === "ocr" ? "/api/import/ledger-confirm" : "/api/import/billing-confirm";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Server failed to save imported transactions.");
      }

      const data = await res.json();
      
      const totalAmount = entries.reduce((sum, item) => sum + item.amount, 0);

      setSuccessStats({
        savedCount: data.saved_to_udhar || data.total_saved || entries.length,
        udharCount: data.saved_udhar_entries || (activeTab === "ocr" ? data.saved_to_udhar : 0),
        saleCount: data.saved_sale_entries || 0,
        totalAmount,
        type: activeTab
      });

      setImportSuccess(true);
      setEntries([]);
      setFile(null);
    } catch (err: any) {
      setError(err.message || "Failed to confirm and import transactions to database.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#002970] tracking-tight flex items-center gap-2">
            <span>📥</span> AI Ledger & Billing Import Hub
          </h2>
          <p className="text-xs text-[#6B7280] mt-1 font-medium">
            Instantly digitize notebook records and sync billing system files into your AI CFO dashboard.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="bg-[#EEF3F7] p-1 rounded-xl flex gap-1 text-[11px] font-extrabold text-[#6B7280] self-stretch sm:self-auto">
          <button
            onClick={() => {
              setActiveTab("ocr");
              setFile(null);
              setEntries([]);
              setError(null);
              setImportSuccess(false);
            }}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "ocr" ? "bg-white text-[#002970] shadow-sm" : "hover:text-[#002970]"
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Ledger Book OCR
          </button>
          <button
            onClick={() => {
              setActiveTab("billing");
              setFile(null);
              setEntries([]);
              setError(null);
              setImportSuccess(false);
            }}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "billing" ? "bg-white text-[#002970] shadow-sm" : "hover:text-[#002970]"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Billing Software Import
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        
        {/* SUCCESS STATE SCREEN */}
        {importSuccess && successStats && (
          <motion.div
            key="success-screen"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="bg-gradient-to-tr from-[#081a38] to-[#0d2754] border border-[#1e3a5a]/60 text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden"
          >
            {/* Sparkle background elements */}
            <div className="absolute top-10 right-10 w-24 h-24 bg-[#00BAF2]/10 rounded-full blur-2xl animate-pulse"></div>
            <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-[#00C853]/15 rounded-full blur-3xl animate-pulse"></div>

            <div className="flex flex-col items-center text-center max-w-xl mx-auto space-y-6">
              <div className="w-16 h-16 rounded-full bg-[#00C853]/20 border border-[#00C853]/40 flex items-center justify-center text-[#00C853] text-3xl shadow-lg shadow-[#00C853]/10">
                ✓
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#00BAF2] bg-[#00BAF2]/10 border border-[#00BAF2]/20 px-2.5 py-1 rounded-full">
                  Import Completed Successfully
                </span>
                <h3 className="text-2xl font-black text-white mt-3">Your Bookkeeping records are digitized!</h3>
                <p className="text-xs text-slate-300 mt-2 max-w-md mx-auto leading-relaxed">
                  Transaction details have been parsed, validated, and saved in the ledger. All AI Munshi modules are already analyzing the new records.
                </p>
              </div>

              {/* KPI cards in Success State */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full mt-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block">Digitized Records</span>
                  <span className="text-2xl font-black text-[#00BAF2] mt-1 block">
                    {successStats.savedCount} Entries
                  </span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block">Total Volume</span>
                  <span className="text-2xl font-black text-[#00C853] mt-1 block">
                    ₹{successStats.totalAmount.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-center flex flex-col justify-center">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block">Breakdown</span>
                  <span className="text-xs font-semibold text-slate-200 mt-1 block">
                    {successStats.type === "ocr" ? (
                      "Udhar/Credit ledger entries"
                    ) : (
                      `Sales: ${successStats.saleCount} | Udhar: ${successStats.udharCount}`
                    )}
                  </span>
                </div>
              </div>

              {/* AI CFO Call to Action */}
              <div className="w-full bg-[#112347] border border-[#1e3a5a] rounded-2xl p-5 text-left flex items-start gap-4 shadow-inner">
                <div className="w-10 h-10 rounded-xl bg-[#00BAF2]/10 border border-[#00BAF2]/30 flex items-center justify-center shrink-0 text-xl">
                  🎙️
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    Ask Voice CFO immediately! <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    AI Munshi has digested these entries. Try going to the Voice CFO console and asking:
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-[10px] bg-[#0c1526]/50 border border-white/5 px-2 py-1 rounded text-slate-300 italic">
                      "Mohan ka kitna udhar hai?"
                    </span>
                    <span className="text-[10px] bg-[#0c1526]/50 border border-white/5 px-2 py-1 rounded text-slate-300 italic">
                      "Total udhar kitna hai?"
                    </span>
                    <span className="text-[10px] bg-[#0c1526]/50 border border-white/5 px-2 py-1 rounded text-slate-300 italic">
                      "Sabse zyada udhar kisne liya hai?"
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={() => {
                    if (setCurrentView) setCurrentView("voice");
                  }}
                  className="flex-1 bg-[#00BAF2] hover:bg-[#009FD0] text-white font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#00BAF2]/10"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Go to Voice CFO Console</span>
                </button>
                
                <button
                  onClick={() => setImportSuccess(false)}
                  className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Import another document</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* LOADING & PIPELINE PIPELINE ANIMATION */}
        {loading && (
          <motion.div
            key="loading-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white border border-[#E5E7EB] rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center min-h-[300px] text-center"
          >
            <div className="relative w-16 h-16 mb-6">
              {/* Outer Spin Ring */}
              <div className="absolute inset-0 border-4 border-[#00BAF2]/10 border-t-[#00BAF2] rounded-full animate-spin"></div>
              {/* Inner Glow */}
              <div className="absolute inset-2 bg-gradient-to-tr from-[#00BAF2]/5 to-[#00C853]/5 rounded-full flex items-center justify-center text-xl animate-pulse">
                ⚙️
              </div>
            </div>

            <h3 className="text-base font-extrabold text-[#002970]">
              {activeTab === "ocr" ? "AI Ledger Document Processing" : "Billing Data Integration"}
            </h3>
            <p className="text-xs text-[#6B7280] mt-1 max-w-xs leading-relaxed">
              Applying pipeline steps sequentially. Please hold on while we process.
            </p>

            {/* PIPELINE STEPS LIST */}
            <div className="mt-8 space-y-3 max-w-md w-full border-t border-[#E5E7EB] pt-6 text-left">
              {pipelineSteps.map((step, idx) => {
                const isDone = pipelineStep > idx;
                const isCurrent = pipelineStep === idx;
                
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                      isDone ? "bg-[#00C853] text-white" : 
                      isCurrent ? "bg-[#00BAF2] text-white animate-pulse" : 
                      "bg-[#EEF3F7] text-[#A0AEC0]"
                    }`}>
                      {isDone ? "✓" : idx + 1}
                    </div>
                    <span className={`text-xs font-bold ${
                      isDone ? "text-[#6B7280] line-through font-semibold" : 
                      isCurrent ? "text-[#002970]" : 
                      "text-[#A0AEC0]"
                    }`}>
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* INPUT SOURCE CHOOSE & UPLOAD ZONE */}
        {!loading && !importSuccess && entries.length === 0 && (
          <motion.div
            key="upload-screen"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* INSTRUCTIONS BANNER */}
            <div className="bg-gradient-to-r from-blue-500/5 to-cyan-500/5 border border-blue-500/10 rounded-2xl p-4 flex gap-4 items-start">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 text-base">
                💡
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-[#002970]">
                  {activeTab === "ocr" ? "How does Ledger Book OCR work?" : "How does Billing Software Import work?"}
                </h4>
                <p className="text-[11px] text-[#6B7280] leading-relaxed">
                  {activeTab === "ocr" ? (
                    "Upload a photo of a messy ledger notebook page. Paytm Inference (Kimi LLM) handles handwriting anomalies like 'Mhn 5OO' -> 'Mohan 500'. It auto-corrects names against existing customers, gives you a review screen, and updates Udhar ledger."
                  ) : (
                    "Upload transaction exports in CSV, Excel or JSON formats. AI Munshi automatically maps columns (e.g. buyer name mapping to client, date mappings) and performs bulk ingestion to update sales revenue, cashbook cash flows, and customer VIP intelligence."
                  )}
                </p>
              </div>
            </div>

            {/* DRAG AND DROP ZONE */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              className={`border-2 border-dashed rounded-3xl p-10 text-center flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300 relative overflow-hidden ${
                dragActive 
                  ? "border-[#00BAF2] bg-[#00BAF2]/5" 
                  : "border-[#E5E7EB] hover:border-[#00BAF2] hover:bg-slate-50/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={activeTab === "ocr" ? ".png, .jpg, .jpeg" : ".csv, .xlsx, .xls"}
                onChange={handleFileChange}
              />

              <div className="w-14 h-14 rounded-2xl bg-[#EEF3F7] border border-[#E5E7EB] flex items-center justify-center text-[#6B7280]">
                {activeTab === "ocr" ? (
                  <Camera className="w-6 h-6 text-[#00BAF2]" />
                ) : (
                  <FileText className="w-6 h-6 text-[#00C853]" />
                )}
              </div>

              <div>
                <p className="text-sm font-bold text-[#002970]">
                  Drag and drop your file here, or <span className="text-[#00BAF2] underline hover:text-[#009FD0]">browse</span>
                </p>
                <p className="text-[10px] text-[#A0AEC0] mt-1 font-semibold">
                  {activeTab === "ocr" 
                    ? "Supported formats: PNG, JPG, JPEG (Max 10MB)" 
                    : "Supported formats: CSV, XLSX, XLS (Max 15MB)"}
                </p>
              </div>

              {/* Badges/Simulate Buttons */}
              <div className="flex flex-wrap gap-2.5 mt-4 z-10" onClick={(e) => e.stopPropagation()}>
                {activeTab === "ocr" ? (
                  <>
                    <button
                      onClick={handleSimulateCamera}
                      className="bg-white border border-[#E5E7EB] hover:border-[#00BAF2] text-[#002970] font-extrabold text-[10px] px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                    >
                      📷 Simulate Photo Upload
                    </button>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleSimulateCamera();
                      }}
                      className="text-[10px] text-[#6B7280] hover:text-[#00BAF2] font-extrabold flex items-center gap-1 mt-2.5 block w-full justify-center"
                    >
                      Sample file: handwritten_ledger_demo.png
                    </a>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleSimulateCSV}
                      className="bg-white border border-[#E5E7EB] hover:border-[#00C853] text-[#002970] font-extrabold text-[10px] px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                    >
                      📊 Simulate CSV Import
                    </button>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleSimulateCSV();
                      }}
                      className="text-[10px] text-[#6B7280] hover:text-[#00C853] font-extrabold flex items-center gap-1 mt-2.5 block w-full justify-center"
                    >
                      Sample file: shop_transactions_1000.csv
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* SELECTED FILE ACTIONS */}
            {file && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#EEF3F7] border border-[#E5E7EB] rounded-2xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center text-lg shadow-sm">
                    {activeTab === "ocr" ? "🖼️" : "📄"}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#002970] truncate max-w-xs">{file.name}</h5>
                    <p className="text-[10px] text-[#6B7280] font-semibold mt-0.5">
                      {(file.size / 1024).toFixed(1)} KB • Ready to parse
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFile(null)}
                    className="border border-[#E5E7EB] hover:bg-white text-[#6B7280] font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all active:scale-95 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProcessImport}
                    className="bg-[#00BAF2] hover:bg-[#009FD0] text-white font-extrabold text-xs px-5 py-2 rounded-xl transition-all shadow-md shadow-[#00BAF2]/10 active:scale-95 cursor-pointer"
                  >
                    Ingest & Analyze
                  </button>
                </div>
              </motion.div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex gap-3 text-xs text-[#C62828] font-bold">
                <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </motion.div>
        )}

        {/* PREVIEW AND REVIEW STAGE */}
        {!loading && !importSuccess && entries.length > 0 && (
          <motion.div
            key="preview-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* PREVIEW HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#F8F9FB] border border-[#E5E7EB] rounded-2xl p-4">
              <div>
                <span className="text-[9px] font-black uppercase text-[#00BAF2] tracking-wider block">
                  Processing Complete
                </span>
                <h3 className="text-sm font-black text-[#002970] mt-0.5">
                  Parsed {entries.length} Ledger Transaction Entries
                </h3>
                <p className="text-[10px] font-semibold text-[#6B7280] mt-0.5">
                  Verify names, adjust amounts, or add missing rows before final import database synchronization.
                </p>
              </div>
              <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                <button
                  onClick={addRow}
                  className="flex-1 sm:flex-initial bg-white border border-[#E5E7EB] hover:bg-slate-50 text-[#002970] font-extrabold text-xs px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Row
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="flex-1 sm:flex-initial bg-[#00BAF2] hover:bg-[#009FD0] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-[#00BAF2]/10 active:scale-95 cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Save Ledger Entries
                </button>
              </div>
            </div>

            {/* BILLING COLUMN AUTO MAPPING VISUALIZATION */}
            {activeTab === "billing" && billingStats && (
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-[#E5E7EB]">
                  <span className="text-[11px] font-black text-[#002970] uppercase tracking-wider block">
                    🤖 Auto-Column Mapping Intelligence
                  </span>
                  <span className="text-[9px] bg-[#00C853]/10 border border-[#00C853]/20 text-[#00C853] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Successful
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(detectedColumns).map(([field, mappingText]) => (
                    <div key={field} className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-xl p-3 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-extrabold text-[#6B7280] uppercase tracking-wider">{field}</span>
                        <Check className="w-3.5 h-3.5 text-[#00C853]" />
                      </div>
                      <p className="text-[11px] font-bold text-[#002970] mt-1.5">{mappingText}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-[#E5E7EB]">
                  <div className="text-center">
                    <span className="text-[9px] uppercase tracking-wider text-[#6B7280] font-extrabold">File Type</span>
                    <span className="text-sm font-black text-[#002970] mt-1 block uppercase">{billingStats.file_type}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[9px] uppercase tracking-wider text-[#6B7280] font-extrabold">Total Entries</span>
                    <span className="text-sm font-black text-[#002970] mt-1 block">{billingStats.total_entries}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[9px] uppercase tracking-wider text-[#6B7280] font-extrabold">Total Amount</span>
                    <span className="text-sm font-black text-[#00C853] mt-1 block">₹{billingStats.total_amount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[9px] uppercase tracking-wider text-[#6B7280] font-extrabold">Breakdown</span>
                    <span className="text-[11px] font-extrabold text-[#002970] mt-1 block">
                      Sales: {billingStats.breakdown_by_type.sale || 0} | Udhar: {billingStats.breakdown_by_type.udhar || 0}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* OCR TEXT COLLAPSE (If OCR Tab) */}
            {activeTab === "ocr" && ocrText && (
              <div className="bg-[#EEF3F7]/50 border border-[#E5E7EB] rounded-2xl p-4">
                <span className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider block mb-2">
                  Raw Text Extracted by OCR Engine (Paytm Fallback Chain)
                </span>
                <pre className="text-xs text-[#002970] font-mono leading-relaxed bg-white border border-[#E5E7EB] rounded-xl p-3.5 whitespace-pre-wrap max-h-[120px] overflow-y-auto">
                  {ocrText}
                </pre>
              </div>
            )}

            {/* PREVIEW DATATABLE */}
            <div className="border border-[#E5E7EB] rounded-3xl bg-white overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#F8F9FB] border-b border-[#E5E7EB] text-[9px] font-black uppercase text-[#6B7280] tracking-widest">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Amount (₹)</th>
                    <th className="py-3 px-4">Transaction Type</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {entries.map((entry, idx) => {
                    const isEditing = editingIndex === idx;
                    
                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 text-xs font-semibold text-[#6B7280]">
                          {idx + 1}
                        </td>
                        
                        {/* Name Column */}
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg px-2.5 py-1 text-xs font-semibold text-[#002970] outline-none focus:border-[#00BAF2]"
                            />
                          ) : (
                            <span className="text-xs font-bold text-[#002970]">{entry.name}</span>
                          )}
                        </td>

                        {/* Amount Column */}
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editAmount}
                              onChange={(e) => setEditAmount(Number(e.target.value))}
                              className="w-40 bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg px-2.5 py-1 text-xs font-semibold text-[#002970] outline-none focus:border-[#00BAF2]"
                            />
                          ) : (
                            <span className="text-xs font-extrabold text-[#002970]">
                              ₹{entry.amount.toLocaleString("en-IN")}
                            </span>
                          )}
                        </td>

                        {/* Type Column */}
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <select
                              value={editType}
                              onChange={(e) => setEditType(e.target.value)}
                              className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg px-2.5 py-1 text-xs font-semibold text-[#002970] outline-none focus:border-[#00BAF2]"
                            >
                              <option value="udhar">Udhar (Credit/Debit)</option>
                              <option value="sale">Cash Sale (Received)</option>
                              <option value="payment">Payment Done</option>
                              <option value="expense">Expense</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide border ${
                              entry.type === "udhar" ? "bg-red-50 border-red-200 text-red-600" :
                              entry.type === "sale" ? "bg-green-50 border-green-200 text-green-600" :
                              "bg-slate-50 border-slate-200 text-slate-600"
                            }`}>
                              {entry.type}
                            </span>
                          )}
                        </td>

                        {/* Date Column */}
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg px-2.5 py-1 text-xs font-semibold text-[#002970] outline-none focus:border-[#00BAF2]"
                            />
                          ) : (
                            <span className="text-[11px] font-semibold text-[#6B7280]">
                              {entry.date || "Today"}
                            </span>
                          )}
                        </td>

                        {/* Notes Column */}
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              className="w-full bg-[#F8F9FB] border border-[#E5E7EB] rounded-lg px-2.5 py-1 text-xs font-semibold text-[#002970] outline-none focus:border-[#00BAF2]"
                            />
                          ) : (
                            <span className="text-[11px] font-medium text-[#6B7280] truncate block max-w-[150px]">
                              {entry.notes || "—"}
                            </span>
                          )}
                        </td>

                        {/* Actions Column */}
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveEdit(idx)}
                                  className="p-1 bg-green-50 border border-green-200 rounded text-green-600 hover:bg-green-100 transition-all cursor-pointer"
                                  title="Save Row"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingIndex(null)}
                                  className="p-1 bg-slate-50 border border-slate-200 rounded text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                                  title="Cancel Edit"
                                >
                                  ✕
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEdit(idx)}
                                  className="p-1 bg-[#EEF3F7] border border-[#E5E7EB] rounded text-[#002970] hover:bg-[#EEF3F7]/80 hover:text-[#00BAF2] transition-all cursor-pointer"
                                  title="Edit Row"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteRow(idx)}
                                  className="p-1 bg-red-50 border border-red-200 rounded text-red-600 hover:bg-red-100 hover:text-red-700 transition-all cursor-pointer"
                                  title="Delete Row"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* PREVIEW BOTTOM ACTIONS */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setEntries([]);
                  setFile(null);
                  setError(null);
                }}
                className="flex-1 border-2 border-[#E5E7EB] hover:bg-[#EEF3F7] text-[#002970] font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <span>Discard & Start Over</span>
              </button>
              <button
                onClick={handleConfirmImport}
                className="flex-1 bg-[#00BAF2] hover:bg-[#009FD0] text-white font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#00BAF2]/10 active:scale-95"
              >
                <Check className="w-4.5 h-4.5" />
                <span>Confirm and Import to AI Munshi</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAQs AND DOCUMENT INFORMATION PANEL */}
      <div className="bg-[#F8F9FB] border border-[#E5E7EB] rounded-3xl p-6">
        <h4 className="text-xs font-extrabold text-[#002970] uppercase tracking-wider mb-4 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#00BAF2]" /> Bookkeeping Integration Help
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed text-[#6B7280]">
          <div className="space-y-2">
            <h5 className="font-bold text-[#002970]">Typo and Handwriting Tolerance</h5>
            <p>
              The AI Munshi OCR integration features handwriting auto-correction: if a ledger entry says "Mhn 5OO" or "Rvi 12OO", Paytm Inference automatically matches it against existing customer database names "Mohan" or "Ravi" and cleans the amount to "500" or "1200".
            </p>
          </div>
          <div className="space-y-2">
            <h5 className="font-bold text-[#002970]">Automatic Data Mapping</h5>
            <p>
              When uploading CSV, Excel or JSON exports from Tally, Vyapar, Khatabook or other billing tools, headers such as Client, Buyer, Buyer Name, Customer, amount, total, rate, billing date will map to our system attributes automatically.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
