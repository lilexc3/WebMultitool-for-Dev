import React from "react";
import { useState } from "react";

export default function CopyField({ value }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="copy-field">
      <h3>Step 2: Copy and run this command on your server</h3>
      <span className="copy-field__text">{value}</span>
      <button onClick={handleCopy}>{copied ? "Copied!" : "Copy"}</button>
    </div>
  );
}
