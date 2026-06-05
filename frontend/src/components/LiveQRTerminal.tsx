import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { 
  QrCode, 
  Download, 
  Share2, 
  Scan, 
  Volume2, 
  VolumeX, 
  CreditCard, 
  ShieldCheck, 
  ChevronLeft, 
  Delete,
  Building,
  RefreshCw,
  Sparkles
} from "lucide-react";

// --- TRANSLATIONS DICTIONARY ---
type SupportedLang = 'en' | 'hinglish';

const translations = {
  en: {
    terminalTitle: "AI Munshi Live Terminal",
    terminalSubtitle: "Simulate real-time UPI QR payments and test the CFO voice metrics & customer analytics.",
    merchantName: "Ramesh Kirana Store",
    upiId: "UPI ID: merchant_001@ybl",
    qrInstruct: "Accept mock payments from any simulated UPI provider. Use the simulator tool below to scan.",
    scanQrBtn: "Scan QR (Demo Flow)",
    download: "Download",
    share: "Share Link",
    soundboxTitle: "Soundbox Audio Alerts",
    soundboxSubtitle: "Play payment voice confirmations",
    alertsOn: "ALERTS ON",
    alertsOff: "ALERTS OFF",
    logTitle: "Live Transactions Terminal Log",
    syncActive: "Live Connection Active",
    noPayments: "No QR payments logged yet.",
    clickInstruct: "Click \"Scan QR (Demo Flow)\" to simulate a customer scanning your merchant code!",
    customerCol: "Customer",
    amountCol: "Amount",
    modeCol: "Mode",
    categoryCol: "Category",
    dateTimeCol: "Date & Time",
    sandboxTitle: "Quick Simulation Trigger Sandbox",
    sandboxSubtitle: "Instant mock triggers bypassing the UPI pin keyboard",
    payingTo: "Paying To",
    amountToPay: "Amount to Pay",
    customerName: "Customer Name",
    customerMobile: "Customer Mobile Number",
    proceedPay: "Proceed to Pay",
    enterPin: "ENTER 4-DIGIT UPI PIN",
    cancel: "CANCEL",
    confirmPay: "Confirm Payment",
    processing: "Processing UPI Payment...",
    secureUpi: "Secure BHIM UPI",
    successMsg: "Payment Successful",
    recipient: "Recipient",
    modeUpi: "UPI QR Code",
    done: "Done",
    merchantPayee: "Verified Merchant Payee",
    presetLabel: "Preset",
    soundboxLang: "Soundbox Language"
  },
  hinglish: {
    terminalTitle: "AI Munshi Live Terminal",
    terminalSubtitle: "Simulate karein real-time UPI QR payments aur check karein voice metrics aur analytics.",
    merchantName: "Ramesh Kirana Store",
    upiId: "UPI ID: merchant_001@ybl",
    qrInstruct: "Simulated UPI app se mock payments accept karein. Neeche diye simulator tool se scan karein.",
    scanQrBtn: "QR Scan Karein (Demo)",
    download: "Download",
    share: "Share Link",
    soundboxTitle: "Soundbox Audio Alerts",
    soundboxSubtitle: "Payment voice confirmations play karein",
    alertsOn: "ALERTS ON",
    alertsOff: "ALERTS OFF",
    logTitle: "Live Transactions Terminal Log",
    syncActive: "Live Connection Active",
    noPayments: "Abhi tak koi QR payments nahi hain.",
    clickInstruct: "\"QR Scan Karein (Demo)\" par click karke simulation check karein!",
    customerCol: "Grahak",
    amountCol: "Amount",
    modeCol: "Mode",
    categoryCol: "Category",
    dateTimeCol: "Date & Time",
    sandboxTitle: "Quick Simulation Trigger Sandbox",
    sandboxSubtitle: "Bina UPI pin ke instant mock trigger",
    payingTo: "Paying To",
    amountToPay: "Amount to Pay",
    customerName: "Grahak Ka Naam",
    customerMobile: "Grahak Ka Mobile Number",
    proceedPay: "Proceed to Pay",
    enterPin: "ENTER 4-DIGIT UPI PIN",
    cancel: "CANCEL",
    confirmPay: "Confirm Payment",
    processing: "Processing UPI Payment...",
    secureUpi: "Secure BHIM UPI",
    successMsg: "Payment Successful",
    recipient: "Recipient",
    modeUpi: "UPI QR Code",
    done: "Done",
    merchantPayee: "Verified Merchant Payee",
    presetLabel: "Preset",
    soundboxLang: "Soundbox Language"
  }
};

