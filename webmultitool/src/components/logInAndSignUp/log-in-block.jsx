import React from "react";
import "./log-in-block.css";

const LogInBlock = () => {
  return (
    <div className="log-in-block">
      <h2 className="log-in-block__title">Welcome back</h2>
      <p className="log-in-block__subtitle">
        Sign in to your account to continue
      </p>

      <label htmlFor="email">Email</label>
      <input
        type="email"
        id="email"
        name="email"
        placeholder="you@example.com"
        required
      />

      <label htmlFor="password">Password</label>
      <input
        type="password"
        id="password"
        name="password"
        placeholder="••••••••"
        required
      />

      <button type="submit">Log In</button>

      <p className="log-in-block__footer">
        Don't have an account? <a href="/sign-up">Sign up</a>
      </p>
    </div>
  );
};

export default LogInBlock;
