import React, { useEffect, useState } from "react";
import { getMe, getSites } from "../../../api";
import "./information.css";

const Information = () => {
  const [profile, setProfile] = useState(null);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMe(), getSites()])
      .then(([me, sitesData]) => {
        setProfile(me);
        setSites(sitesData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalDeploys = sites.reduce(
    (acc, s) => acc + (s.deploys_count || 0),
    0,
  );
  const avgUptime =
    profile?.avg_uptime_30d != null ? `${profile.avg_uptime_30d}%` : "N/A";
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "—";

  if (loading) return <div style={{ color: "#fff" }}>Loading...</div>;

  return (
    <div>
      <h1 className="information__title">Information</h1>
      <p className="information__subtitle">Overview of your account activity</p>

      <div className="information__grid">
        <div className="info-card">
          <div className="info-card__label">Total Sites</div>
          <div className="info-card__value">
            {profile?.total_sites ?? sites.length}
          </div>
          <div className="info-card__sub">across all projects</div>
        </div>
        <div className="info-card">
          <div className="info-card__label">Deploys</div>
          <div className="info-card__value">{totalDeploys}</div>
          <div className="info-card__sub info-card__sub--up">↑ all time</div>
        </div>
        <div className="info-card">
          <div className="info-card__label">Uptime</div>
          <div className="info-card__value">{avgUptime}</div>
          <div className="info-card__sub info-card__sub--up">
            ↑ last 30 days
          </div>
        </div>
      </div>

      <div className="information__section">
        <div className="information__section-title">Account Details</div>
        <div className="information__row">
          <span className="information__row-label">Member since</span>
          <span className="information__row-value">{memberSince}</span>
        </div>
        <div className="information__row">
          <span className="information__row-label">Email</span>
          <span className="information__row-value">
            {profile?.email ?? "—"}
          </span>
        </div>
        <div className="information__row">
          <span className="information__row-label">Name</span>
          <span className="information__row-value">{profile?.name ?? "—"}</span>
        </div>
        <div className="information__row">
          <span className="information__row-label">Sites</span>
          <span className="information__row-value">
            {profile?.total_sites ?? sites.length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Information;
