import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Image from "./image";
import "./log-in-page.css";
import "./sign-up.css";

const SignUpPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    try {
      await register(email, password, name);
      navigate("/dashboard/sites");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="log-in-page">
      <div className="log-in-page__image">
        <Image />
      </div>
      <div className="log-in-page__block">
        <form className="sign-up" onSubmit={handleSubmit}>
          <h2 className="sign-up__title">Create account</h2>
          <p className="sign-up__subtitle">Get started with WebMultiTool</p>

          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

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

          <label htmlFor="confirm-password">Confirm Password</label>
          <input
            type="password"
            id="confirm-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />

          {error && (
            <div
              style={{ color: "#e05252", fontSize: "13px", marginTop: "8px" }}
            >
              {error}
            </div>
          )}

          <button type="submit">Sign Up</button>

          <p className="sign-up__footer">
            Already have an account?{" "}
            <a
              onClick={() => navigate("/log-in")}
              style={{ cursor: "pointer" }}
            >
              Log in
            </a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SignUpPage;
