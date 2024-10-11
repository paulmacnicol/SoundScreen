import React from 'react';
import { useHistory } from 'react-router-dom';

function SubscriptionPage() {
  const history = useHistory();

  const handleSubscriptionSelect = (subscriptionType) => {
    // Store the selected subscription in local storage or send it to the backend
    localStorage.setItem('subscriptionType', subscriptionType);

    // Redirect the user to the control panel after selecting subscription
    history.push('/control-panel');
  };

  return (
    <div>
      <h1>Select Your Subscription Plan</h1>
      <div>
        <h3>Free Plan</h3>
        <p>1 Site, 1 Area, 3 Devices</p>
        <button onClick={() => handleSubscriptionSelect('Free')}>Choose Free</button>
      </div>
      <div>
        <h3>Single Site Plan</h3>
        <p>1 Site, Unlimited Areas, 10 Devices</p>
        <button onClick={() => handleSubscriptionSelect('Single Site')}>Choose Single Site</button>
      </div>
      <div>
        <h3>Multi Site Plan</h3>
        <p>5 Sites, Unlimited Areas, 50 Devices</p>
        <button onClick={() => handleSubscriptionSelect('Multi Site')}>Choose Multi Site</button>
      </div>
      <div>
        <h3>Enterprise Plan</h3>
        <p>Unlimited Sites, Areas, and Devices</p>
        <button onClick={() => handleSubscriptionSelect('Enterprise')}>Choose Enterprise</button>
      </div>
    </div>
  );
}

export default SubscriptionPage;
