import React from "react";
import { useNavigate } from "react-router-dom";
import "./site-new.css";

const SiteNew = () => {
  const navigate = useNavigate();

  return (
    <div>
      <div className="site-new__header">
        <h1 className="site-new__title">Add new site</h1>
        <p className="site-new__subtitle">Connect your server to start deploying</p>
      </div>

      <div className="site-new__form">
        <div className="form-field">
          <label>Site name</label>
          <input type="text" placeholder="my-app" />
          <span className="form-field__hint">Used as an identifier, lowercase, no spaces</span>
        </div>

        <div className="form-field">
          <label>Domain</label>
          <input type="text" placeholder="https://your-domain.com" />
          <span className="form-field__hint">Your server's public address</span>
        </div>

        <div className="site-new__actions">
          <button
            className="btn-primary"
            onClick={() => navigate("/dashboard/sites")}
          >
            Create site
          </button>
          <button
            className="btn-rollback"
            style={{ padding: "11px 20px", background: "none", border: "1px solid #252525", borderRadius: "8px", fontSize: "13px", color: "#606060", cursor: "pointer" }}
            onClick={() => navigate("/dashboard/sites")}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SiteNew;
