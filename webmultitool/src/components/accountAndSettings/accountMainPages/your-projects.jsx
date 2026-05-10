import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSites } from "../../../api";
import "./your-projects.css";

const YourProjects = () => {
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);

  useEffect(() => {
    getSites().then(setSites).catch(console.error);
  }, []);

  return (
    <div>
      <h1 className="your-projects__title">Your Projects</h1>
      <p
        className="your-projects__subtitle"
        style={{ color: "#707070", fontSize: 13, marginBottom: 20 }}
      >
        Click a project to open monitoring and deploy actions
      </p>
      <div className="your-projects__grid">
        {sites.length === 0 ? (
          <div style={{ color: "#606060", fontSize: 13 }}>No sites yet.</div>
        ) : (
          sites.map((site) => (
            <div
              key={site.id}
              className="project-card"
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/dashboard/sites/${site.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  navigate(`/dashboard/sites/${site.id}`);
              }}
              style={{ cursor: "pointer" }}
            >
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
                    ? "agent online"
                    : site.last_status === 200
                      ? "reachable"
                      : "agent offline"}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default YourProjects;
