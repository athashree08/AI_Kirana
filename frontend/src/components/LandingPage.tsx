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
    <div className="font-['Inter',sans-serif] bg-[#F8F9FB] text-[#111827] antialiased selection:bg-[#c83226]/20 selection:text-[#c83226] overflow-x-hidden min-h-screen">
      
      {/* --- HEADER --- */}
      <header className="sticky top-0 bg-white/85 backdrop-blur-md border-b border-[#E5E7EB] z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="w-10 h-10 rounded-xl bg-[#c83226] flex items-center justify-center shadow-md shadow-[#c83226]/20">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 2H6c-1.206 0-3 .799-3 3v14c0 2.201 1.794 3 3 3h13c1.104 0 2-.896 2-2V4c0-1.104-.896-2-2-2zM6 20c-.57 0-1-.18-1-.5s.43-.5 1-.5h13v1H6z" />
              </svg>
            </div>
            <div>
              <span className="text-2xl font-extrabold tracking-tight text-[#111827]">Vyapar</span>
              <span className="text-2xl font-extrabold tracking-tight text-[#c83226]"> Saathi</span>
              <sup className="text-xs text-[#c83226] font-bold">®</sup>
              <span className="block text-[9px] uppercase tracking-widest text-[#6B7280] font-semibold -mt-1">Digital Bahi Khata</span>
            </div>
          </div>

          {/* Nav Links - Desktop */}
          <nav className="hidden md:flex items-center gap-8 text-[15px] font-semibold text-[#6B7280]">
            <button onClick={() => scrollToSection("features")} className="hover:text-[#c83226] transition-colors cursor-pointer">Features</button>
            <button onClick={() => scrollToSection("why-munshi")} className="hover:text-[#c83226] transition-colors cursor-pointer">Why Vyapar Saathi</button>
            <button onClick={() => scrollToSection("tally-sync")} className="hover:text-[#c83226] transition-colors cursor-pointer">Tally Integration</button>
            <button onClick={() => scrollToSection("blogs")} className="hover:text-[#c83226] transition-colors cursor-pointer">Blog</button>
            <button onClick={() => scrollToSection("faq")} className="hover:text-[#c83226] transition-colors cursor-pointer">FAQs</button>
          </nav>

          {/* CTAs */}
          <div className="flex items-center gap-4">
            {/* Phone badge */}
            <a href="tel:9606800800" className="hidden lg:flex items-center gap-2 bg-[#FFF5F5] border border-[#FFD8D8] text-[#c83226] text-sm font-bold px-4 py-2 rounded-full hover:bg-[#FFEBEB] transition-colors">
              <span className="text-base">📞</span>
              <span>96068 00800</span>
            </a>
            
            {/* Log In Button */}
            <button 
              onClick={() => onStartDashboard()} 
              className="px-5 py-2.5 rounded-xl border-2 border-[#111827] text-[#111827] font-bold text-sm hover:bg-[#111827] hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
            >
              Log In
            </button>
          </div>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="bg-gradient-to-r from-[#fbf5f4] to-[#fff7f6] border-b border-[#E5E7EB] pt-12 pb-20 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] bg-[#c83226]/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#10B981]/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Info & Form */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            {/* Handwritten 'aur bhi' overlay aligned with caret */}
            <h1 className="text-4xl sm:text-5xl md:text-[68px] leading-tight md:leading-[76px] font-extrabold text-[#111827] tracking-tight">
              Business hua
              <span className="relative inline-block mx-1.5">
                <span className="absolute bottom-[90%] left-1/2 -translate-x-1/2 mb-1.5 text-xs sm:text-sm md:text-base font-extrabold text-[#c83226] font-['Playpen_Sans'] rotate-[-6deg] select-none bg-yellow-100 px-2 py-0.5 rounded-md border border-yellow-200 whitespace-nowrap shadow-sm">
                  (aur bhi)
                </span>
                <span className="text-[#c83226]">^</span>
              </span>
              easy <br />
              with Vyapar Saathi on Desktop
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-[#6B7280] leading-relaxed max-w-xl">
              The #1 digital ledger app built for Indian small business owners. 
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
                placeholder="Enter your phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                className="flex-1 py-3 px-4 outline-none text-base text-[#111827] placeholder-[#A0AEC0] font-medium"
              />
              <button
                type="submit"
                className="bg-[#c83226] hover:bg-[#b0281e] text-white font-bold text-base px-8 py-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-[#c83226]/20"
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
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#111827] mb-4">
                One platform for all your business needs
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#c83226]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs text-[#c83226]">🎙️</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#111827]">Manage Digital Bahi Khata</h4>
                    <p className="text-xs text-[#6B7280] mt-0.5">Just speak to log credit/debit records instantly.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#10B981]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs text-[#10B981]">💬</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#111827]">Send Payment Reminders</h4>
                    <p className="text-xs text-[#6B7280] mt-0.5">Polite automatic alerts on WhatsApp & SMS.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Premium Mockup Illustrations matching Vyapar Saathi */}
          <div className="lg:col-span-5 relative w-full flex justify-center lg:justify-end mt-8 lg:mt-0 select-none">
            <div className="relative w-full aspect-[1.4/1] min-h-[420px] max-w-[540px]">
              
              
              {/* --- MERCHANT ILLUSTRATION --- */}
              <img 
                src="/turban_merchant.png" 
                alt="Vyapar Saathi Merchant" 
                className="absolute bottom-[-15px] left-[32%] w-[38%] h-auto object-contain pointer-events-none"
                style={{ zIndex: 15 }}
              />

              {/* --- DESKTOP APP MOCKUP --- */}
              <div className="absolute top-0 right-0 w-[90%] h-[92%] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-10">
                {/* Windows title bar */}
                <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold tracking-wider">Vyapar Saathi Web Dashboard</span>
                  <div className="w-12" />
                </div>
                
                {/* Dashboard body */}
                <div className="flex-1 flex overflow-hidden">
                  {/* Mock Sidebar */}
                  <div className="w-[25%] bg-[#0e1b2f] p-2 text-white flex flex-col gap-4">
                    <div className="flex items-center gap-1 px-1 py-1">
                      <div className="w-4 h-4 bg-[#c83226] rounded flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 2H6c-1.206 0-3 .799-3 3v14c0 2.201 1.794 3 3 3h13c1.104 0 2-.896 2-2V4c0-1.104-.896-2-2-2zM6 20c-.57 0-1-.18-1-.5s.43-.5 1-.5h13v1H6z" />
                        </svg>
                      </div>
                      <span className="text-[10px] font-black tracking-tight">Vyapar Saathi</span>
                    </div>
                    
                    <nav className="space-y-1">
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-[#1e293b] text-white text-[9px] font-bold border-l-2 border-[#3b82f6]">
                        <span>👥 Customers</span>
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded text-slate-400 text-[9px] font-semibold">
                        <span>🤝 Suppliers</span>
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded text-slate-400 text-[9px] font-semibold">
                        <span>💰 Cashbook</span>
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded text-slate-400 text-[9px] font-semibold">
                        <span>📊 Reports</span>
                      </div>
                    </nav>
                  </div>
                  
                  {/* Mock Main Section */}
                  <div className="flex-1 bg-[#f8fafc] p-3 flex flex-col gap-3 overflow-hidden">
                    {/* Top tabs */}
                    <div className="flex gap-4 border-b border-slate-200 pb-1.5">
                      <span className="text-[10px] font-black text-slate-800 border-b-2 border-[#3b82f6] pb-1">Customers <span className="text-slate-400 font-semibold">120</span></span>
                      <span className="text-[10px] font-semibold text-slate-400">Suppliers <span className="text-slate-400 font-normal">0</span></span>
                    </div>
                    
                    {/* Summary cards */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white p-2 rounded-lg border border-slate-100 flex items-center justify-between shadow-sm">
                        <div>
                          <p className="text-[8px] text-slate-400 font-semibold">You'll Give</p>
                          <p className="text-[10px] font-black text-[#10b981]">₹13,480 <span className="text-[8px] font-bold">↗</span></p>
                        </div>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-100 flex items-center justify-between shadow-sm">
                        <div>
                          <p className="text-[8px] text-slate-400 font-semibold">You'll Get</p>
                          <p className="text-[10px] font-black text-[#ef4444]">₹2,340 <span className="text-[8px] font-bold">↙</span></p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Table headings */}
                    <div className="flex justify-between items-center text-[7px] font-bold text-slate-400 px-1">
                      <span>NAME</span>
                      <span>AMOUNT</span>
                    </div>
                    
                    {/* Customer Rows */}
                    <div className="space-y-1.5 overflow-hidden flex-1 text-[8px]">
                      <div className="flex justify-between items-center bg-white p-1.5 rounded border border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[8px] font-bold flex items-center justify-center">AS</span>
                          <div>
                            <p className="font-extrabold text-slate-800">Arya Sharma</p>
                            <p className="text-[6px] text-slate-400">Just now</p>
                          </div>
                        </div>
                        <span className="font-black text-[#10b981]">₹300</span>
                      </div>
                      
                      <div className="flex justify-between items-center bg-white p-1.5 rounded border border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-[8px] font-bold flex items-center justify-center">KO</span>
                          <div>
                            <p className="font-extrabold text-slate-800">Kapil Ojha</p>
                            <p className="text-[6px] text-slate-400">2 minutes ago</p>
                          </div>
                        </div>
                        <span className="font-black text-[#ef4444]">₹75</span>
                      </div>

                      <div className="flex justify-between items-center bg-white p-1.5 rounded border border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 text-[8px] font-bold flex items-center justify-center">PJ</span>
                          <div>
                            <p className="font-extrabold text-slate-800">Priyanka Jadhav</p>
                            <p className="text-[6px] text-slate-400">1 hour ago</p>
                          </div>
                        </div>
                        <span className="font-black text-[#10b981]">₹140</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* --- OVERLAPPING MOBILE APP MOCKUP --- */}
              <div className="absolute bottom-[-15px] left-0 w-[42%] h-[82%] bg-slate-900 rounded-[30px] p-1.5 shadow-2xl border-4 border-slate-800 z-20 flex flex-col overflow-hidden animate-bounce-slow">
                <div className="flex-1 bg-[#f8fafc] rounded-[24px] overflow-hidden flex flex-col relative">
                  
                  {/* Status Bar */}
                  <div className="bg-[#0066c0] pt-1 px-3 pb-0.5 flex justify-between items-center text-[7px] text-white/80 shrink-0">
                    <span>9:30</span>
                    <div className="flex items-center gap-1">
                      <span>📶</span>
                      <span>🔋</span>
                    </div>
                  </div>
                  
                  {/* App Bar */}
                  <div className="bg-[#0066c0] p-2 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] font-black">My Business name</span>
                      <span className="text-[6px]">▼</span>
                    </div>
                    <span className="text-[8px]">💬</span>
                  </div>
                  
                  {/* Summary tabs */}
                  <div className="bg-white px-2 py-1 flex justify-around text-[7px] font-bold text-slate-400 border-b border-slate-100 shrink-0">
                    <span className="text-[#0066c0] border-b border-[#0066c0] pb-0.5">CUSTOMERS</span>
                    <span>SUPPLIERS</span>
                  </div>
                  
                  {/* Mobile stats cards */}
                  <div className="grid grid-cols-2 gap-1 p-1.5 bg-slate-50 border-b border-slate-100 shrink-0">
                    <div className="bg-white p-1 rounded border border-slate-100 text-center">
                      <p className="text-[5px] text-slate-400">You will get</p>
                      <p className="text-[7px] font-black text-emerald-600">₹1,200</p>
                    </div>
                    <div className="bg-white p-1 rounded border border-slate-100 text-center">
                      <p className="text-[5px] text-slate-400">You will give</p>
                      <p className="text-[7px] font-black text-rose-600">₹3,070</p>
                    </div>
                  </div>
                  
                  {/* Customer Rows - Mobile */}
                  <div className="flex-1 p-1.5 space-y-1 overflow-hidden text-[7px]">
                    <div className="flex justify-between items-center bg-white p-1 rounded border border-slate-100">
                      <div>
                        <p className="font-extrabold text-slate-800">Arun Batra</p>
                        <p className="text-[5px] text-slate-400">Yesterday</p>
                      </div>
                      <span className="font-black text-emerald-600">₹200</span>
                    </div>
                    
                    <div className="flex justify-between items-center bg-white p-1 rounded border border-slate-100">
                      <div>
                        <p className="font-extrabold text-slate-800">Rajat Jha</p>
                        <p className="text-[5px] text-slate-400">Yesterday</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-black text-rose-600">₹70</span>
                        <span className="bg-rose-50 border border-rose-200 text-rose-600 text-[4px] px-1 rounded-sm py-0.5 font-bold">Remind</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-white p-1 rounded border border-slate-100">
                      <div>
                        <p className="font-extrabold text-slate-800">Babita Jain</p>
                        <p className="text-[5px] text-slate-400">2 days ago</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-black text-rose-600">₹3,000</span>
                        <span className="bg-rose-50 border border-rose-200 text-rose-600 text-[4px] px-1 rounded-sm py-0.5 font-bold">Remind</span>
                      </div>
                    </div>
                  </div>

                  {/* Add Customer FAB */}
                  <div className="absolute bottom-2 right-2 bg-[#c83226] text-white px-2 py-1 rounded-full text-[6px] font-black shadow-md flex items-center gap-0.5">
                    <span>+</span>
                    <span>ADD CUSTOMER</span>
                  </div>
                  
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
              <span className="text-4xl font-extrabold text-[#c83226]">10 Lakh+</span>
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
              <span className="text-4xl font-extrabold text-[#c83226]">Tally & Vyapar</span>
              <h3 className="text-base font-bold text-[#111827] mt-1">Already use accounting tools?</h3>
              <p className="text-xs text-[#6B7280] mt-0.5">Sync Tally and Vyapar ledger to mobile with Vyapar Saathi.</p>
            </div>
            <button 
              onClick={() => onStartDashboard()} 
              className="bg-[#c83226] hover:bg-[#b0281e] text-white text-sm font-bold py-3.5 px-6 rounded-xl shrink-0 cursor-pointer shadow-md shadow-[#c83226]/10 transition-all active:scale-95"
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
            <span className="text-xs font-extrabold text-[#c83226] uppercase tracking-widest block mb-3">
              POWERFUL FEATURES TO HELP YOU
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-[56px] leading-tight md:leading-[64px] font-extrabold text-[#111827] tracking-tight">
              Built with features for growing businesses
            </h2>
          </div>

          {/* Two Large Feature Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            
            {/* Feature 1: Voice Ledger */}
            <div className="bg-white p-10 rounded-3xl border border-[#E5E7EB] hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-[#c83226]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 text-[#c83226]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-extrabold text-[#111827]">Voice-Powered Bahi Khata</h3>
                <p className="text-base text-[#6B7280] mt-3 leading-relaxed">
                  No more slow manual typing on small screens. Just tap the mic button and speak. Vyapar Saathi recognizes 
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
                <span className="text-[#c83226] font-bold text-sm group-hover:translate-x-1.5 transition-transform duration-300">Learn More →</span>
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
                <h3 className="text-2xl font-extrabold text-[#111827]">Smart Payment Reminders</h3>
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
                <span className="text-[#c83226] font-bold text-sm group-hover:translate-x-1.5 transition-transform duration-300">Learn More →</span>
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
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#111827] tracking-tight">Everything a smart merchant needs</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-2xl border border-[#E5E7EB] hover:-translate-y-1 transition-all duration-300">
              <div className="w-10.5 h-10.5 rounded-lg bg-[#c83226]/10 flex items-center justify-center mb-5">
                <span className="text-xl">🏪</span>
              </div>
              <h3 className="text-lg font-bold text-[#111827]">Multiple Business Management</h3>
              <p className="text-sm text-[#6B7280] mt-2 leading-relaxed">
                Manage accounts, credits, and sales across multiple shops or branches easily with a single login dashboard.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-2xl border border-[#E5E7EB] hover:-translate-y-1 transition-all duration-300">
              <div className="w-10.5 h-10.5 rounded-lg bg-[#c83226]/10 flex items-center justify-center mb-5">
                <span className="text-xl">☁️</span>
              </div>
              <h3 className="text-lg font-bold text-[#111827]">Automatic Secure Backup</h3>
              <p className="text-sm text-[#6B7280] mt-2 leading-relaxed">
                Your data is automatically synchronized with our secure cloud database, so you never lose your ledger records.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-2xl border border-[#E5E7EB] hover:-translate-y-1 transition-all duration-300">
              <div className="w-10.5 h-10.5 rounded-lg bg-[#c83226]/10 flex items-center justify-center mb-5">
                <span className="text-xl">📊</span>
              </div>
              <h3 className="text-lg font-bold text-[#111827]">Business CFO Reports</h3>
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
          <div className="bg-[#0e1b2f] rounded-3xl text-white p-8 md:p-12 shadow-2xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-10">
            {/* Background design accents */}
            <div className="absolute right-0 bottom-0 w-80 h-80 bg-[#c83226]/10 rounded-full blur-[80px] pointer-events-none" />
            
            {/* Left Col */}
            <div className="lg:max-w-xl">
              <span className="bg-[#c83226] text-white text-xs font-extrabold uppercase px-3 py-1 rounded-md tracking-wider">
                If you are using Tally, check this out!
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-4 leading-tight">
                The #1 assistant on mobile for Tally users
              </h2>
              <p className="text-[#E5E7EB] text-base mt-3 leading-relaxed">
                Access your Tally ledger records and automate collection reminders on-the-go. Sync files in seconds and let Vyapar Saathi do your collections work.
              </p>
              <button 
                onClick={() => onStartDashboard()} 
                className="mt-6 bg-white text-[#0e1b2f] hover:bg-slate-100 font-extrabold text-sm px-6 py-3.5 rounded-xl transition-all cursor-pointer shadow-md shadow-black/10 active:scale-95"
              >
                Learn More
              </button>
            </div>

            {/* Right Col: Benefits list */}
            <div className="w-full lg:w-96 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#c83226]/20 flex items-center justify-center shrink-0">
                  <span className="text-xs text-[#c83226]">⚡</span>
                </div>
                <span className="text-sm font-bold">Collect money faster</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#c83226]/20 flex items-center justify-center shrink-0">
                  <span className="text-xs text-[#c83226]">🎙️</span>
                </div>
                <span className="text-sm font-bold">Manage sales & ledgers via voice</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#c83226]/20 flex items-center justify-center shrink-0">
                  <span className="text-xs text-[#c83226]">🛡️</span>
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
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#111827] tracking-tight">Our Blogs</h2>
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
                      <span className="bg-[#EEF3F7] text-[#c83226] text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md tracking-wider">
                        {blog.tag}
                      </span>
                      <h3 className="text-lg font-extrabold text-[#111827] mt-3 line-clamp-2 leading-snug">
                        {blog.title}
                      </h3>
                      <p className="text-xs text-[#6B7280] mt-2 line-clamp-3 leading-relaxed">
                        {blog.desc}
                      </p>
                    </div>
                    <div className="mt-5 border-t border-[#E5E7EB] pt-4 flex items-center justify-between text-xs font-bold">
                      <span className="text-[#6B7280]">{blog.readTime}</span>
                      <button onClick={() => onStartDashboard()} className="text-[#c83226] hover:text-[#b0281e] transition-colors cursor-pointer">
                        Read More...
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Slider Dots */}
            <div className="flex items-center justify-center gap-2 mt-10">
              <span className="w-2.5 h-2.5 rounded-full bg-[#c83226]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#E5E7EB]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#E5E7EB]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#E5E7EB]" />
            </div>
          </div>

          <div className="text-center mt-12">
            <button 
              onClick={() => onStartDashboard()} 
              className="bg-[#c83226] hover:bg-[#b0281e] text-white font-extrabold text-sm px-8 py-3.5 rounded-xl cursor-pointer shadow-md shadow-[#c83226]/10 transition-all active:scale-95"
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
            <h2 className="text-3xl font-extrabold text-[#111827]">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {/* FAQ 1 */}
            <details className="bg-white border border-[#E5E7EB] rounded-xl p-5 group cursor-pointer" open>
              <summary className="text-base font-bold text-[#111827] list-none flex justify-between items-center outline-none">
                <span>How does Voice Bahi Khata work?</span>
                <span className="transition-transform group-open:rotate-180 text-[#c83226] text-lg font-bold">▼</span>
              </summary>
              <p className="text-sm text-[#6B7280] mt-3 leading-relaxed">
                It uses state-of-the-art speech recognition. When you tap the mic button and speak a transaction like "Ramesh ko teen sau rupay udhaar", our voice intelligence parses the name, action (give/get), and transaction amount, and logs it directly into the customer ledger.
              </p>
            </details>

            {/* FAQ 2 */}
            <details className="bg-white border border-[#E5E7EB] rounded-xl p-5 group cursor-pointer">
              <summary className="text-base font-bold text-[#111827] list-none flex justify-between items-center outline-none">
                <span>Is my business financial data secure?</span>
                <span className="transition-transform group-open:rotate-180 text-[#c83226] text-lg font-bold">▼</span>
              </summary>
              <p className="text-sm text-[#6B7280] mt-3 leading-relaxed">
                Yes, absolutely! Vyapar Saathi uses banking-grade 256-bit encryption. Your records are securely stored on cloud databases with regular automatic backups, ensuring you never lose access to your books even if you lose your phone.
              </p>
            </details>

            {/* FAQ 3 */}
            <details className="bg-white border border-[#E5E7EB] rounded-xl p-5 group cursor-pointer">
              <summary className="text-base font-bold text-[#111827] list-none flex justify-between items-center outline-none">
                <span>Do customers get message reminders automatically?</span>
                <span className="transition-transform group-open:rotate-180 text-[#c83226] text-lg font-bold">▼</span>
              </summary>
              <p className="text-sm text-[#6B7280] mt-3 leading-relaxed">
                Yes! You have full control. You can set rules for automatic reminders or manually review and click to send collection alerts via WhatsApp or SMS. It includes secure direct payment links so customers can settle their debts instantly.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* --- FOOTER & CTA ONBOARDING --- */}
      <section className="bg-gradient-to-r from-[#fbf5f4] to-[#fff7f6] border-t border-[#E5E7EB] pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          
          {/* Main CTA */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center border-b border-[#E5E7EB] pb-16">
            <div className="lg:col-span-7 text-center lg:text-left">
              <h2 className="text-4xl md:text-5xl font-extrabold text-[#111827] tracking-tight leading-tight">
                Get started with Vyapar Saathi today
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
              <div className="w-36 h-36 border-4 border-[#c83226] rounded-xl p-2 shrink-0 bg-white flex flex-col justify-between relative shadow-inner">
                <div className="flex justify-between w-full h-8">
                  <span className="w-6 h-6 border-4 border-[#c83226] bg-white rounded-sm" />
                  <span className="w-6 h-6 border-4 border-[#c83226] bg-white rounded-sm" />
                </div>
                {/* Visual patterns representing QR elements */}
                <div className="w-full h-8 flex flex-col gap-1 items-center justify-center opacity-85">
                  <div className="w-20 h-1 bg-[#0e1b2f] rounded" />
                  <div className="w-16 h-1 bg-[#c83226] rounded" />
                  <div className="w-24 h-1.5 bg-[#0e1b2f] rounded" />
                </div>
                <div className="flex justify-between items-end w-full h-8">
                  <span className="w-6 h-6 border-4 border-[#c83226] bg-white rounded-sm" />
                  <span className="w-4 h-4 bg-[#c83226] rounded-sm mr-1" />
                </div>
              </div>
              
              <div className="text-center sm:text-left">
                <h3 className="text-lg font-extrabold text-[#111827]">Scan QR Code</h3>
                <p className="text-xs text-[#6B7280] mt-1.5 leading-relaxed">
                  Scan this QR code with your mobile camera to download the official Vyapar Saathi Android & iOS mobile app.
                </p>
              </div>
            </div>
          </div>

          {/* Footer bottom links */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 text-sm font-semibold text-[#6B7280]">
            <p>© {new Date().getFullYear()} Vyapar Saathi India. All rights reserved.</p>
            <div className="flex items-center gap-6 flex-wrap justify-center">
              <button onClick={() => scrollToSection("features")} className="hover:text-[#c83226] cursor-pointer">Privacy Policy</button>
              <button onClick={() => scrollToSection("features")} className="hover:text-[#c83226] cursor-pointer">Terms of Service</button>
              <button onClick={() => onStartDashboard()} className="hover:text-[#c83226] cursor-pointer">Merchant Terms</button>
              <button onClick={() => scrollToSection("faq")} className="hover:text-[#c83226] cursor-pointer">Support</button>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
