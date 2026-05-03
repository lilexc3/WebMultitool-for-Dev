import React from "react";
import "./information.css";

const Information = () => {
  return (
    <div>
      <h1 className="information__title">Information</h1>
      <p className="information__subtitle">Overview of your account activity</p>

      <div className="information__grid">
        <div className="info-card">
          <div className="info-card__label">Total Sites</div>
          <div className="info-card__value">3</div>
          <div className="info-card__sub">across all projects</div>
        </div>
        <div className="info-card">
          <div className="info-card__label">Deploys</div>
          <div className="info-card__value">24</div>
          <div className="info-card__sub info-card__sub--up">↑ this month</div>
        </div>
        <div className="info-card">
          <div className="info-card__label">Uptime</div>
          <div className="info-card__value">99.8%</div>
          <div className="info-card__sub info-card__sub--up">
            ↑ last 30 days
          </div>
        </div>
      </div>

      <div className="information__section">
        <div className="information__section-title">Account Details</div>
        <div className="information__row">
          <span className="information__row-label">Member since</span>
          <span className="information__row-value">January 2025</span>
        </div>
        <div className="information__row">
          <span className="information__row-label">Plan</span>
          <span className="information__row-value information__row-value--accent">
            Free
          </span>
        </div>
        <div className="information__row">
          <span className="information__row-label">Sites limit</span>
          <span className="information__row-value">3 / 5</span>
        </div>
        <div className="information__row">
          <span className="information__row-label">Last login</span>
          <span className="information__row-value">Today, 14:32</span>
        </div>
      </div>
    </div>
  );
};

export default Information;