// --- HELPERS ---
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
};

const formatDate = (dateString: string): { date: string; time: string } => {
  const d = new Date(dateString);
  const dateStr = d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const timeStr = d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  return { date: dateStr, time: timeStr };
};

// Speech Alert function supporting English and Hinglish
const playVoiceAlert = (text: string, lang: SupportedLang = 'en') => {
  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported in this browser.');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.85; 
  utterance.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  if (lang === 'hinglish') {
    const hiVoice = voices.find(v => v.lang.includes('hi-IN') || v.lang.includes('hi'));
    if (hiVoice) {
      utterance.voice = hiVoice;
      utterance.lang = 'hi-IN';
    } else {
      const enIndVoice = voices.find(v => v.lang.includes('en-IN'));
      if (enIndVoice) {
        utterance.voice = enIndVoice;
        utterance.lang = 'en-IN';
      } else {
        utterance.lang = 'en-US';
      }
    }
  } else {
    const enVoice = voices.find(v => v.lang.includes('en-IN')) || voices.find(v => v.lang.includes('en'));
    if (enVoice) {
      utterance.voice = enVoice;
      utterance.lang = enVoice.lang;
    } else {
      utterance.lang = 'en-US';
    }
  }
  window.speechSynthesis.speak(utterance);
};

// --- TYPES ---
interface Transaction {
  id: number;
  amount: number;
  timestamp: string;
  category: string;
  payment_mode: string;
  customer_name: string;
  merchant_id: string;
}

interface LiveQRTerminalProps {
  merchantId?: string;
  onPaymentSuccess?: (customerName: string, amount: number) => void;
}

