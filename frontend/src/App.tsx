import { useState } from "react";
import LandingPage from "./components/LandingPage";
import CreditIntelligenceCenter from "./components/CreditIntelligenceCenter";

function App() {
  const [view, setView] = useState<"landing" | "dashboard">("landing");

  const handleStartDashboard = () => {
    setView("dashboard");
  };

  const handleLogout = () => {
    setView("landing");
  };

  return (
    <>
      {view === "landing" ? (
        <LandingPage onStartDashboard={handleStartDashboard} />
      ) : (
        <CreditIntelligenceCenter onLogout={handleLogout} />
      )}
    </>
  );
}

export default App;
