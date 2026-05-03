import React from "react";
import { useNavigate } from "react-router-dom";
import "./log-in-banner.css";

const LogInBanner = () => {
  const navigate = useNavigate();

  return (
    <div className="log-in-banner">
      <button className="log-in-button" onClick={() => navigate("/log-in")}>
        Sign in with Email
      </button>
      <button className="sign-up-button" onClick={() => navigate("/sign-up")}>
        Sign Up
      </button>
    </div>
  );
};

export default LogInBanner;
