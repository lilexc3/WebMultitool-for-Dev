import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./site-detail.css";

const TABS = ["Overview", "Metrics", "Deploy", "Settings"];

const MOCK_SITES = {
  "1": { name: "my-app", domain: "my-app.webmultitool.ru", status: "online" },
  "2": { name: "landing-page", domain: "landing.webmultitool.ru", status: "online" },
  "3": { name: "api-service", domain: "api.webmultitool.ru", status: "offline" },
};

/* ── Tab components ── */

const OverviewTab = () => (
  <div>
    <div className="overview-grid">
      <div className="stat-card">
        <div className="stat-card__label">Uptime</div>
        <div className="stat-card__value">99.8%</div>
        <div className="stat-card__sub stat-card__sub--up">↑ last 30 days</div>
      </div>
      <div className="stat-card">
        <div className="stat-card__label">Deploys</div>
        <div className="stat-card__value">12</div>
        <div className="stat-card__sub">last deploy 2h ago</div>
      </div>
      <div className="stat-card">
        <div className="stat-card__label">Avg Response</div>
        <div className="stat-card__value">142ms</div>
        <div className="stat-card__sub stat-card__sub--up">↓ -12ms</div>
      </div>
    </div>
  </div>
);

const MetricsTab = () => {
  const bars = [
    { label: "CPU", value: 38 },
    { label: "RAM", value: 61 },
    { label: "Disk", value: 24 },
    { label: "Net", value: 52 },
  ];
  return (
    <div className="settings-section">
      <div className="settings-section__title">Resource Usage</div>
      <div className="settings-section__desc">Current server metrics</div>
      <div className="metrics-bar-row">
        {bars.map((b) => (
          <div key={b.label} className="metrics-bar-item">
            <span className="metrics-bar-item__label">{b.label}</span>
            <div className="metrics-bar-item__track">
              <div className="metrics-bar-item__fill" style={{ width: `${b.value}%` }} />
            </div>
            <span className="metrics-bar-item__val">{b.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const DeployTab = () => {
  const logs = [
    { time: "14:32:01", msg: "Build started", badge: null },
    { time: "14:32:18", msg: "Dependencies installed", badge: null },
    { time: "14:32:45", msg: "Build completed", badge: "success" },
    { time: "14:33:02", msg: "Deployed to production", badge: "success" },
    { time: "11:10:33", msg: "Deploy failed — timeout", badge: "fail" },
  ];

  return (
    <div>
      <div className="deploy-actions">
        <button className="btn-deploy">Deploy</button>
        <button className="btn-rollback">↩ Rollback</button>
      </div>
      <div className="deploy-log">
        <div className="deploy-log__title">Deploy History</div>
        {logs.map((l, i) => (
          <div key={i} className="deploy-log__item">
            <span className="deploy-log__time">{l.time}</span>
            <span className="deploy-log__msg">{l.msg}</span>
            {l.badge && (
              <span className={`deploy-log__badge deploy-log__badge--${l.badge}`}>
                {l.badge}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const SettingsTab = ({ site }) => (
  <div>
    <div className="settings-section">
      <div className="settings-section__title">General</div>
      <div className="settings-section__desc">Basic site configuration</div>
      <div className="settings-field">
        <label>Site name</label>
        <input type="text" defaultValue={site.name} />
      </div>
      <div className="settings-field">
        <label>Domain</label>
        <input type="text" defaultValue={site.domain} />
      </div>
      <button className="btn-save">Save changes</button>
    </div>

    <div className="settings-section">
      <div className="settings-section__title">Danger Zone</div>
      <div className="settings-section__desc">Irreversible actions — be careful</div>
      <button className="btn-danger">Delete site</button>
    </div>
  </div>
);

/* ── Main component ── */

const SiteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Overview");

  const site = MOCK_SITES[id] || { name: "Unknown", domain: "—", status: "offline" };

  return (
    <div>
      <div className="site-detail__header">
        <div>
          <h1 className="site-detail__title">{site.name}</h1>
          <div className="site-detail__domain">{site.domain}</div>
        </div>
        <div className="site-detail__status">
          <span className={`status-dot status-dot--${site.status}`} />
          {site.status}
        </div>
      </div>

      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? "tab--active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Overview"  && <OverviewTab />}
      {activeTab === "Metrics"   && <MetricsTab />}
      {activeTab === "Deploy"    && <DeployTab />}
      {activeTab === "Settings"  && <SettingsTab site={site} />}
    </div>
  );
};

export default SiteDetail;
