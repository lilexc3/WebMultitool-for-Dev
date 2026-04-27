import React from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import "./dashboard-layout.css";

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="dashboard__sidebar">
        <div className="dashboard__logo">
          <span>Web<em>MultiTool</em></span>
        </div>

        <nav className="dashboard__nav">
          <span className="dashboard__nav-section">Main</span>

          <button
            className={`dashboard__nav-item ${isActive("/dashboard/sites") ? "dashboard__nav-item--active" : ""}`}
            onClick={() => navigate("/dashboard/sites")}
          >
            <span className="nav-dot" />
            Sites
          </button>

          <span className="dashboard__nav-section">Account</span>

          <button
            className={`dashboard__nav-item ${isActive("/dashboard/settings") ? "dashboard__nav-item--active" : ""}`}
            onClick={() => navigate("/dashboard/settings")}
          >
            <span className="nav-dot" />
            Settings
          </button>
        </nav>

        <div className="dashboard__sidebar-footer">
          <button
            className="dashboard__nav-item"
            onClick={() => navigate("/")}
          >
            <span className="nav-dot" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="dashboard__main">
        <div className="dashboard__topbar">
          <span
            className="dashboard__topbar-crumb"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/dashboard/sites")}
          >
            Dashboard
          </span>
          <span className="dashboard__topbar-sep">/</span>
          <span className="dashboard__topbar-crumb dashboard__topbar-crumb--active">
            {location.pathname.split("/").filter(Boolean).pop()}
          </span>
        </div>

        <div className="dashboard__content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
