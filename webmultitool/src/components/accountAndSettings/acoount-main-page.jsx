import { useState } from "react";
import React from "react";
import AccountSettings from "./accountMainPages/account-settings.jsx";
import YourProjects from "./accountMainPages/your-projects.jsx";
import Information from "./accountMainPages/information.jsx";
import "./acoount-main-page.css";

const TABS = [
  { id: "settings", label: "Account Settings", Component: AccountSettings },
  { id: "projects", label: "Your Projects", Component: YourProjects },
  { id: "information", label: "Information", Component: Information },
];

export default function AcoountMainPage() {
  const [activeTab, setActiveTab] = useState("settings");

  const { Component } = TABS.find((t) => t.id === activeTab);

  return (
    <div className="account-main-page">
      <nav className="account-main-page__nav">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`account-main-page__tab ${activeTab === tab.id ? "account-main-page__tab--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="account-main-page__content">
        <Component />
      </div>
    </div>
  );
}
