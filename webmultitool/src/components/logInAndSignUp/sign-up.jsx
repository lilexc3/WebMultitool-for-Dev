import React from "react";
import "./sign-up.css";

const SignUp = () => {
  return (
    <div className="sign-up">
      <h2 className="sign-up__title">Create account</h2>
      <p className="sign-up__subtitle">Get started with WebMultiTool</p>

      <label htmlFor="username">Username</label>
      <input
        type="text"
        id="username"
        name="username"
        placeholder="your-username"
        required
      />

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

      <label htmlFor="confirm-password">Confirm Password</label>
      <input
        type="password"
        id="confirm-password"
        name="confirm-password"
        placeholder="••••••••"
        required
      />

      <button type="submit">Sign Up</button>

      <p className="sign-up__footer">
        Already have an account? <a href="/log-in">Log in</a>
      </p>
    </div>
  );
};

export default SignUp;
