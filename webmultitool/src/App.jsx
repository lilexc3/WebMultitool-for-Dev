import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./app.css";
import StartBanner from "./components/app/start-banner";
import Step1 from "./components/app/step1";
import Step2 from "./components/app/step2";
import LogInPage from "./components/logInAndSignUp/log-in-page";
import SignUpPage from "./components/logInAndSignUp/sign-up-page";
import DashboardLayout from "./components/dashboard/dashboard-layout";
import SitesList from "./components/dashboard/sites-list";
import SiteDetail from "./components/dashboard/site-detail";
import SiteNew from "./components/dashboard/site-new";
import AcoountMainPage from "./components/accountAndSettings/acoount-main-page";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing */}
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

        {/* Auth */}
        <Route path="/log-in" element={<LogInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />

        {/* Dashboard */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/dashboard/sites" replace />} />
          <Route path="sites" element={<SitesList />} />
          <Route path="sites/new" element={<SiteNew />} />
          <Route path="sites/:id" element={<SiteDetail />} />
          <Route path="account" element={<AcoountMainPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
