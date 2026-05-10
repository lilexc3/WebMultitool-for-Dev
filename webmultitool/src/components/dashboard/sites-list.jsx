import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSites, deleteSite } from "../../api";
import "./sites-list.css";

const SitesList = () => {
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSites = async () => {
    try {
      const data = await getSites();
      setSites(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm("Delete this site? All data will be removed.")) {
      await deleteSite(id);
      fetchSites();
    }
  };

  if (loading) return <div style={{ color: "#fff" }}>Loading sites...</div>;

  return (
    <div>
      <div className="sites-list__header">
        <div>
          <h1 className="sites-list__title">Sites</h1>
          <p className="sites-list__subtitle">
            Manage and monitor your applications
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => navigate("/dashboard/sites/new")}
        >
          + Add site
        </button>
      </div>

      {sites.length === 0 ? (
        <div className="sites-list__empty">
          <div className="sites-list__empty-icon">🌐</div>
          <div className="sites-list__empty-title">No sites yet</div>
          <div className="sites-list__empty-text">
            Add your first site to start deploying
          </div>
        </div>
      ) : (
        <div className="sites-list__grid">
          {sites.map((site) => (
            <div
              key={site.id}
              className="site-card"
              onClick={() => navigate(`/dashboard/sites/${site.id}`)}
            >
              <div className="site-card__header">
                <span className="site-card__name">{site.name}</span>
                <div className="site-card__status">
                  <span
                    className={`status-dot ${
                      site.agent_connected
                        ? "status-dot--online"
                        : "status-dot--offline"
                    }`}
                  />
                  {site.agent_connected
                    ? "online"
                    : site.last_status === 200
                      ? "online"
                      : "offline"}
                </div>
              </div>
              <div className="site-card__domain">{site.url}</div>
              <div className="site-card__meta">
                <div className="site-card__meta-item">
                  Deploys: <span>{site.deploys_count || 0}</span>
                </div>
                <div className="site-card__meta-item">
                  Last:{" "}
                  <span>
                    {site.last_check
                      ? new Date(site.last_check).toLocaleString()
                      : "never"}
                  </span>
                </div>
              </div>
              <button
                className="btn-danger"
                style={{ marginTop: 8, padding: "6px 12px", fontSize: 11 }}
                onClick={(e) => handleDelete(site.id, e)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SitesList;
