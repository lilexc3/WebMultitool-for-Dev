import React, { useEffect, useState } from "react";
import {
  getMe,
  updateMe,
  changePassword,
  deleteAccount,
  logout,
} from "../../../api";
import "./account-settings.css";

const AccountSettings = () => {
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
      setProfileMsg({ type: "success", text: "Profile saved" });
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
    <div className="account-settings">
      <h1 className="account-settings__title">Account Settings</h1>
      <p className="account-settings__subtitle">
        Manage your profile and preferences
      </p>

      <div className="account-settings__section">
        <div className="account-settings__section-title">Profile</div>
        <div className="account-settings__section-desc">
          Your personal information
        </div>

        <div className="account-settings__field">
          <label htmlFor="username">Name</label>
          <input
            type="text"
            id="username"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div className="account-settings__field">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
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
          className="account-settings__save"
          onClick={handleProfileSave}
          disabled={profileSaving}
        >
          {profileSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="account-settings__section">
        <div className="account-settings__section-title">Password</div>
        <div className="account-settings__section-desc">
          Change your login password
        </div>

        <div className="account-settings__field">
          <label htmlFor="current-password">Current Password</label>
          <input
            type="password"
            id="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <div className="account-settings__field">
          <label htmlFor="new-password">New Password</label>
          <input
            type="password"
            id="new-password"
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
          className="account-settings__save"
          onClick={handlePasswordChange}
          disabled={passwordSaving || !currentPassword || !newPassword}
        >
          {passwordSaving ? "Updating..." : "Update Password"}
        </button>
      </div>

      <div className="account-settings__section">
        <div className="account-settings__section-title">Danger Zone</div>
        <div className="account-settings__section-desc">
          Permanently delete your account and all data
        </div>
        <button
          type="button"
          className="account-settings__danger"
          onClick={handleDeleteAccount}
        >
          Delete Account
        </button>
      </div>
    </div>
  );
};

export default AccountSettings;
