import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createSite } from "../../api";
import "./site-new.css";

const TOTAL_STEPS = 4;

const StepIndicator = ({ current }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      width: "100%",
      margin: "4px 0",
    }}
  >
    {Array.from({ length: TOTAL_STEPS }, (_, i) => {
      const step = i + 1;
      const done = step < current;
      const active = step === current;
      return (
        <React.Fragment key={step}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: `2px solid ${active ? "#00c896" : done ? "#00c896" : "#333"}`,
              background: active ? "#00c896" : "#111",
              color: active ? "#000" : done ? "#00c896" : "#555",
              fontSize: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {done ? "✓" : step}
          </div>
          {step < TOTAL_STEPS && (
            <div
              style={{
                flex: 1,
                height: 2,
                background: done ? "#00c896" : "#252525",
              }}
            />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ── Step 1: Create Site ────────────────────────────────────────────────────
const Step1 = ({ data, onChange, onNext, onCancel }) => (
  <div className="onboarding-card">
    <div className="onboarding-card__label">1. Create Site</div>
    <StepIndicator current={1} />
    <h2 className="onboarding-card__title">Create your site</h2>
    <p className="onboarding-card__subtitle">
      Add site information and connect your Git repository.
    </p>

    <div className="form-field">
      <label>Site Name</label>
      <input
        type="text"
        value={data.name}
        onChange={(e) => onChange("name", e.target.value)}
        placeholder="E.g.: production-api"
        required
      />
    </div>
    <div className="form-field">
      <label>Site URL</label>
      <input
        type="text"
        value={data.url}
        onChange={(e) => onChange("url", e.target.value)}
        placeholder="https://example.com"
        required
      />
    </div>
    <div className="form-field">
      <label>Git Repository</label>
      <input
        type="text"
        value={data.gitRepo}
        onChange={(e) => onChange("gitRepo", e.target.value)}
        placeholder="https://github.com/username/my-project.git"
      />
      <span className="form-field__hint">
        One repository will be used for all nodes and services.
      </span>
    </div>

    <div className="onboarding-card__actions">
      <button className="btn-secondary" type="button" onClick={onCancel}>
        Cancel
      </button>
      <button
        className="btn-green"
        type="button"
        onClick={onNext}
        disabled={!data.name || !data.url}
      >
        Create Site
      </button>
    </div>
  </div>
);

// ── Step 2: Add Node ────────────────────────────────────────────────
const Step2 = ({ data, onChange, onNext, onBack }) => (
  <div className="onboarding-card">
    <div className="onboarding-card__label">2. Add Node</div>
    <StepIndicator current={2} />
    <h2 className="onboarding-card__title">Add your first node</h2>
    <p className="onboarding-card__subtitle">
      A node is your server where services will be run.
    </p>

    <div className="form-field">
      <label>Node name</label>
      <input
        type="text"
        value={data.nodeName}
        onChange={(e) => onChange("nodeName", e.target.value)}
        placeholder="For example: Main server"
        required
      />
    </div>
    <div className="form-field">
      <label>VPS IP address (optional)</label>
      <input
        type="text"
        value={data.nodeIp}
        onChange={(e) => onChange("nodeIp", e.target.value)}
        placeholder="192.168.1.100"
      />
      <span className="form-field__hint">
        If the IP is not specified, it will be determined automatically by the
        agent.
      </span>
    </div>

    <div className="onboarding-card__actions">
      <button className="btn-secondary" type="button" onClick={onBack}>
        Back
      </button>
      <button
        className="btn-green"
        type="button"
        onClick={onNext}
        disabled={!data.nodeName}
      >
        Continue
      </button>
    </div>
  </div>
);

// ── Step 3: services ────────────────────────────────────────────────────────
const emptyService = () => ({
  name: "Frontend",
  repoPath: "frontend/",
  buildCmd: "npm install && npm run build",
  useCompose: false,
});

const Step3 = ({ services, onChange, onAdd, onRemove, onNext, onBack }) => (
  <div className="onboarding-card onboarding-card--wide">
    <div className="onboarding-card__label">3. Adding services to the node</div>
    <StepIndicator current={3} />
    <h2 className="onboarding-card__title">
      Which services are running on this node?
    </h2>
    <p className="onboarding-card__subtitle">
      Add at least one service. You can add more later.
    </p>

    {services.map((svc, i) => (
      <div key={i} className="service-block">
        <div className="service-block__header">
          <span>Service #{i + 1}</span>
          {services.length > 1 && (
            <button
              className="service-block__remove"
              type="button"
              onClick={() => onRemove(i)}
            >
              🗑
            </button>
          )}
        </div>
        <div className="service-block__row">
          <div className="form-field">
            <label>Service name</label>
            <input
              type="text"
              value={svc.name}
              onChange={(e) => onChange(i, "name", e.target.value)}
              placeholder="Frontend"
            />
          </div>
          <div className="form-field">
            <label>Repository path</label>
            <input
              type="text"
              value={svc.repoPath}
              onChange={(e) => onChange(i, "repoPath", e.target.value)}
              placeholder="frontend/"
            />
            <span className="form-field__hint">
              Path relative to the repository root
            </span>
          </div>
        </div>
        <div className="form-field">
          <label>Build command</label>
          <input
            type="text"
            value={svc.buildCmd}
            onChange={(e) => onChange(i, "buildCmd", e.target.value)}
            placeholder="npm install && npm run build"
          />
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={svc.useCompose}
            onChange={(e) => onChange(i, "useCompose", e.target.checked)}
          />
          Use Docker Compose
        </label>
      </div>
    ))}

    <button className="btn-add-service" type="button" onClick={onAdd}>
      + Add another service
    </button>

    <div className="onboarding-card__actions">
      <button className="btn-secondary" type="button" onClick={onBack}>
        Back
      </button>
      <button className="btn-green" type="button" onClick={onNext}>
        Done
      </button>
    </div>
  </div>
);

// ── Шаг 4: запуск агента ─────────────────────────────────────────────────
const Step4 = ({ result, onFinish }) => {
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const copy = async (text, setCopied) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="onboarding-card">
      <div className="onboarding-card__label">
        4. Run the agent on your server
      </div>
      <StepIndicator current={4} />
      <div className="step4-check">✓</div>
      <h2 className="onboarding-card__title">Almost ready!</h2>
      <p className="onboarding-card__subtitle">
        Node and services have been successfully added. Run the agent on your
        server to enable monitoring.
      </p>

      <div className="form-field">
        <label>Agent startup command</label>
        <div className="copy-block">
          <pre className="copy-block__text">{result.agent_command}</pre>
          <button
            className="copy-block__btn"
            type="button"
            onClick={() => copy(result.agent_command, setCopiedCmd)}
          >
            {copiedCmd ? "✓" : "📋"} Copy
          </button>
        </div>
      </div>

      <div className="form-field">
        <label>Agent token</label>
        <div className="copy-block">
          <pre className="copy-block__text">{result.agent_token}</pre>
          <button
            className="copy-block__btn"
            type="button"
            onClick={() => copy(result.agent_token, setCopiedToken)}
          >
            {copiedToken ? "✓" : "📋"} Copy
          </button>
        </div>
      </div>

      <button
        className="btn-green"
        style={{ width: "100%", marginTop: 8 }}
        type="button"
        onClick={onFinish}
      >
        Go to site
      </button>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────
const SiteNew = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [siteData, setSiteData] = useState({ name: "", url: "", gitRepo: "" });
  const [nodeData, setNodeData] = useState({ nodeName: "", nodeIp: "" });
  const [services, setServices] = useState([emptyService()]);

  const changeSite = (k, v) => setSiteData((p) => ({ ...p, [k]: v }));
  const changeNode = (k, v) => setNodeData((p) => ({ ...p, [k]: v }));
  const changeService = (i, k, v) =>
    setServices((p) => p.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)));
  const addService = () => setServices((p) => [...p, emptyService()]);
  const removeService = (i) =>
    setServices((p) => p.filter((_, idx) => idx !== i));

  const handleFinish = async () => {
    setLoading(true);
    try {
      const data = await createSite({
        name: siteData.name,
        url: siteData.url,
        git_repo_url: siteData.gitRepo || null,
      });
      setResult(data);
      setStep(4);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-wrapper">
      <div className="onboarding-header">
        <h1 className="site-new__title">Add a new site</h1>
      </div>

      {step === 1 && (
        <Step1
          data={siteData}
          onChange={changeSite}
          onNext={() => setStep(2)}
          onCancel={() => navigate("/dashboard/sites")}
        />
      )}
      {step === 2 && (
        <Step2
          data={nodeData}
          onChange={changeNode}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <Step3
          services={services}
          onChange={changeService}
          onAdd={addService}
          onRemove={removeService}
          onNext={handleFinish}
          onBack={() => setStep(2)}
        />
      )}
      {step === 4 && result && (
        <Step4 result={result} onFinish={() => navigate(`/dashboard/sites`)} />
      )}

      {loading && (
        <div style={{ color: "#888", marginTop: 16 }}>Creating site...</div>
      )}
    </div>
  );
};

export default SiteNew;
