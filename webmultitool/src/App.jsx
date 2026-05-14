import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { PrivateRoute } from "./components/PrivateRoute";
import StartBanner from "./components/app/start-banner.jsx";
import LogInPage from "./components/logInAndSignUp/log-in-page.jsx";
import SignUpPage from "./components/logInAndSignUp/sign-up-page.jsx";
import DashboardLayout from "./components/dashboard/dashboard-layout.jsx";
import SitesList from "./components/dashboard/sites-list.jsx";
import SiteNew from "./components/dashboard/site-new.jsx";
import SiteDetail from "./components/dashboard/site-detail.jsx";
import AcoountMainPage from "./components/accountAndSettings/acoount-main-page.jsx";
import "./App.css";

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading)
    return <div style={{ color: "#fff", padding: "2rem" }}>Loading...</div>;
  return user ? <Navigate to="/dashboard/sites" replace /> : <StartBanner />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/log-in" element={<LogInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
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
