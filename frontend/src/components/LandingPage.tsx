import React, { useState, useEffect } from "react";

interface LandingPageProps {
  onStartDashboard: (phoneNumber?: string) => void;
}

export default function LandingPage({ onStartDashboard }: LandingPageProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Dynamically load Google Font "Inter" for a clean modern typography
  useEffect(() => {
    // Override body style for landing page light theme
    const originalBg = document.body.style.backgroundColor;
    const originalColor = document.body.style.color;

    document.body.style.backgroundColor = "#F8F9FB";
    document.body.style.color = "#111827";

    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playpen+Sans:wght@500;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    return () => {
      document.body.style.backgroundColor = originalBg;
      document.body.style.color = originalColor;
      document.head.removeChild(link);
    };
  }, []);

  const handleGetStarted = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      setErrorMsg("कृपया अपना मोबाइल नंबर दर्ज करें (Please enter your mobile number)");
      return;
    }
    if (!/^\d{10}$/.test(phoneNumber.trim())) {
      setErrorMsg("कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें (Please enter a valid 10-digit number)");
      return;
    }
    setErrorMsg("");
    onStartDashboard(phoneNumber);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Blog posts data
  const blogs = [
    {
      image: "/blog_gst.png",
      tag: "GST & Tax",
      title: "GST Frequently Asked Questions for Small Retailers",
      desc: "Learn about GST registration limits, filing composite tax, and how digital ledger apps can simplify compliance for your local shop.",
      readTime: "4 mins read",
    },
    {
      image: "/blog_kirana_tech.png",
      tag: "Technology",
      title: "How Digital Bahi Khatas are Transforming Indian Kirana Stores",
      desc: "From traditional paper registers to voice-activated AI cashflow tools: explore the massive digital shift in small retail business accounting.",
      readTime: "5 mins read",
    },
    {
      image: "/blog_gst.png",
      tag: "Business Growth",
      title: "5 Tips to Recover Pending Payments Without Ruining Relationships",
      desc: "Outstanding credits hurting your cashflow? Use these friendly, automated reminder templates to collect your money politely and 3x faster.",
      readTime: "3 mins read",
    },
  ];

  return (
    <div className="font-['Inter',sans-serif] bg-[#F8F9FB] text-[#111827] antialiased selection:bg-[#00BAF2]/30 selection:text-[#002970] overflow-x-hidden min-h-screen">
      
      {/* --- HEADER --- */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-[#E5E7EB] z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#00BAF2] to-[#002970] flex items-center justify-center shadow-md shadow-[#00BAF2]/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
            </div>
            <div>
              <span className="text-2xl font-extrabold tracking-tight text-[#002970]">AI Munshi</span>
              <span className="block text-[10px] uppercase tracking-widest text-[#00BAF2] font-semibold -mt-1">Digital Voice CFO</span>
            </div>
          </div>

          {/* Nav Links - Desktop */}
          <nav className="hidden md:flex items-center gap-8 text-[15px] font-semibold text-[#6B7280]">
            <button onClick={() => scrollToSection("features")} className="hover:text-[#002970] transition-colors cursor-pointer">Features</button>
            <button onClick={() => scrollToSection("why-munshi")} className="hover:text-[#002970] transition-colors cursor-pointer">Why AI Munshi</button>
            <button onClick={() => scrollToSection("tally-sync")} className="hover:text-[#002970] transition-colors cursor-pointer">Tally Integration</button>
            <button onClick={() => scrollToSection("blogs")} className="hover:text-[#002970] transition-colors cursor-pointer">Blog</button>
            <button onClick={() => scrollToSection("faq")} className="hover:text-[#002970] transition-colors cursor-pointer">FAQs</button>
          </nav>

          {/* CTAs */}
          <div className="flex items-center gap-4">
            {/* Phone badge */}
            <a href="tel:9606800800" className="hidden lg:flex items-center gap-2 bg-[#FFF5F5] border border-[#FFD8D8] text-[#D32F2F] text-sm font-bold px-4 py-2 rounded-full hover:bg-[#FFEBEB] transition-colors">
              <span className="text-base">📞</span>
              <span>96068 00800</span>
            </a>
            
            {/* Log In Button */}
            <button 
              onClick={() => onStartDashboard()} 
              className="px-5 py-2.5 rounded-xl border-2 border-[#002970] text-[#002970] font-bold text-sm hover:bg-[#002970] hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
            >
              Log In
            </button>
          </div>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="bg-gradient-to-r from-[#FAF2EE] to-[#FFF9F6] border-b border-[#E5E7EB] pt-12 pb-20 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] bg-[#00BAF2]/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#00C853]/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Info & Form */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            {/* Handwritten 'aur bhi' overlay */}
            <div className="relative inline-block w-fit">
              <span className="absolute -top-6 left-16 text-sm font-bold text-[#E53935] font-['Playpen_Sans'] rotate-[-6deg] select-none bg-yellow-100 px-2 py-0.5 rounded-md border border-yellow-200">
                (aur bhi)
              </span>
              <h1 className="text-4xl sm:text-5xl md:text-[68px] leading-tight md:leading-[76px] font-extrabold text-[#002970] tracking-tight">
                Hisab-Kitab hua <br />
                <span className="text-[#00BAF2] relative">
                  Aasan
                  <svg className="absolute bottom-1 left-0 w-full h-3 text-[#00BAF2]/30 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                    <path d="M0,5 Q50,10 100,5" stroke="currentColor" strokeWidth="8" fill="none" />
                  </svg>
                </span> <br />
                with AI Munshi
              </h1>
            </div>

            <p className="mt-6 text-lg sm:text-xl text-[#6B7280] leading-relaxed max-w-xl">
              The #1 AI voice-powered ledger built for Indian small business owners. 
              Manage udhar, track sales, and collect money 3x faster with simple voice inputs in Hindi, Hinglish, & English.
            </p>

            {/* Form */}
            <form onSubmit={handleGetStarted} className="mt-10 bg-white p-2.5 rounded-2xl border border-[#E5E7EB] shadow-xl shadow-slate-200/50 flex flex-col sm:flex-row items-stretch gap-2 max-w-lg">
              <div className="flex items-center px-4 border-r border-[#E5E7EB] text-[#111827] font-bold text-base bg-slate-50 rounded-xl sm:rounded-none">
                <span className="text-[#6B7280] mr-1.5 font-semibold">+91</span>
                <span className="w-[1px] h-4 bg-slate-300 mx-2 hidden sm:block"></span>
              </div>
              <input
                type="text"
                maxLength={10}
                placeholder="अपना मोबाइल नंबर दर्ज करें (Enter Mobile Number)"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                className="flex-1 py-3 px-4 outline-none text-base text-[#111827] placeholder-[#A0AEC0] font-medium"
              />
              <button
                type="submit"
                className="bg-[#00BAF2] hover:bg-[#009FD0] text-white font-bold text-base px-8 py-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-[#00BAF2]/20"
              >
                <span>Get Started</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </form>
            {errorMsg && <p className="mt-2 text-sm text-[#E53935] font-semibold flex items-center gap-1.5">⚠️ {errorMsg}</p>}

            {/* Bottom Value Props */}
            <div className="mt-12 p-6 bg-white/90 border border-[#E5E7EB] rounded-2xl max-w-xl shadow-sm">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#002970] mb-4">
                One platform for all your business needs
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#00BAF2]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs text-[#00BAF2]">🎙️</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#111827]">Manage Digital Bahi Khata</h4>
                    <p className="text-xs text-[#6B7280] mt-0.5">Just speak to log credit/debit records instantly.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#00C853]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs text-[#00C853]">💬</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#111827]">Send Payment Reminders</h4>
                    <p className="text-xs text-[#6B7280] mt-0.5">Polite automatic alerts on WhatsApp & SMS.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Premium Mockup Illustrations */}
          <div className="lg:col-span-5 relative w-full flex justify-center lg:justify-end mt-8 lg:mt-0">
            {/* Wrapper for the layered mockups */}
            <div className="relative w-full max-w-[480px]">
              
              {/* Merchant Illustration (Placed at the back/base) */}
              <div className="absolute -top-16 -left-12 w-48 h-48 opacity-20 lg:opacity-30 mix-blend-multiply filter blur-sm pointer-events-none" />
              <img 
                src="/hero_merchant.png" 
                alt="AI Munshi merchant representation" 
                className="w-full h-auto rounded-3xl object-cover shadow-2xl border border-white/60 relative z-10 transition-transform duration-700 hover:scale-[1.02]"
              />

              {/* Float Card 1: Desktop Mockup Overlay */}
              <div className="absolute -bottom-8 -left-6 md:-left-12 bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-2xl w-72 z-20 hidden sm:block animate-bounce-slow">
                <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB] mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E53935]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FFB300]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00C853]" />
                  </div>
                  <span className="text-[10px] font-bold text-[#6B7280]">Desktop Bahi Khata</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-[#F8F9FB] p-2 rounded-lg">
                    <div>
                      <p className="text-xs font-bold text-[#002970]">Amit Verma</p>
                      <p className="text-[9px] text-[#6B7280]">Today, 11:30 AM</p>
                    </div>
                    <span className="text-xs font-extrabold text-[#E53935]">₹1,200 You Give</span>
                  </div>
                  <div className="flex justify-between items-center bg-[#F8F9FB] p-2 rounded-lg">
                    <div>
                      <p className="text-xs font-bold text-[#002970]">Priya Sharma</p>
                      <p className="text-[9px] text-[#6B7280]">Yesterday, 5:40 PM</p>
                    </div>
                    <span className="text-xs font-extrabold text-[#00C853]">₹450 You Got</span>
                  </div>
                </div>
              </div>

              {/* Float Card 2: Voice Overlay */}
              <div className="absolute top-12 -right-4 bg-[#002970] text-white p-3 rounded-2xl shadow-xl w-52 z-20 flex items-center gap-3 border border-white/10 hover:scale-105 transition-transform duration-300">
                <div className="w-10 h-10 rounded-full bg-[#00BAF2] flex items-center justify-center shrink-0 animate-pulse">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-[#00BAF2]">AI Voice Entry</p>
                  <p className="text-xs font-bold leading-tight">"Sunil Ko ₹500 Udhaar"</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* --- TRUST & INTEGRATION SECTION --- */}
      <section className="py-12 bg-white border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Card 1: Users & App Store */}
          <div className="bg-[#EEF3F7] p-8 rounded-3xl border border-[#E5E7EB] flex flex-col sm:flex-row items-center gap-6 justify-between hover:shadow-md transition-shadow">
            <div className="text-center sm:text-left">
              <span className="text-4xl font-extrabold text-[#002970]">10 Lakh+</span>
              <h3 className="text-base font-bold text-[#111827] mt-1">Businesses using our free apps</h3>
              <p className="text-xs text-[#6B7280] mt-0.5">Access your accounts anywhere, anytime, securely.</p>
            </div>
            <div className="flex flex-col gap-2 shrink-0 w-36">
              <button onClick={() => onStartDashboard()} className="bg-[#111827] hover:bg-black text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-sm">
                <span>🤖 Play Store</span>
              </button>
              <button onClick={() => onStartDashboard()} className="bg-[#111827] hover:bg-black text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-sm">
                <span>🍏 App Store</span>
              </button>
            </div>
          </div>

          {/* Card 2: Tally Sync */}
          <div className="bg-[#EEF3F7] p-8 rounded-3xl border border-[#E5E7EB] flex flex-col sm:flex-row items-center gap-6 justify-between hover:shadow-md transition-shadow">
            <div className="text-center sm:text-left">
              <span className="text-4xl font-extrabold text-[#002970]">Tally & Vyapar</span>
              <h3 className="text-base font-bold text-[#111827] mt-1">Already use accounting tools?</h3>
              <p className="text-xs text-[#6B7280] mt-0.5">Sync Tally and Vyapar ledger to mobile with AI Munshi.</p>
            </div>
            <button 
              onClick={() => onStartDashboard()} 
              className="bg-[#00BAF2] hover:bg-[#009FD0] text-white text-sm font-bold py-3.5 px-6 rounded-xl shrink-0 cursor-pointer shadow-md shadow-[#00BAF2]/10 transition-all active:scale-95"
            >
              Go to Sync ↗
            </button>
          </div>

        </div>
      </section>

      {/* --- POWERFUL FEATURES SECTION --- */}
      <section id="features" className="py-24 bg-[#F8F9FB] border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-extrabold text-[#00BAF2] uppercase tracking-widest block mb-3">
              POWERFUL FEATURES TO HELP YOU
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-[56px] leading-tight md:leading-[64px] font-extrabold text-[#002970] tracking-tight">
              Built with features for growing businesses
            </h2>
          </div>

          {/* Two Large Feature Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            
            {/* Feature 1: Voice Ledger */}
            <div className="bg-white p-10 rounded-3xl border border-[#E5E7EB] hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-[#00BAF2]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 text-[#00BAF2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-extrabold text-[#002970]">AI Voice-Powered Bahi Khata</h3>
                <p className="text-base text-[#6B7280] mt-3 leading-relaxed">
                  No more slow manual typing on small screens. Just tap the mic button and speak. AI Munshi recognizes 
                  names, amounts, and dates in Hindi, English, or mixed Hinglish, adding entries instantly to the ledger.
                </p>
                <ul className="mt-6 space-y-2.5">
                  <li className="flex items-center gap-2.5 text-sm font-semibold text-[#111827]">
                    <span className="text-[#00C853]">✓</span> Speak natural language commands
                  </li>
                  <li className="flex items-center gap-2.5 text-sm font-semibold text-[#111827]">
                    <span className="text-[#00C853]">✓</span> Multi-dialect and accent voice recognition
                  </li>
                  <li className="flex items-center gap-2.5 text-sm font-semibold text-[#111827]">
                    <span className="text-[#00C853]">✓</span> Live speech-to-text transcript confirmation
                  </li>
                </ul>
              </div>
              <div className="mt-8 border-t border-[#E5E7EB] pt-6 flex items-center justify-between">
                <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wide">Language Support: Hindi, English, Hinglish</span>
                <span className="text-[#00BAF2] font-bold text-sm group-hover:translate-x-1.5 transition-transform duration-300">Learn More →</span>
              </div>
            </div>

            {/* Feature 2: WhatsApp Reminder */}
            <div className="bg-white p-10 rounded-3xl border border-[#E5E7EB] hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-[#00C853]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 text-[#00C853]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-extrabold text-[#002970]">Smart Payment Reminders</h3>
                <p className="text-base text-[#6B7280] mt-3 leading-relaxed">
                  Stuck with massive pending credits? Send automatic, polite billing summaries and collection alerts 
                  via WhatsApp, SMS, or Call reminders. Keep track of outstanding balances and get paid 3x faster.
                </p>
                <ul className="mt-6 space-y-2.5">
                  <li className="flex items-center gap-2.5 text-sm font-semibold text-[#111827]">
                    <span className="text-[#00C853]">✓</span> One-tap WhatsApp payment collection links
                  </li>
                  <li className="flex items-center gap-2.5 text-sm font-semibold text-[#111827]">
                    <span className="text-[#00C853]">✓</span> Customized auto-reminders in customer's language
                  </li>
                  <li className="flex items-center gap-2.5 text-sm font-semibold text-[#111827]">
                    <span className="text-[#00C853]">✓</span> Full transaction and reminder log history
                  </li>
                </ul>
              </div>
              <div className="mt-8 border-t border-[#E5E7EB] pt-6 flex items-center justify-between">
                <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wide">Integrated Channels: WhatsApp, SMS</span>
                <span className="text-[#00BAF2] font-bold text-sm group-hover:translate-x-1.5 transition-transform duration-300">Learn More →</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* --- SECONDARY FEATURES SECTION ("AND THAT'S NOT ALL...") --- */}
      <section id="why-munshi" className="py-20 bg-[#EEF3F7] border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-[#6B7280] tracking-widest uppercase block mb-2">AND THAT'S NOT ALL...</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#002970] tracking-tight">Everything a smart merchant needs</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-2xl border border-[#E5E7EB] hover:-translate-y-1 transition-all duration-300">
              <div className="w-10.5 h-10.5 rounded-lg bg-[#00BAF2]/10 flex items-center justify-center mb-5">
                <span className="text-xl">🏪</span>
              </div>
              <h3 className="text-lg font-bold text-[#002970]">Multiple Business Management</h3>
              <p className="text-sm text-[#6B7280] mt-2 leading-relaxed">
                Manage accounts, credits, and sales across multiple shops or branches easily with a single login dashboard.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-2xl border border-[#E5E7EB] hover:-translate-y-1 transition-all duration-300">
              <div className="w-10.5 h-10.5 rounded-lg bg-[#00BAF2]/10 flex items-center justify-center mb-5">
                <span className="text-xl">☁️</span>
              </div>
              <h3 className="text-lg font-bold text-[#002970]">Automatic Secure Backup</h3>
              <p className="text-sm text-[#6B7280] mt-2 leading-relaxed">
                Your data is automatically synchronized with our secure cloud database, so you never lose your ledger records.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-2xl border border-[#E5E7EB] hover:-translate-y-1 transition-all duration-300">
              <div className="w-10.5 h-10.5 rounded-lg bg-[#00BAF2]/10 flex items-center justify-center mb-5">
                <span className="text-xl">📊</span>
              </div>
              <h3 className="text-lg font-bold text-[#002970]">Business CFO Reports</h3>
              <p className="text-sm text-[#6B7280] mt-2 leading-relaxed">
                Get instant, AI-calculated loan readiness grades, cashflow insights, and monthly PDF statements.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* --- TALLY ON MOBILE CALLOUT (BLUE CARD) --- */}
      <section id="tally-sync" className="py-16 bg-[#F8F9FB] border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-[#002970] rounded-3xl text-white p-8 md:p-12 shadow-2xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-10">
            {/* Background design accents */}
            <div className="absolute right-0 bottom-0 w-80 h-80 bg-[#00BAF2]/10 rounded-full blur-[80px] pointer-events-none" />
            
            {/* Left Col */}
            <div className="lg:max-w-xl">
              <span className="bg-[#00BAF2] text-[#002970] text-xs font-extrabold uppercase px-3 py-1 rounded-md tracking-wider">
                If you are using Tally, check this out!
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-4 leading-tight">
                The #1 AI assistant on mobile for Tally users
              </h2>
              <p className="text-[#E5E7EB] text-base mt-3 leading-relaxed">
                Access your Tally ledger records and automate collection reminders on-the-go. Sync files in seconds and let AI Munshi do your collections work.
              </p>
              <button 
                onClick={() => onStartDashboard()} 
                className="mt-6 bg-white text-[#002970] hover:bg-slate-100 font-extrabold text-sm px-6 py-3.5 rounded-xl transition-all cursor-pointer shadow-md shadow-black/10 active:scale-95"
              >
                Learn More
              </button>
            </div>

            {/* Right Col: Benefits list */}
            <div className="w-full lg:w-96 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#00BAF2]/20 flex items-center justify-center shrink-0">
                  <span className="text-xs text-[#00BAF2]">⚡</span>
                </div>
                <span className="text-sm font-bold">Collect money faster</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#00BAF2]/20 flex items-center justify-center shrink-0">
                  <span className="text-xs text-[#00BAF2]">🎙️</span>
                </div>
                <span className="text-sm font-bold">Manage sales & ledgers via voice</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#00BAF2]/20 flex items-center justify-center shrink-0">
                  <span className="text-xs text-[#00BAF2]">🛡️</span>
                </div>
                <span className="text-sm font-bold">100% Secure & encrypted data</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* --- BLOG SECTION --- */}
      <section id="blogs" className="py-24 bg-white border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#002970] tracking-tight">Our Blogs</h2>
            <p className="text-sm text-[#6B7280] mt-2">Expert guides and advice to help run and grow your business.</p>
          </div>

          {/* Carousel Slider */}
          <div className="relative">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {blogs.map((blog, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full">
                  <div className="h-48 overflow-hidden bg-slate-50 relative">
                    <img 
                      src={blog.image} 
                      alt={blog.title} 
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" 
                    />
                  </div>
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="bg-[#EEF3F7] text-[#002970] text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md tracking-wider">
                        {blog.tag}
                      </span>
                      <h3 className="text-lg font-extrabold text-[#002970] mt-3 line-clamp-2 leading-snug">
                        {blog.title}
                      </h3>
                      <p className="text-xs text-[#6B7280] mt-2 line-clamp-3 leading-relaxed">
                        {blog.desc}
                      </p>
                    </div>
                    <div className="mt-5 border-t border-[#E5E7EB] pt-4 flex items-center justify-between text-xs font-bold">
                      <span className="text-[#6B7280]">{blog.readTime}</span>
                      <button onClick={() => onStartDashboard()} className="text-[#00BAF2] hover:text-[#002970] transition-colors cursor-pointer">
                        Read More...
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Slider Dots */}
            <div className="flex items-center justify-center gap-2 mt-10">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00BAF2]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#E5E7EB]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#E5E7EB]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#E5E7EB]" />
            </div>
          </div>

          <div className="text-center mt-12">
            <button 
              onClick={() => onStartDashboard()} 
              className="bg-[#00BAF2] hover:bg-[#009FD0] text-white font-extrabold text-sm px-8 py-3.5 rounded-xl cursor-pointer shadow-md shadow-[#00BAF2]/10 transition-all active:scale-95"
            >
              View All Articles
            </button>
          </div>
        </div>
      </section>

      {/* --- FAQ SECTION --- */}
      <section id="faq" className="py-20 bg-[#F8F9FB] border-b border-[#E5E7EB]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-[#002970]">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {/* FAQ 1 */}
            <details className="bg-white border border-[#E5E7EB] rounded-xl p-5 group cursor-pointer" open>
              <summary className="text-base font-bold text-[#002970] list-none flex justify-between items-center outline-none">
                <span>How does AI Voice Bahi Khata work?</span>
                <span className="transition-transform group-open:rotate-180 text-[#00BAF2] text-lg font-bold">▼</span>
              </summary>
              <p className="text-sm text-[#6B7280] mt-3 leading-relaxed">
                It uses state-of-the-art speech recognition. When you tap the mic button and speak a transaction like "Ramesh ko teen sau rupay udhaar", our voice intelligence parses the name, action (give/get), and transaction amount, and logs it directly into the customer ledger.
              </p>
            </details>

            {/* FAQ 2 */}
            <details className="bg-white border border-[#E5E7EB] rounded-xl p-5 group cursor-pointer">
              <summary className="text-base font-bold text-[#002970] list-none flex justify-between items-center outline-none">
                <span>Is my business financial data secure?</span>
                <span className="transition-transform group-open:rotate-180 text-[#00BAF2] text-lg font-bold">▼</span>
              </summary>
              <p className="text-sm text-[#6B7280] mt-3 leading-relaxed">
                Yes, absolutely! AI Munshi uses banking-grade 256-bit encryption. Your records are securely stored on cloud databases with regular automatic backups, ensuring you never lose access to your books even if you lose your phone.
              </p>
            </details>

            {/* FAQ 3 */}
            <details className="bg-white border border-[#E5E7EB] rounded-xl p-5 group cursor-pointer">
              <summary className="text-base font-bold text-[#002970] list-none flex justify-between items-center outline-none">
                <span>Do customers get message reminders automatically?</span>
                <span className="transition-transform group-open:rotate-180 text-[#00BAF2] text-lg font-bold">▼</span>
              </summary>
              <p className="text-sm text-[#6B7280] mt-3 leading-relaxed">
                Yes! You have full control. You can set rules for automatic reminders or manually review and click to send collection alerts via WhatsApp or SMS. It includes secure direct payment links so customers can settle their debts instantly.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* --- FOOTER & CTA ONBOARDING --- */}
      <section className="bg-gradient-to-r from-[#FAF2EE] to-[#FFF9F6] border-t border-[#E5E7EB] pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          
          {/* Main CTA */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center border-b border-[#E5E7EB] pb-16">
            <div className="lg:col-span-7 text-center lg:text-left">
              <h2 className="text-4xl md:text-5xl font-extrabold text-[#002970] tracking-tight leading-tight">
                Get started with AI Munshi today
              </h2>
              <p className="text-[#6B7280] text-base md:text-lg mt-3 leading-relaxed max-w-xl mx-auto lg:mx-0">
                Join thousands of Indian small businesses managing their accounts, recording voice entries, and recovery collections. Download now or use our Web App.
              </p>
              
              {/* App badges */}
              <div className="flex flex-wrap gap-4 items-center justify-center lg:justify-start mt-8">
                <button onClick={() => onStartDashboard()} className="bg-[#111827] hover:bg-black text-white text-xs font-bold py-3.5 px-6 rounded-xl flex items-center gap-3 transition-colors cursor-pointer shadow-lg">
                  <span className="text-xl">🤖</span>
                  <div className="text-left">
                    <span className="block text-[9px] uppercase tracking-wider opacity-60">Get it on</span>
                    <span className="text-xs block -mt-0.5">Google Play</span>
                  </div>
                </button>
                
                <button onClick={() => onStartDashboard()} className="bg-[#111827] hover:bg-black text-white text-xs font-bold py-3.5 px-6 rounded-xl flex items-center gap-3 transition-colors cursor-pointer shadow-lg">
                  <span className="text-xl">🍏</span>
                  <div className="text-left">
                    <span className="block text-[9px] uppercase tracking-wider opacity-60">Download on the</span>
                    <span className="text-xs block -mt-0.5">App Store</span>
                  </div>
                </button>
              </div>
            </div>

            {/* QR Code section */}
            <div className="lg:col-span-5 flex flex-col sm:flex-row items-center justify-center gap-8 bg-white p-8 rounded-3xl border border-[#E5E7EB] shadow-md max-w-md mx-auto">
              {/* Custom CSS QR Code Mockup */}
              <div className="w-36 h-36 border-4 border-[#002970] rounded-xl p-2 shrink-0 bg-white flex flex-col justify-between relative shadow-inner">
                <div className="flex justify-between w-full h-8">
                  <span className="w-6 h-6 border-4 border-[#002970] bg-white rounded-sm" />
                  <span className="w-6 h-6 border-4 border-[#002970] bg-white rounded-sm" />
                </div>
                {/* Visual patterns representing QR elements */}
                <div className="w-full h-8 flex flex-col gap-1 items-center justify-center opacity-85">
                  <div className="w-20 h-1 bg-[#002970] rounded" />
                  <div className="w-16 h-1 bg-[#00BAF2] rounded" />
                  <div className="w-24 h-1.5 bg-[#002970] rounded" />
                </div>
                <div className="flex justify-between items-end w-full h-8">
                  <span className="w-6 h-6 border-4 border-[#002970] bg-white rounded-sm" />
                  <span className="w-4 h-4 bg-[#00BAF2] rounded-sm mr-1" />
                </div>
              </div>
              
              <div className="text-center sm:text-left">
                <h3 className="text-lg font-extrabold text-[#002970]">Scan QR Code</h3>
                <p className="text-xs text-[#6B7280] mt-1.5 leading-relaxed">
                  Scan this QR code with your mobile camera to download the official AI Munshi Android & iOS mobile app.
                </p>
              </div>
            </div>
          </div>

          {/* Footer bottom links */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 text-sm font-semibold text-[#6B7280]">
            <p>© {new Date().getFullYear()} AI Munshi India. All rights reserved.</p>
            <div className="flex items-center gap-6 flex-wrap justify-center">
              <button onClick={() => scrollToSection("features")} className="hover:text-[#002970] cursor-pointer">Privacy Policy</button>
              <button onClick={() => scrollToSection("features")} className="hover:text-[#002970] cursor-pointer">Terms of Service</button>
              <button onClick={() => onStartDashboard()} className="hover:text-[#002970] cursor-pointer">Merchant Terms</button>
              <button onClick={() => scrollToSection("faq")} className="hover:text-[#002970] cursor-pointer">Support</button>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
