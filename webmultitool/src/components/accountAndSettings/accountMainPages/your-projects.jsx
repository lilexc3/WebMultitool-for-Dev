import React from "react";
import "./your-projects.css";

const MOCK_PROJECTS = [
  {
    id: "1",
    name: "my-app",
    domain: "my-app.webmultitool.ru",
    status: "online",
    date: "2h ago",
  },
  {
    id: "2",
    name: "landing-page",
    domain: "landing.webmultitool.ru",
    status: "online",
    date: "1d ago",
  },
  {
    id: "3",
    name: "api-service",
    domain: "api.webmultitool.ru",
    status: "offline",
    date: "3d ago",
  },
];

const YourProjects = () => {
  return (
    <div>
      <h1 className="your-projects__title">Your Projects</h1>
      <p className="your-projects__subtitle">
        All sites connected to your account
      </p>

      <div className="your-projects__grid">
        {MOCK_PROJECTS.map((p) => (
          <div key={p.id} className="project-card">
            <div className="project-card__name">{p.name}</div>
            <div className="project-card__domain">{p.domain}</div>
            <div className="project-card__footer">
              <div className="project-card__status">
                <span className={`status-dot status-dot--${p.status}`} />
                {p.status}
              </div>
              <span className="project-card__date">{p.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default YourProjects;
