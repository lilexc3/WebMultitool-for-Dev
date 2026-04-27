import React from "react";
import { useNavigate } from "react-router-dom";
import "./sites-list.css";

const MOCK_SITES = [
  { id: "1", name: "my-app", domain: "my-app.webmultitool.ru", status: "online", deploys: 12, lastDeploy: "2h ago" },
  { id: "2", name: "landing-page", domain: "landing.webmultitool.ru", status: "online", deploys: 5, lastDeploy: "1d ago" },
  { id: "3", name: "api-service", domain: "api.webmultitool.ru", status: "offline", deploys: 3, lastDeploy: "3d ago" },
];

const SitesList = () => {
  const navigate = useNavigate();

  return (
    <div>
      <div className="sites-list__header">
        <div>
          <h1 className="sites-list__title">Sites</h1>
          <p className="sites-list__subtitle">Manage and monitor your applications</p>
        </div>
        <button className="btn-primary" onClick={() => navigate("/dashboard/sites/new")}>
          + Add site
        </button>
      </div>

      <div className="sites-list__grid">
        {MOCK_SITES.map((site) => (
          <div
            key={site.id}
            className="site-card"
            onClick={() => navigate(`/dashboard/sites/${site.id}`)}
          >
            <div className="site-card__header">
              <span className="site-card__name">{site.name}</span>
              <div className="site-card__status">
                <span className={`status-dot status-dot--${site.status}`} />
                {site.status}
              </div>
            </div>
            <div className="site-card__domain">{site.domain}</div>
            <div className="site-card__meta">
              <div className="site-card__meta-item">
                Deploys: <span>{site.deploys}</span>
              </div>
              <div className="site-card__meta-item">
                Last: <span>{site.lastDeploy}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SitesList;
