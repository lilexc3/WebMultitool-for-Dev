import React from "react";
import LogInBanner from "./log-in-banner";

const StartBanner = () => {
  return (
    <div className="Start-Banner">
      <h1 className="welcome-text">Welcome to WebMultiTool App</h1>
      <h1 className="welcome-text">Deploy, Monitor, Rollback</h1>
      <h2 className="slogan-text">All From One Dashboard</h2>
      <p className="about-text">Manage Your Applications with Ease</p>
      <LogInBanner />
      <ul>
        <li>Docs</li>
        <li>Status</li>
        <li>Support</li>
      </ul>
    </div>
  );
};

export default StartBanner;
