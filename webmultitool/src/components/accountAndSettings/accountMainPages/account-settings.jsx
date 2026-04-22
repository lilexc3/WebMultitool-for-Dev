import React from "react";

const AccountSettings = () => {
  return (
    <div>
      <label htmlFor="username">Username:</label>
      <input type="text" id="username" name="username" />
      <label htmlFor="email">Email:</label>
      <input type="email" id="email" name="email" />
      <label htmlFor="password">Password:</label>
      <input type="password" id="password" name="password" />
      <button type="submit">Save Changes</button>
    </div>
  );
};

export default AccountSettings;
