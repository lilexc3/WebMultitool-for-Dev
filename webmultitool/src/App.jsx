import { useState } from "react";
import "./app.css";
import StartBanner from "./components/app/start-banner";
import Step1 from "./components/app/step1";
import Step2 from "./components/app/step2";

function App() {
  return (
    <>
      <div className="Start-New-Page">
        <StartBanner />
        <h3 className="onboarding-title">onboarding</h3>
        <div className="onboarding-steps">
          <Step1 />
          <Step2 />
        </div>
      </div>
    </>
  );
}

export default App;
