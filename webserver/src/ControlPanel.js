import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom'; // Add this line to handle routing

function ControlPanel() {
  const [site, setSite] = useState(null);
  const [areas, setAreas] = useState([]);
  const [newSiteName, setNewSiteName] = useState('');
  const [newAreaName, setNewAreaName] = useState(''); // Add newAreaName to the state
  const [message, setMessage] = useState('');
  const [subscriptionType, setSubscriptionType] = useState(''); // State to store the subscription type
  const history = useHistory(); // Add this for routing

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/sites', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSite(data.site);
        setAreas(data.areas.map((area) => ({ ...area, name: area.name }))); // Ensure each area has its own name state
        setNewSiteName(data.site.name);  // Set current site name in input
        setSubscriptionType(data.subscriptionType);
      } else {
        setMessage('Failed to load site data.');
      }
    };

    fetchData();
  }, []);

  const handleSiteRename = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/sites/${site.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ name: newSiteName }),
    });

    if (response.ok) {
      setMessage('Site renamed successfully!');
      setSite({ ...site, name: newSiteName });
    } else {
      setMessage('Failed to rename site.');
    }
  };

  const handleAreaRename = async (areaId, newName) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/areas/${areaId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ name: newName }),
    });

    if (response.ok) {
      setMessage('Area renamed successfully!');
      setAreas(areas.map(area => area.id === areaId ? { ...area, name: newName } : area));
    } else {
      setMessage('Failed to rename area.');
    }
  };

  const handleAddArea = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/areas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ siteId: site.id, name: newAreaName }),
    });

    if (response.ok) {
      const data = await response.json();
      setAreas([...areas, { id: data.areaId, name: newAreaName }]);
      setNewAreaName('');  // Clear input after adding
      setMessage('Area added successfully!');
    } else {
      setMessage('Failed to add area.');
    }
  };

  const handleRemoveArea = async (areaId) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/areas/${areaId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok) {
      setMessage('Area removed successfully!');
      setAreas(areas.filter((area) => area.id !== areaId));
    } else {
      setMessage('Failed to remove area.');
    }
  };

  const handleAddSite = async () => {
    // Use the state for subscription type
    if (subscriptionType === 'Free' && site) {
      history.push('/subscription'); // Redirect to subscription page if limit reached
    } else {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: 'New Site' }),  // Default new site name
      });

      const data = await response.json();
      if (response.ok) {
        setMessage('Site added successfully!');
        window.location.reload();  // Refresh to show new site
      } else if (data.message === 'Site limit reached for your subscription tier') {
        history.push('/subscription'); // Redirect if limit is reached
      } else {
        setMessage('Failed to add site.');
      }
    }
  };

  return (
    <div>
      <h1>Manager's Control Panel</h1>
      
      {/* Display the current subscription type */}
      {subscriptionType && <h2>Subscription: {subscriptionType}</h2>}

      {site && (
        <div>
          <h2>Site: {site.name}</h2>
          <input
            type="text"
            value={newSiteName}
            onChange={(e) => setNewSiteName(e.target.value)}
          />
          <button onClick={handleSiteRename}>Rename Site</button>

          <h3>Areas</h3>
          <ul>
            {areas.map((area) => (
              <li key={area.id}>
                <input
                  type="text"
                  value={area.name}
                  onChange={(e) =>
                    setAreas(
                      areas.map((a) =>
                        a.id === area.id ? { ...a, name: e.target.value } : a
                      )
                    )
                  }
                />
                <button onClick={() => handleAreaRename(area.id, area.name)}>Rename Area</button>
                <button onClick={() => handleRemoveArea(area.id)}>Remove Area</button>
              </li>
            ))}
          </ul>
          <input
            type="text"
            value={newAreaName}
            onChange={(e) => setNewAreaName(e.target.value)}
          />
          <button onClick={handleAddArea}>Add Area</button>
        </div>
      )}

      {/* Add Site button */}
      <button onClick={handleAddSite}>Add Site</button>

      {message && <p>{message}</p>}
    </div>
  );
}

export default ControlPanel;
