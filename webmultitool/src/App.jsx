import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PrivateRoute } from "./components/PrivateRoute";
import LogInPage from "./components/loginAndSignUp/log-in-page.jsx";
import SignUpPage from "./components/loginAndSignUp/sign-up-page.jsx";
import DashboardLayout from "./components/dashboard/dashboard-layout.jsx";
import SitesList from "./components/dashboard/sites-list.jsx";
import SiteNew from "./components/dashboard/site-new.jsx";
import SiteDetail from "./components/dashboard/site-detail.jsx";
import AcoountMainPage from "./components/accountAndSettings/acoount-main-page.jsx";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/log-in" element={<LogInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route path="/" element={<Navigate to="/dashboard/sites" />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardLayout />
            </PrivateRoute>
          }
        >
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
