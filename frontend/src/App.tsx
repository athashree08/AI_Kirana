import { useState } from "react";
import LandingPage from "./components/LandingPage";
import CreditIntelligenceCenter from "./components/CreditIntelligenceCenter";
import AuthModal from "./components/AuthModal";
import { LanguageProvider } from "./context/LanguageContext";

function App() {
  const [merchantId, setMerchantId] = useState<string>(() => {
    return localStorage.getItem("vyapar_saathi_merchant_id") || "";
  });
  const [merchantName, setMerchantName] = useState<string>(() => {
    return localStorage.getItem("vyapar_saathi_merchant_name") || "";
  });

  const [view, setView] = useState<"landing" | "dashboard">(
    merchantId ? "dashboard" : "landing"
  );
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleStartDashboard = () => {
    if (merchantId) {
      setView("dashboard");
    } else {
      setIsAuthModalOpen(true);
    }
  };

  const handleAuthSuccess = (id: string, name: string) => {
    setMerchantId(id);
    setMerchantName(name);
    localStorage.setItem("vyapar_saathi_merchant_id", id);
    localStorage.setItem("vyapar_saathi_merchant_name", name);
    setIsAuthModalOpen(false);
    setView("dashboard");
  };

  const handleLogout = () => {
    setMerchantId("");
    setMerchantName("");
    localStorage.removeItem("vyapar_saathi_merchant_id");
    localStorage.removeItem("vyapar_saathi_merchant_name");
    setView("landing");
  };

  return (
    <LanguageProvider>
      {view === "landing" ? (
        <LandingPage onStartDashboard={handleStartDashboard} />
      ) : (
        <CreditIntelligenceCenter 
          merchantId={merchantId} 
          merchantName={merchantName} 
          onLogout={handleLogout} 
        />
      )}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </LanguageProvider>
  );
}

export default App;
