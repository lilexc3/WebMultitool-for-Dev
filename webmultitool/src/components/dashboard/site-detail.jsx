import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getSite,
  updateSite,
  deploySite,
  rollbackSite,
  getSiteMetrics,
  getFullStats,
  deleteSite,
  checkSiteById,
} from "../../api";
import "./site-detail.css";

const TABS = ["Overview", "Metrics", "Deploy", "Settings"];

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const SiteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [site, setSite] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [fullStats, setFullStats] = useState(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [lastAction, setLastAction] = useState(null);

  const fetchData = useCallback(async () => {
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
  }, [id]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const handleRefreshChecks = async () => {
    setRefreshing(true);
    setLastAction(null);
    try {
      await checkSiteById(id);
      await fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setRefreshing(false);
    }
  };

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

  const formatDeployResponse = (res) => {
    if (!res) return "";
    const parts = [
      res.message || res.status,
      res.via ? `via ${res.via}` : null,
      res.pipeline_url ? res.pipeline_url : null,
    ].filter(Boolean);
    return parts.join("\n");
  };

  const handleDeploy = async () => {
    try {
      const res = await deploySite(id);
      setLastAction(formatDeployResponse(res));
      alert(formatDeployResponse(res) || "Done");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRollback = async () => {
    try {
      const res = await rollbackSite(id);
      setLastAction(formatDeployResponse(res));
      alert(formatDeployResponse(res) || "Done");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this site permanently?")) return;
    try {
      await deleteSite(id);
      navigate("/dashboard/sites");
    } catch (err) {
      alert(err.message);
    }
  };

  const pingMs = fullStats?.ping?.avg != null ? fullStats.ping.avg : null;
  const dnsOk = Boolean(fullStats?.dns?.ip);
  const sslDays =
    fullStats?.ssl?.days_left != null ? fullStats.ssl.days_left : null;

  if (loading) return <div style={{ color: "#fff" }}>Loading site...</div>;
  if (!site) return <div style={{ color: "#fff" }}>Site not found</div>;

  return (
    <div>
      <div className="site-detail__header">
        <div>
          <h1 className="site-detail__title">{site.name}</h1>
          <div className="site-detail__domain">{site.url}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="site-detail__status">
            <span
              className={`status-dot status-dot--${site.agent_online ? "online" : "offline"}`}
            />
            Agent {site.agent_online ? "live" : "offline"}
          </div>
          <div className="site-detail__status">
            <span
              className={`status-dot status-dot--${metrics?.is_up ? "online" : "offline"}`}
            />
            Probe {metrics?.is_up ? "UP" : "DOWN"}
          </div>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`tab ${activeTab === tab ? "tab--active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Overview" && (
        <div>
          <div style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn-save"
              disabled={refreshing}
              onClick={handleRefreshChecks}
            >
              {refreshing ? "Checking…" : "Run HTTP check"}
            </button>
          </div>
          <div className="overview-grid">
            <div className="stat-card">
              <div className="stat-card__label">Uptime (24h)</div>
              <div className="stat-card__value">
                {metrics?.uptime_24h ?? 0}%
              </div>
              <div className="stat-card__sub">
                {metrics?.is_up ? "Probe UP" : "Probe DOWN"}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">HTTP Status</div>
              <div className="stat-card__value">
                {fullStats?.http?.status_code ?? "N/A"}
              </div>
              <div className="stat-card__sub">
                Response:{" "}
                {fullStats?.http?.response_time != null
                  ? `${Math.round(Number(fullStats.http.response_time) * 1000)} ms`
                  : "—"}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">SSL</div>
              <div className="stat-card__value">
                {sslDays != null ? `${sslDays} days` : "N/A"}
              </div>
              <div className="stat-card__sub">
                {fullStats?.ssl?.valid === false
                  ? "Invalid / HTTP only"
                  : fullStats?.ssl?.expire_date || ""}
              </div>
            </div>
          </div>

          {(site.git_repo_url || site.agent_token) && (
            <div className="settings-section" style={{ marginTop: 20 }}>
              <div className="settings-section__title">Connection</div>
              {site.git_repo_url && (
                <div className="settings-field">
                  <label>Git repository</label>
                  <input type="text" readOnly value={site.git_repo_url} />
                </div>
              )}
              {site.agent_token && (
                <div className="settings-field">
                  <label>Agent token</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                    <input
                      type="text"
                      readOnly
                      value={site.agent_token}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn-save"
                      onClick={async () => {
                        const ok = await copyToClipboard(site.agent_token);
                        alert(ok ? "Copied" : "Copy failed");
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "Metrics" && (
  <div>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 16,
      }}
    >
      <h3 style={{ margin: 0 }}>Performance & Resource Metrics</h3>
      <button
        type="button"
        className="btn-save"
        disabled={refreshing}
        onClick={handleRefreshChecks}
      >
        {refreshing ? "Refreshing…" : "Refresh metrics"}
      </button>
    </div>

    {/* Grafana iframe — графики */}
    <iframe
      src={`http://localhost:3100/d-solo/client-site/site-overview?orgId=1&refresh=30s&from=now-24h&to=now&var-site_url=${encodeURIComponent(site.url)}&panelId=2`}
      width="100%"
      height="400"
      frameBorder="0"
      style={{ borderRadius: 8, marginBottom: 20 }}
    />

    {/* Server header */}
    {fullStats?.server?.server && (
      <div className="settings-field" style={{ marginBottom: 16 }}>
        <label>Server header</label>
        <input type="text" readOnly value={fullStats.server.server} />
      </div>
    )}

    {/* Ping + DNS */}
    <div className="metrics-bar-row">
      {pingMs != null && (
        <div className="metrics-bar-item">
          <span className="metrics-bar-item__label">Ping avg</span>
          <div className="metrics-bar-item__track">
            <div
              className="metrics-bar-item__fill"
              style={{
                width: `${Math.min(100, (Number(pingMs) / 50) * 100)}%`,
              }}
            />
          </div>
          <span className="metrics-bar-item__val">{pingMs} ms</span>
        </div>
      )}
      {fullStats?.ping?.error && (
        <div className="metrics-bar-item">
          <span className="metrics-bar-item__label">Ping</span>
          <span className="metrics-bar-item__val">{fullStats.ping.error}</span>
        </div>
      )}
      <div className="metrics-bar-item">
        <span className="metrics-bar-item__label">DNS</span>
        <div className="metrics-bar-item__track">
          <div
            className="metrics-bar-item__fill"
            style={{ width: dnsOk ? "100%" : "0%" }}
          />
        </div>
        <span className="metrics-bar-item__val">
          {dnsOk ? fullStats.dns.ip : fullStats?.dns?.error || "Unresolved"}
        </span>
      </div>
    </div>

    {/* Grafana — CPU + RAM + Disk */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }}>
      <iframe
        src={`http://localhost:3100/d-solo/client-site/site-overview?orgId=1&refresh=30s&from=now-24h&to=now&var-site_url=${encodeURIComponent(site.url)}&panelId=3`}
        width="100%"
        height="250"
        frameBorder="0"
        style={{ borderRadius: 8 }}
      />
      <iframe
        src={`http://localhost:3100/d-solo/client-site/site-overview?orgId=1&refresh=30s&from=now-24h&to=now&var-site_url=${encodeURIComponent(site.url)}&panelId=4`}
        width="100%"
        height="250"
        frameBorder="0"
        style={{ borderRadius: 8 }}
      />
    </div>
    <div style={{ marginTop: 16 }}>
      <iframe
        src={`http://localhost:3100/d-solo/client-site/site-overview?orgId=1&refresh=30s&from=now-24h&to=now&var-site_url=${encodeURIComponent(site.url)}&panelId=5`}
        width="100%"
        height="250"
        frameBorder="0"
        style={{ borderRadius: 8 }}
      />
    </div>
  </div>
)}

      {activeTab === "Deploy" && (
        <div>
          <div className="deploy-actions">
            <button type="button" className="btn-deploy" onClick={handleDeploy}>
              Deploy
            </button>
            <button
              type="button"
              className="btn-rollback"
              onClick={handleRollback}
            >
              ↩ Rollback
            </button>
          </div>
          {lastAction && (
            <pre
              className="deploy-log"
              style={{
                marginTop: 16,
                whiteSpace: "pre-wrap",
                fontSize: 12,
                color: "#909090",
              }}
            >
              {lastAction}
            </pre>
          )}
          <div className="deploy-log">
            <div className="deploy-log__title">Deploy</div>
            <div className="deploy-log__item">
              <span className="deploy-log__msg">
                With a connected agent, commands are sent over WebSocket;
                otherwise the API uses the configured GitLab pipeline.
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
              <label htmlFor="site-name">Site name</label>
              <input
                id="site-name"
                type="text"
                defaultValue={site.name}
                key={`name-${site.name}`}
                onBlur={(e) => {
                  if (e.target.value !== site.name)
                    handleUpdate("name", e.target.value);
                }}
                disabled={updating}
              />
            </div>
            <div className="settings-field">
              <label htmlFor="site-url">URL</label>
              <input
                id="site-url"
                type="text"
                defaultValue={site.url}
                key={`url-${site.url}`}
                onBlur={(e) => {
                  if (e.target.value !== site.url)
                    handleUpdate("url", e.target.value);
                }}
                disabled={updating}
              />
            </div>
            <div className="settings-field">
              <label htmlFor="site-active">Active monitoring</label>
              <input
                id="site-active"
                type="checkbox"
                checked={Boolean(site.active)}
                onChange={(e) => handleUpdate("active", e.target.checked)}
                disabled={updating}
              />
            </div>
            <button
              type="button"
              className="btn-save"
              disabled={updating}
              style={{ marginTop: 12 }}
            >
              Save (auto on blur / toggle)
            </button>
          </div>
          <div className="settings-section">
            <div className="settings-section__title">Danger Zone</div>
            <button type="button" className="btn-danger" onClick={handleDelete}>
              Delete site
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteDetail;
