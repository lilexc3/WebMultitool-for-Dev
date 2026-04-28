import React from "react";
import "./account-settings.css";

const AccountSettings = () => {
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
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            placeholder="your-username"
          />
        </div>

        <div className="account-settings__field">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="you@example.com"
          />
        </div>

        <button type="submit" className="account-settings__save">
          Save Changes
        </button>
      </div>

      <div className="account-settings__section">
        <div className="account-settings__section-title">Password</div>
        <div className="account-settings__section-desc">
          Change your login password
        </div>

        <div className="account-settings__field">
          <label htmlFor="password">New Password</label>
          <input
            type="password"
            id="password"
            name="password"
            placeholder="••••••••"
          />
        </div>

        <button type="submit" className="account-settings__save">
          Update Password
        </button>
      </div>

      <div className="account-settings__section">
        <div className="account-settings__section-title">Danger Zone</div>
        <div className="account-settings__section-desc">
          Permanently delete your account and all data
        </div>
        <button type="button" className="account-settings__danger">
          Delete Account
        </button>
      </div>
    </div>
  );
};

export default AccountSettings;
