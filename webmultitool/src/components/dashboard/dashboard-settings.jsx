import React, { useEffect, useState } from "react";
import {
  getMe,
  updateMe,
  changePassword,
  deleteAccount,
  logout,
} from "../../api";
import "./dashboard-settings.css";
import "./site-detail.css";

const DashboardSettings = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState(null);

  useEffect(() => {
    getMe()
      .then((data) => {
        setName(data.name || "");
        setEmail(data.email || "");
      })
      .catch(console.error);
  }, []);

  const handleProfileSave = async () => {
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      await updateMe({ name, email });
      setProfileMsg({ type: "success", text: "Changes saved" });
    } catch (err) {
      setProfileMsg({ type: "error", text: err.message });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordSaving(true);
    setPasswordMsg(null);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMsg({ type: "success", text: "Password updated" });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPasswordMsg({ type: "error", text: err.message });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !window.confirm("Delete your account permanently? This cannot be undone.")
    )
      return;
    try {
      await deleteAccount();
      logout();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <h1 className="dash-settings__title">Account Settings</h1>
      <p className="dash-settings__subtitle">
        Manage your profile and preferences
      </p>

      <div className="settings-section">
        <div className="settings-section__title">Profile</div>
        <div className="settings-section__desc">Your personal information</div>
        <div className="settings-field">
          <label>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="settings-field">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        {profileMsg && (
          <div
            style={{
              color: profileMsg.type === "success" ? "#4ade80" : "#f87171",
              marginBottom: 8,
              fontSize: 13,
            }}
          >
            {profileMsg.text}
          </div>
        )}
        <button
          type="button"
          className="btn-save"
          onClick={handleProfileSave}
          disabled={profileSaving}
        >
          {profileSaving ? "Saving..." : "Save changes"}
        </button>
      </div>

      <div className="settings-section">
        <div className="settings-section__title">Password</div>
        <div className="settings-section__desc">Change your login password</div>
        <div className="settings-field">
          <label>Current password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <div className="settings-field">
          <label>New password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        {passwordMsg && (
          <div
            style={{
              color: passwordMsg.type === "success" ? "#4ade80" : "#f87171",
              marginBottom: 8,
              fontSize: 13,
            }}
          >
            {passwordMsg.text}
          </div>
        )}
        <button
          type="button"
          className="btn-save"
          onClick={handlePasswordChange}
          disabled={passwordSaving || !currentPassword || !newPassword}
        >
          {passwordSaving ? "Updating..." : "Update password"}
        </button>
      </div>

      <div className="settings-section">
        <div className="settings-section__title">Danger Zone</div>
        <div className="settings-section__desc">
          Permanently delete your account and all data
        </div>
        <button
          type="button"
          className="btn-danger"
          onClick={handleDeleteAccount}
        >
          Delete account
        </button>
      </div>
    </div>
  );
};

export default DashboardSettings;
