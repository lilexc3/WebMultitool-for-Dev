import React from "react";
import "./step1.css";

const Step1 = () => {
  return (
    <div className="step1-field">
      <h3>Step 1: Enter your domain</h3>
      <input
        className="input"
        type="text"
        placeholder="https:// your-domain.com"
      />
    </div>
  );
};

export default Step1;
