import React from "react";
import Image from "./image";
import LogInBlock from "./log-in-block";
import "./log-in-page.css";

const LogInPage = () => {
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
