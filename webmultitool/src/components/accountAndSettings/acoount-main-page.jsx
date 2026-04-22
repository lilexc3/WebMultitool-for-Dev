import { useState } from 'react';
import React from 'react';
import AccountSettings from './accountMainPages/account-settings.jsx';

const accountSettings = () => <div>Account Settings</div>;
const yourProjects = () => <div>Your Projects</div>;
const information = () => <div>Information</div>;


const TABS = [
  { id: 'home',    label: 'Account Settings',  Component: accountSettings },
  { id: 'about',   label: 'Your Projects',    Component: yourProjects },
  { id: 'contact', label: 'Information', Component: information },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('home');

  const { Component } = TABS.find(t => t.id === activeTab);

  return (
    <div>
      <nav>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? 'active' : ''}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <Component />
    </div>
  );
}

export default AcoountMainPage;
