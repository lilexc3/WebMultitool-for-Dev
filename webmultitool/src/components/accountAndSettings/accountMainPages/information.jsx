import React, { useEffect, useState } from "react";
import {
  getSites,
  getOnlineSiteIds,
  healthCheck,
  getServerStats,
} from "../../../api";
import { useAuth } from "../../../contexts/AuthContext";
import "./information.css";

const Information = () => {
  const { user } = useAuth();
  const [sites, setSites] = useState([]);
  const [onlineIds, setOnlineIds] = useState([]);
  const [apiHealth, setApiHealth] = useState(null);
  const [serverStats, setServerStats] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [siteList, ids, health, stats] = await Promise.all([
          getSites(),
          getOnlineSiteIds().catch(() => []),
          healthCheck().catch(() => null),
          getServerStats().catch(() => null),
        ]);
        if (cancelled) return;
        setSites(siteList);
        setOnlineIds(ids);
        setApiHealth(health);
        setServerStats(stats);
        setLoadError(null);
      } catch (e) {
        if (!cancelled) setLoadError(e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const agentsOnlineCount = sites.filter((s) => onlineIds.includes(s.id))
    .length;

  return (
    <div>
      <h1 className="information__title">Information</h1>
      <p className="information__subtitle">
        Live summary from the API and your workspace
      </p>

      {loadError && (
        <p style={{ color: "#e05252", fontSize: 13, marginBottom: 16 }}>
          {loadError}
        </p>
      )}

      <div className="information__grid">
        <div className="info-card">
          <div className="info-card__label">Total sites</div>
          <div className="info-card__value">{sites.length}</div>
          <div className="info-card__sub">in your account</div>
        </div>
        <div className="info-card">
          <div className="info-card__label">Agents online</div>
          <div className="info-card__value">{agentsOnlineCount}</div>
          <div className="info-card__sub">
            of {sites.length} sites (WebSocket)
          </div>
        </div>
        <div className="info-card">
          <div className="info-card__label">API</div>
          <div className="info-card__value">
            {apiHealth?.status === "healthy" ? "OK" : "—"}
          </div>
          <div className="info-card__sub">/health</div>
        </div>
      </div>

      {serverStats && (
        <div className="information__section" style={{ marginTop: 8 }}>
          <div className="information__section-title">API host load</div>
          <div className="information__row">
            <span className="information__row-label">CPU</span>
            <span className="information__row-value">
              {serverStats.cpu != null
                ? `${Number(serverStats.cpu).toFixed(1)}%`
                : "—"}
            </span>
          </div>
          <div className="information__row">
            <span className="information__row-label">Memory</span>
            <span className="information__row-value">
              {serverStats.memory != null
                ? `${Number(serverStats.memory).toFixed(1)}%`
                : "—"}
            </span>
          </div>
          <div className="information__row">
            <span className="information__row-label">Disk</span>
            <span className="information__row-value">
              {serverStats.disk != null
                ? `${Number(serverStats.disk).toFixed(1)}%`
                : "—"}
            </span>
          </div>
        </div>
      )}

      <div className="information__section">
        <div className="information__section-title">Account</div>
        <div className="information__row">
          <span className="information__row-label">User ID</span>
          <span className="information__row-value">
            {user?.id != null ? String(user.id) : "—"}
          </span>
        </div>
        <div className="information__row">
          <span className="information__row-label">Plan</span>
          <span className="information__row-value information__row-value--accent">
            Free
          </span>
        </div>
      </div>
    </div>
  );
};

export default Information;
