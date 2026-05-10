import React, { useEffect, useState } from "react";
import { getSites } from "../../../api";
import "./your-projects.css";

const YourProjects = () => {
  const [sites, setSites] = useState([]);
  useEffect(() => {
    getSites().then(setSites).catch(console.error);
  }, []);
  return (
    <div>
      <h1 className="your-projects__title">Your Projects</h1>
      <div className="your-projects__grid">
        {sites.map((site) => (
          <div key={site.id} className="project-card">
            <div className="project-card__name">{site.name}</div>
            <div className="project-card__domain">{site.url}</div>
            <div className="project-card__footer">
              <div className="project-card__status">
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
          </div>
        ))}
      </div>
    </div>
  );
};

export default YourProjects;
