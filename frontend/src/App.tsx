import { useState } from "react";
import LandingPage from "./components/LandingPage";
import CreditIntelligenceCenter from "./components/CreditIntelligenceCenter";
import { LanguageProvider } from "./context/LanguageContext";

function App() {
  const [view, setView] = useState<"landing" | "dashboard">("landing");

  const handleStartDashboard = () => {
    setView("dashboard");
  };

  const handleLogout = () => {
    setView("landing");
  };

  return (
    <LanguageProvider>
      {view === "landing" ? (
        <LandingPage onStartDashboard={handleStartDashboard} />
      ) : (
        <CreditIntelligenceCenter onLogout={handleLogout} />
      )}
    </LanguageProvider>
  );
}

export default App;
