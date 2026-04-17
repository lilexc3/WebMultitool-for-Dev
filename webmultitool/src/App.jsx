import { useState } from "react";
import "./App.css";
import StartBanner from "./components/start-banner";
import Step1 from "./components/step1";
import Step2 from "./components/step2";

function App() {
  return (
    <>
      <div className="Start-New-Page">
        <StartBanner />
        <h3 className="onboarding-title">onboarding</h3>
        <Step1 />
        <Step2 />
      </div>
    </>
  );
}

export default App;
