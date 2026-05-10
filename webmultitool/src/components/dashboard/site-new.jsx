import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createSite, checkSiteHealthByUrl } from "../../api";
import "./site-new.css";

const SiteNew = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [gitRepo, setGitRepo] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [checkLoading, setCheckLoading] = useState(false);
  const [urlCheck, setUrlCheck] = useState(null);

  const handleTestUrl = async () => {
    if (!url.trim()) {
      alert("Enter a URL first");
      return;
    }
    setCheckLoading(true);
    setUrlCheck(null);
    try {
      const res = await checkSiteHealthByUrl(url.trim());
      setUrlCheck(res);
    } catch (err) {
      alert(err.message);
    } finally {
      setCheckLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await createSite({
        name,
        url,
        git_repo_url: gitRepo || null,
      });
      setResult(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div>
        <h1 className="site-new__title">Site Created!</h1>
        <div className="site-new__form">
          <div className="form-field">
            <label>Agent Token</label>
            <pre
              style={{
                background: "#0e0e0e",
                padding: 12,
                borderRadius: 7,
                overflowX: "auto",
              }}
            >
              {result.agent_token}
            </pre>
          </div>
          <div className="form-field">
            <label>Run this command on your server</label>
            <pre
              style={{
                background: "#0e0e0e",
                padding: 12,
                borderRadius: 7,
                overflowX: "auto",
              }}
            >
              {result.agent_command}
            </pre>
          </div>
          <button
            className="btn-primary"
            onClick={() => navigate("/dashboard/sites")}
          >
            Back to sites
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="site-new__header">
        <h1 className="site-new__title">Add new site</h1>
        <p className="site-new__subtitle">
          Connect your server to start deploying
        </p>
      </div>

      <form className="site-new__form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label>Site name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-app"
            required
          />
        </div>
        <div className="form-field">
          <label>URL (http:// or https://)</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-domain.com"
            required
          />
          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn-rollback"
              style={{
                padding: "8px 14px",
                background: "none",
                border: "1px solid #252525",
                fontSize: 12,
              }}
              disabled={checkLoading}
              onClick={handleTestUrl}
            >
              {checkLoading ? "Testing…" : "Test URL (public check)"}
            </button>
          </div>
          {urlCheck && (
            <div
              style={{
                marginTop: 10,
                fontSize: 12,
                color: urlCheck.is_accessible ? "#00c896" : "#e05252",
              }}
            >
              {urlCheck.is_accessible ? "Reachable" : "Unreachable"}
              {urlCheck.status_code ? ` · HTTP ${urlCheck.status_code}` : ""}
              {urlCheck.response_time != null
                ? ` · ${Math.round(Number(urlCheck.response_time) * 1000)} ms`
                : ""}
              {urlCheck.error ? ` · ${urlCheck.error}` : ""}
            </div>
          )}
        </div>
        <div className="form-field">
          <label>Git repo URL (optional)</label>
          <input
            type="text"
            value={gitRepo}
            onChange={(e) => setGitRepo(e.target.value)}
            placeholder="https://gitlab.com/user/repo.git"
          />
        </div>
        <div className="site-new__actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Creating..." : "Create site"}
          </button>
          <button
            type="button"
            className="btn-rollback"
            style={{
              padding: "11px 20px",
              background: "none",
              border: "1px solid #252525",
            }}
            onClick={() => navigate("/dashboard/sites")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default SiteNew;
