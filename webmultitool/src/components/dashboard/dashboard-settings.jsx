import React from "react";
import "./dashboard-settings.css";
import "./site-detail.css";

const DashboardSettings = () => {
  return (
    <div>
      <h1 className="dash-settings__title">Account Settings</h1>
      <p className="dash-settings__subtitle">Manage your profile and preferences</p>

      <div className="settings-section">
        <div className="settings-section__title">Profile</div>
        <div className="settings-section__desc">Your personal information</div>
        <div className="settings-field">
          <label>Username</label>
          <input type="text" defaultValue="john_doe" />
        </div>
        <div className="settings-field">
          <label>Email</label>
          <input type="email" defaultValue="john@example.com" />
        </div>
        <button className="btn-save">Save changes</button>
      </div>

      <div className="settings-section">
        <div className="settings-section__title">Password</div>
        <div className="settings-section__desc">Change your login password</div>
        <div className="settings-field">
          <label>Current password</label>
          <input type="password" placeholder="••••••••" />
        </div>
        <div className="settings-field">
          <label>New password</label>
          <input type="password" placeholder="••••••••" />
        </div>
        <button className="btn-save">Update password</button>
      </div>

      <div className="settings-section">
        <div className="settings-section__title">Danger Zone</div>
        <div className="settings-section__desc">Permanently delete your account and all data</div>
        <button className="btn-danger">Delete account</button>
      </div>
    </div>
  );
};

export default DashboardSettings;
