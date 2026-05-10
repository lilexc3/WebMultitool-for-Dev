import React from "react";
import { useAuth } from "../../../contexts/AuthContext";
import "./account-settings.css";

const AccountSettings = () => {
  const { user, logout } = useAuth();

  return (
    <div className="account-settings">
      <h1 className="account-settings__title">Account Settings</h1>
      <p className="account-settings__subtitle">
        Your session is tied to the API user below. Profile and password changes
        are not exposed by the API yet—use this panel to review your account and
        sign out.
      </p>

      <div className="account-settings__section">
        <div className="account-settings__section-title">Session</div>
        <div className="account-settings__section-desc">
          Authenticated user from your last login or sign-up
        </div>

        <div className="account-settings__field">
          <label htmlFor="user-id">User ID</label>
          <input
            type="text"
            id="user-id"
            name="user-id"
            readOnly
            value={user?.id != null ? String(user.id) : ""}
            placeholder="—"
          />
        </div>

        <button type="button" className="account-settings__save" onClick={logout}>
          Log out
        </button>
      </div>

      <div className="account-settings__section">
        <div className="account-settings__section-title">Profile &amp; password</div>
        <div className="account-settings__section-desc">
          The backend currently provides register, login, and JWT access only.
          When user profile endpoints are added, this form can be wired the same
          way as the sites screens.
        </div>
        <div className="account-settings__field">
          <label htmlFor="email-placeholder">Email</label>
          <input
            type="email"
            id="email-placeholder"
            disabled
            placeholder="Not available from API"
          />
        </div>
        <div className="account-settings__field">
          <label htmlFor="name-placeholder">Display name</label>
          <input
            type="text"
            id="name-placeholder"
            disabled
            placeholder="Not available from API"
          />
        </div>
        <button type="button" className="account-settings__save" disabled>
          Save changes
        </button>
      </div>

      <div className="account-settings__section">
        <div className="account-settings__section-title">Danger zone</div>
        <div className="account-settings__section-desc">
          Account deletion is not implemented in the API. Remove individual sites
          from the Sites list instead.
        </div>
        <button type="button" className="account-settings__danger" disabled>
          Delete account
        </button>
      </div>
    </div>
  );
};

export default AccountSettings;
