import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getSite,
  updateSite,
  deploySite,
  rollbackSite,
  getSiteMetrics,
  getFullStats,
} from "../../api";
import "./site-detail.css";

const TABS = ["Overview", "Metrics", "Deploy", "Settings"];

const SiteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [site, setSite] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [fullStats, setFullStats] = useState(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchData = async () => {
    try {
      const [siteData, metricsData, statsData] = await Promise.all([
        getSite(id),
        getSiteMetrics(id),
        getFullStats(id),
      ]);
      setSite(siteData);
      setMetrics(metricsData);
      setFullStats(statsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleUpdate = async (field, value) => {
    setUpdating(true);
    try {
      await updateSite(id, { [field]: value });
      await fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeploy = async () => {
    try {
      const res = await deploySite(id);
      alert(res.message || "Deploy command sent");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRollback = async () => {
    try {
      const res = await rollbackSite(id);
      alert(res.message || "Rollback command sent");
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div style={{ color: "#fff" }}>Loading site...</div>;
  if (!site) return <div style={{ color: "#fff" }}>Site not found</div>;

  return (
    <div>
      <div className="site-detail__header">
        <div>
          <h1 className="site-detail__title">{site.name}</h1>
          <div className="site-detail__domain">{site.url}</div>
        </div>
        <div className="site-detail__status">
          <span
            className={`status-dot status-dot--${metrics?.is_up ? "online" : "offline"}`}
          />
          {metrics?.is_up ? "Online" : "Offline"}
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

      {activeTab === "Overview" && (
        <div>
          <div className="overview-grid">
            <div className="stat-card">
              <div className="stat-card__label">Uptime (24h)</div>
              <div className="stat-card__value">
                {metrics?.uptime_24h ?? 0}%
              </div>
              <div className="stat-card__sub">
                {metrics?.is_up ? "Currently UP" : "Currently DOWN"}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">HTTP Status</div>
              <div className="stat-card__value">
                {fullStats?.http?.status_code || "N/A"}
              </div>
              <div className="stat-card__sub">
                Response: {fullStats?.http?.response_time || 0}ms
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">SSL Expiry</div>
              <div className="stat-card__value">
                {fullStats?.ssl?.days_left ?? "N/A"} days
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Metrics" && (
        <div className="settings-section">
          <div className="settings-section__title">
            Resource & Network Metrics
          </div>
          <div className="metrics-bar-row">
            {fullStats?.ping && (
              <div className="metrics-bar-item">
                <span className="metrics-bar-item__label">Ping</span>
                <div className="metrics-bar-item__track">
                  <div
                    className="metrics-bar-item__fill"
                    style={{
                      width: `${Math.min(100, fullStats.ping.latency_ms / 10)}%`,
                    }}
                  />
                </div>
                <span className="metrics-bar-item__val">
                  {fullStats.ping.latency_ms} ms
                </span>
              </div>
            )}
            {fullStats?.dns && (
              <div className="metrics-bar-item">
                <span className="metrics-bar-item__label">DNS</span>
                <div className="metrics-bar-item__track">
                  <div
                    className="metrics-bar-item__fill"
                    style={{ width: fullStats.dns.resolved ? 100 : 0 }}
                  />
                </div>
                <span className="metrics-bar-item__val">
                  {fullStats.dns.resolved ? "OK" : "Failed"}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "Deploy" && (
        <div>
          <div className="deploy-actions">
            <button className="btn-deploy" onClick={handleDeploy}>
              Deploy
            </button>
            <button className="btn-rollback" onClick={handleRollback}>
              ↩ Rollback
            </button>
          </div>
          <div className="deploy-log">
            <div className="deploy-log__title">Deploy History</div>
            <div className="deploy-log__item">
              <span className="deploy-log__msg">
                Use GitLab / Agent to track history
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Settings" && (
        <div>
          <div className="settings-section">
            <div className="settings-section__title">General</div>
            <div className="settings-field">
              <label>Site name</label>
              <input
                type="text"
                defaultValue={site.name}
                onBlur={(e) => handleUpdate("name", e.target.value)}
                disabled={updating}
              />
            </div>
            <div className="settings-field">
              <label>URL</label>
              <input
                type="text"
                defaultValue={site.url}
                onBlur={(e) => handleUpdate("url", e.target.value)}
                disabled={updating}
              />
            </div>
            <div className="settings-field">
              <label>Active monitoring</label>
              <input
                type="checkbox"
                checked={site.active}
                onChange={(e) => handleUpdate("active", e.target.checked)}
                disabled={updating}
              />
            </div>
            <button
              className="btn-save"
              disabled={updating}
              style={{ marginTop: 12 }}
            >
              Save (auto on blur)
            </button>
          </div>
          <div className="settings-section">
            <div className="settings-section__title">Danger Zone</div>
            <button
              className="btn-danger"
              onClick={() => {
                if (window.confirm("Delete this site permanently?")) {
                  // реализуйте удаление отдельно или сделайте редирект на список
                  window.location.href = `/dashboard/sites`;
                }
              }}
            >
              Delete site
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteDetail;
