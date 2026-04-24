import React from "react";
import { useNavigate } from "react-router-dom";
import Image from "./image";
import LogInBlock from "./log-in-block";
import "./log-in-page.css";

const LogInPage = () => {
  const navigate = useNavigate();
  return (
    <div className="log-in-page">
      <div className="log-in-page__image">
        <Image />
      </div>
      <div className="log-in-page__block">
        <LogInBlock />
      </div>
    </div>
  );
};

export default LogInPage;
