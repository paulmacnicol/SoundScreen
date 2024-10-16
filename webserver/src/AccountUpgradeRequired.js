// src/AccountUpgradeRequired.js
import React from 'react';
import { Link } from 'react-router-dom';

function AccountUpgradeRequired() {
  return (
    <div>
      <h1>Upgrade Required</h1>
      <p>Upgrade your package to access these features.</p>
      <Link to="/subscription">Go to Subscription Page</Link>
    </div>
  );
}

export default AccountUpgradeRequired;
