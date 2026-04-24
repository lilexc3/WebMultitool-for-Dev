import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./app.css";
import StartBanner from "./components/app/start-banner";
import Step1 from "./components/app/step1";
import Step2 from "./components/app/step2";
import LogInPage from "./components/logInAndSignUp/log-in-page";
import SignUpPage from "./components/logInAndSignUp/sign-up-page";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <div className="Start-New-Page">
              <StartBanner />
              <h3 className="onboarding-title">onboarding</h3>
              <div className="onboarding-steps">
                <Step1 />
                <Step2 />
              </div>
            </div>
          }
        />
        <Route path="/log-in" element={<LogInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
