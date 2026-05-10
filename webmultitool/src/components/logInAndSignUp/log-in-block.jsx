import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "./log-in-block.css";

const LogInBlock = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/dashboard/sites");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="log-in-block" onSubmit={handleSubmit}>
      <h2 className="log-in-block__title">Welcome back</h2>
      <p className="log-in-block__subtitle">
        Sign in to your account to continue
      </p>

      <label htmlFor="email">Email</label>
      <input
        type="email"
        id="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <label htmlFor="password">Password</label>
      <input
        type="password"
        id="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      {error && (
        <div style={{ color: "#e05252", fontSize: "13px", marginTop: "8px" }}>
          {error}
        </div>
      )}
      <button type="submit">Log In</button>

      <p className="log-in-block__footer">
        Don't have an account?{" "}
        <a onClick={() => navigate("/sign-up")} style={{ cursor: "pointer" }}>
          Sign up
        </a>
      </p>
    </form>
  );
};

export default LogInBlock;