export default function LiveQRTerminal({ 
  merchantId = "merchant_001",
  onPaymentSuccess 
}: LiveQRTerminalProps) {
  const { language } = useLanguage();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCustomerSim, setShowCustomerSim] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceLang, setVoiceLang] = useState<SupportedLang>('en');

  useEffect(() => {
    if (language === 'hinglish') {
      setVoiceLang('hinglish');
    } else {
      setVoiceLang('en');
    }
  }, [language]);

  // Customer Sim Fields
  const [simStep, setSimStep] = useState<'FORM' | 'PIN' | 'PROCESSING' | 'SUCCESS'>('FORM');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [createdTxn, setCreatedTxn] = useState<any>(null);

  const t = translations[voiceLang];

  const qrData = `http://localhost:5173/pay?merchant=${merchantId}&name=${encodeURIComponent("Ramesh Kirana Store")}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}&color=0f172a`;

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/transactions/${merchantId}`);
      if (res.ok) {
        const data = await res.json();
        // Sort descending by timestamp
        const sorted = data.sort((a: Transaction, b: Transaction) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setTransactions(sorted);
      }
    } catch (err) {
      console.error("Error fetching terminal transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [merchantId]);

  const handleDownload = () => {
    window.open(qrCodeUrl, '_blank');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(qrData);
    alert(`Payment link copied to clipboard: ${qrData}`);
  };

  // Preset quick transaction trigger
  const handleTriggerPreset = async (name: string, amt: number) => {
    try {
      const res = await fetch("/api/v1/transactions/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amt,
          timestamp: new Date().toISOString(),
          category: "Grocery",
          payment_mode: "Digital",
          customer_name: name,
          merchant_id: merchantId
        })
      });

      if (res.ok) {
        if (voiceEnabled) {
          const speechText = voiceLang === 'hinglish' 
            ? `${name} se ${amt} rupees received hue hain.` 
            : `Payment of ${amt} rupees received from ${name}.`;
          playVoiceAlert(speechText, voiceLang);
        }
        await fetchTransactions();
        if (onPaymentSuccess) {
          onPaymentSuccess(name, amt);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !amount.trim()) {
      alert('Please fill in all details');
      return;
    }
    const amtVal = parseFloat(amount);
    if (isNaN(amtVal) || amtVal <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    setSimStep('PIN');
  };

  const handleKeyPress = (char: string) => {
    if (char === 'clear') {
      setPin(prev => prev.slice(0, -1));
    } else if (pin.length < 4) {
      setPin(prev => prev + char);
    }
  };

  const handlePaySubmit = async () => {
    if (pin.length !== 4) {
      alert('Please enter a 4-digit UPI PIN');
      return;
    }

    setSimStep('PROCESSING');
    
    try {
      // Simulate network request delay (1.5s)
      await new Promise(resolve => setTimeout(resolve, 1500));

      const res = await fetch("/api/v1/transactions/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          timestamp: new Date().toISOString(),
          category: "Grocery",
          payment_mode: "Digital",
          customer_name: customerName,
          merchant_id: merchantId
        })
      });

      if (!res.ok) throw new Error("Payment rejection by backend");
      
      const txn = await res.json();
      txn.transaction_id = txn.transaction_id || `TXN-2026-${Math.floor(100+Math.random()*900)}-${Math.floor(10+Math.random()*90)}`;
      setCreatedTxn(txn);
      setSimStep('SUCCESS');

      // Trigger Soundbox alert
      if (voiceEnabled) {
        const speechText = voiceLang === 'hinglish' 
          ? `${customerName} se ${amount} rupees received hue hain.` 
          : `Payment received. Amount ${amount} rupees from ${customerName}.`;
        playVoiceAlert(speechText, voiceLang);
      }

      await fetchTransactions();
      if (onPaymentSuccess) {
        onPaymentSuccess(customerName, parseFloat(amount));
      }

    } catch (err) {
      console.error(err);
      alert('Payment processing failed. Please try again.');
      setSimStep('FORM');
      setPin('');
    }
  };

  const handleCloseSim = () => {
    setShowCustomerSim(false);
    setSimStep('FORM');
    setCustomerName('');
    setCustomerPhone('');
    setAmount('');
    setPin('');
    setCreatedTxn(null);
  };

  return (
    <div className="flex-grow flex flex-col p-6 overflow-y-auto space-y-6">
      
      {/* HEADER BANNER */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <QrCode className="w-7 h-7 text-[#00BAF2]" />
            {t.terminalTitle}
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            {t.terminalSubtitle}
          </p>
        </div>
        <button 
          onClick={fetchTransactions}
          className="p-3 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-2xl hover:bg-slate-700 transition cursor-pointer"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: QR & SETTINGS */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* MERCHANT QR CARD */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col items-center text-center shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00BAF2]/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <h3 className="text-white font-extrabold text-lg">{t.merchantName}</h3>
            <p className="text-[#00BAF2] text-xs font-semibold">{t.upiId}</p>
            
            {/* Real visual QR container */}
            <div className="my-6 p-4 bg-white rounded-3xl shadow-inner relative group border-4 border-slate-800">
              <img 
                src={qrCodeUrl} 
                alt="Payment QR Code" 
                className="w-48 h-48 rounded-xl object-contain"
              />
              <div className="absolute inset-0 bg-[#00BAF2]/5 rounded-xl pointer-events-none flex flex-col items-center justify-center">
                {/* Laser animation */}
                <div className="w-4/5 h-[2px] bg-[#00BAF2] shadow-[0_0_8px_#00BAF2] rounded-full animate-bounce"></div>
              </div>
            </div>

            <p className="text-slate-400 text-[11px] max-w-xs leading-relaxed mb-6">
              {t.qrInstruct}
            </p>

            <div className="w-full space-y-3">
              <button 
                onClick={() => setShowCustomerSim(true)}
                className="w-full py-3 bg-[#00BAF2] hover:bg-[#009bd0] text-white font-bold rounded-2xl shadow-lg shadow-[#00BAF2]/20 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Scan className="w-4.5 h-4.5" />
                {t.scanQrBtn}
              </button>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleDownload}
                  className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold rounded-2xl transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t.download}
                </button>
                <button 
                  onClick={handleShare}
                  className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold rounded-2xl transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  {t.share}
                </button>
              </div>
            </div>
          </div>

          {/* SOUNDBOX CONFIG */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-lg space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-[#D32F2F]/10 border border-[#D32F2F]/20 flex items-center justify-center">
                {voiceEnabled ? (
                  <Volume2 className="w-5 h-5 text-[#D32F2F] animate-pulse" />
                ) : (
                  <VolumeX className="w-5 h-5 text-slate-500" />
                )}
              </div>
              <div>
                <h4 className="text-white font-bold text-sm">{t.soundboxTitle}</h4>
                <p className="text-slate-400 text-[10px]">{t.soundboxSubtitle}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{t.soundboxLang}</span>
              <div className="flex items-center justify-between">
                {/* Language Switch */}
                <div className="bg-slate-800 p-1 rounded-2xl flex border border-slate-700">
                  <button 
                    onClick={() => setVoiceLang('hinglish')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                      voiceLang === 'hinglish' ? 'bg-[#D32F2F] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Hinglish
                  </button>
                  <button 
                    onClick={() => setVoiceLang('en')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                      voiceLang === 'en' ? 'bg-[#D32F2F] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    English
                  </button>
                </div>

                {/* Speaker Toggle Switch */}
                <button 
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className={`px-3 py-2 rounded-2xl text-[10px] font-black border transition cursor-pointer ${
                    voiceEnabled 
                      ? "bg-[#D32F2F]/10 text-[#D32F2F] border-[#D32F2F]/30" 
                      : "bg-slate-800 text-slate-500 border-slate-700"
                  }`}
                >
                  {voiceEnabled ? t.alertsOn : t.alertsOff}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE TRANSACTIONS */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-lg flex flex-col h-[400px]">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="text-white font-extrabold text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#00BAF2]" />
                {t.logTitle}
              </h3>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span className="w-2 h-2 rounded-full bg-[#00C853] animate-ping"></span>
                <span className="font-extrabold tracking-wider uppercase">{t.syncActive}</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00BAF2]"></div>
                </div>
              ) : transactions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-500">
                  <Scan className="w-12 h-12 text-slate-700" />
                  <p className="text-sm font-semibold">{t.noPayments}</p>
                  <p className="text-[11px] max-w-xs">{t.clickInstruct}</p>
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-left text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                      <th className="px-6 py-3">{t.customerCol}</th>
                      <th className="px-6 py-3">{t.amountCol}</th>
                      <th className="px-6 py-3">{t.modeCol}</th>
                      <th className="px-6 py-3">{t.categoryCol}</th>
                      <th className="px-6 py-3">{t.dateTimeCol}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {transactions.map((txn, index) => {
                      const { date, time } = formatDate(txn.timestamp);
                      const isNewest = index === 0;
                      return (
                        <tr 
                          key={txn.id} 
                          className={`text-xs hover:bg-slate-800/30 transition-all ${
                            isNewest ? "bg-[#00BAF2]/5 font-semibold text-white border-l-4 border-[#00BAF2]" : "text-slate-300"
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-bold text-white">{txn.customer_name}</div>
                              <div className="text-[10px] text-slate-500 font-medium">{t.merchantPayee}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-extrabold text-white">
                            {formatCurrency(txn.amount)}
                          </td>
                          <td className="px-6 py-4">
                            <span className="bg-[#00BAF2]/10 text-[#00BAF2] px-2 py-0.5 rounded-full text-[9px] font-black uppercase">
                              {t.modeUpi}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-400 font-medium">
                            {txn.category}
                          </td>
                          <td className="px-6 py-4 text-slate-400">
                            <div>{date}</div>
                            <div className="text-[10px] text-slate-500 font-medium">{time}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* QUICK PRESET GENERATOR */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-white font-bold text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#FF9100]" />
                  {t.sandboxTitle}
                </h4>
                <p className="text-slate-400 text-[10px]">{t.sandboxSubtitle}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button 
                onClick={() => handleTriggerPreset("Kiran Rao", 1500)}
                className="py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-2xl text-xs font-bold transition cursor-pointer"
              >
                + ₹1,500 (Kiran)
              </button>
              <button 
                onClick={() => handleTriggerPreset("Sunil Joshi", 800)}
                className="py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-2xl text-xs font-bold transition cursor-pointer"
              >
                + ₹800 (Sunil)
              </button>
              <button 
                onClick={() => handleTriggerPreset("Sandeep Gupta", 5000)}
                className="py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-2xl text-xs font-bold transition cursor-pointer"
              >
                + ₹5,000 (Sandeep)
              </button>
              <button 
                onClick={() => handleTriggerPreset("Rahul Sharma", 2500)}
                className="py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-2xl text-xs font-bold transition cursor-pointer"
              >
                + ₹2,500 (Rahul)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* UPI QR PAYMENT SIMULATOR MODAL OVERLAY */}
      {showCustomerSim && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col min-h-[580px] text-slate-800 border-4 border-slate-900 animate-in fade-in zoom-in-95 duration-200">
            
            {/* STEP 1: FILL FORM DETALS */}
            {simStep === 'FORM' && (
              <div className="p-6 flex flex-col flex-1 bg-[#F3F4F6]">
                <div className="flex items-center justify-between mb-6">
                  <button 
                    onClick={handleCloseSim}
                    className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-bold cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" /> {t.cancel}
                  </button>
                  <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                    <ShieldCheck className="w-4.5 h-4.5" /> {t.secureUpi}
                  </div>
                </div>

                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-[#002970] text-white flex items-center justify-center font-black text-xl mx-auto shadow-md">
                    M
                  </div>
                  <h4 className="font-extrabold text-[#002970] text-base mt-2">{t.merchantName}</h4>
                  <p className="text-slate-400 text-[10px]">payingto: merchant_001@ybl</p>
                </div>

                <form onSubmit={handleDetailsSubmit} className="flex-1 flex flex-col space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">{t.payingTo}</label>
                    <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
                      <Building className="w-4 h-4 text-slate-500" />
                      <span className="font-extrabold text-xs text-[#002970]">{t.merchantName}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">{t.amountToPay}</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-[#002970]">₹</span>
                      <input 
                        type="number"
                        placeholder="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-2xl font-black text-[#002970] shadow-sm focus:outline-none focus:border-[#00BAF2]"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">{t.customerName}</label>
                    <input 
                      type="text"
                      placeholder="e.g. Pathu"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 shadow-sm focus:outline-none focus:border-[#00BAF2]"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">{t.customerMobile}</label>
                    <input 
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 shadow-sm focus:outline-none focus:border-[#00BAF2]"
                      required
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-3.5 bg-[#002970] hover:bg-[#001c4e] text-white font-bold rounded-2xl shadow-lg mt-auto cursor-pointer transition"
                  >
                    {t.proceedPay}
                  </button>
                </form>
              </div>
            )}

            {/* STEP 2: UPI PIN KEYBOARD */}
            {simStep === 'PIN' && (
              <div className="p-6 flex flex-col flex-1 bg-slate-900 text-white">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
                  <div>
                    <span className="text-[10px] text-slate-500 font-extrabold uppercase block">{t.payingTo}</span>
                    <span className="font-extrabold text-sm">{t.merchantName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-extrabold uppercase block">{t.amountCol}</span>
                    <span className="font-black text-[#00BAF2] text-lg">₹{amount}</span>
                  </div>
                </div>

                <div className="text-center my-6 space-y-4">
                  <span className="text-xs font-extrabold text-slate-400 tracking-wider">{t.enterPin}</span>
                  <div className="flex items-center justify-center gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-4 h-4 rounded-full border-2 transition-all ${
                          i < pin.length ? "bg-[#00BAF2] border-[#00BAF2] scale-110" : "border-slate-600 bg-transparent"
                        }`}
                      ></div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-y-4 gap-x-6 py-6 mt-auto">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                    <button 
                      key={num} 
                      onClick={() => handleKeyPress(num)}
                      className="h-12 flex items-center justify-center text-lg font-black bg-slate-800/40 hover:bg-slate-800 rounded-full border border-slate-800 active:scale-95 transition cursor-pointer"
                    >
                      {num}
                    </button>
                  ))}
                  <button 
                    onClick={handleCloseSim}
                    className="h-12 flex items-center justify-center text-[10px] font-black text-rose-500 bg-slate-800/20 hover:bg-slate-850 rounded-full border border-slate-800 transition cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button 
                    onClick={() => handleKeyPress('0')}
                    className="h-12 flex items-center justify-center text-lg font-black bg-slate-800/40 hover:bg-slate-800 rounded-full border border-slate-800 active:scale-95 transition cursor-pointer"
                  >
                    0
                  </button>
                  <button 
                    onClick={() => handleKeyPress('clear')}
                    className="h-12 flex items-center justify-center bg-slate-800/40 hover:bg-slate-800 rounded-full border border-slate-800 text-slate-400 transition cursor-pointer"
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                </div>

                <button 
                  onClick={handlePaySubmit}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg transition mt-4 cursor-pointer"
                >
                  {t.confirmPay}
                </button>
              </div>
            )}

            {/* STEP 3: PROCESSING SPINNER */}
            {simStep === 'PROCESSING' && (
              <div className="p-6 flex flex-col flex-1 items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00BAF2] mb-4"></div>
                <h3 className="font-extrabold text-base text-[#002970]">{t.processing}</h3>
                <p className="text-slate-400 text-xs mt-1">Establishing secure bank link</p>
              </div>
            )}

            {/* STEP 4: SUCCESS RECEIPT */}
            {simStep === 'SUCCESS' && createdTxn && (
              <div className="p-6 flex flex-col flex-1 bg-white items-center text-center justify-between">
                
                <div className="my-auto space-y-4 w-full">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto text-emerald-600">
                    <ShieldCheck className="w-10 h-10 animate-bounce" />
                  </div>
                  
                  <h3 className="text-emerald-600 font-black text-xl">{t.successMsg}</h3>
                  <h2 className="text-3xl font-black text-[#002970]">{formatCurrency(createdTxn.amount)}</h2>
                  
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-left text-xs space-y-2.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">{t.recipient}</span>
                      <span className="text-slate-800 font-extrabold">{t.merchantName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">{t.customerCol}</span>
                      <span className="text-slate-800 font-extrabold">{createdTxn.customer_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Transaction ID</span>
                      <span className="text-slate-800 font-bold font-mono text-[10px]">{createdTxn.transaction_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">{t.modeCol}</span>
                      <span className="text-slate-800 font-extrabold">{t.modeUpi}</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleCloseSim}
                  className="w-full py-3.5 bg-[#002970] hover:bg-[#001c4e] text-white font-bold rounded-2xl transition cursor-pointer mt-6"
                >
                  {t.done}
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
