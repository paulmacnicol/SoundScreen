import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';

function ControlPanel() {
  const [site, setSite] = useState(null);
  const [sites, setSites] = useState([]);
  const [area, setArea] = useState(null);
  const [areas, setAreas] = useState([]);
  const [devices, setDevices] = useState([]);
  const [newSiteName, setNewSiteName] = useState('');
  const [newAreaName, setNewAreaName] = useState('');
  const [newDeviceName, setNewDeviceName] = useState('');
  const [message, setMessage] = useState('');
  const history = useHistory();

  useEffect(() => {
    if (site) {  // Change from `selectedSite` to `site`
      const fetchAreas = async () => {
        const token = localStorage.getItem('token');
        try {
          const response = await fetch(`/api/sites/${site.id}/areas`, {  // Also change `selectedSite` to `site` here
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
  
          if (response.ok) {
            const data = await response.json();
            setAreas(data.areas || []); // Update the areas state based on the selected site
          } else {
            console.error('Failed to fetch areas.');
            setAreas([]); // Clear the areas if there is an error to avoid inconsistent state
          }
        } catch (error) {
          console.error('An error occurred while fetching areas:', error);
          setAreas([]); // Reset the state to ensure consistent UI behavior
        }
      };
  
      fetchAreas();
    }
  }, [site]); 

  const fetchDevices = async (areaId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/areas/${areaId}/devices`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDevices(data.devices);
      } else {
        setMessage('Failed to load devices.');
      }
    } catch (error) {
      setMessage('An error occurred while fetching devices.');
    }
  };

  const handleAddSite = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newSiteName || 'New Site' }),
      });

      if (response.ok) {
        const data = await response.json();
        const newSite = { id: data.siteId, name: newSiteName || 'New Site' };
        setSites([...sites, newSite]);
        setNewSiteName('');
        setMessage('Site added successfully!');
      } else {
        setMessage('Failed to add site.');
      }
    } catch (error) {
      setMessage('An error occurred while adding a site.');
    }
  };

const handleAddArea = async () => {
  const token = localStorage.getItem('token');
  if (!site) {
    setMessage('Please select a site before adding an area.');
    return;
  }

  try {
    const response = await fetch(`/api/areas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ siteId: site.id, name: newAreaName }),
    });

    if (response.ok) {
      const data = await response.json();
      setAreas(prevAreas => [...prevAreas, { id: data.areaId, name: newAreaName }]);
      setNewAreaName('');
    } else {
      console.error('Failed to add area.');
    }
  } catch (error) {
    console.error('An error occurred while adding area:', error);
  }
};

  
  const handleAddDevice = async () => {
    if (!area) {
      setMessage('Please select an area before adding a device.');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ areaId: area.id, name: newDeviceName || 'New Device' }),
      });

      if (response.ok) {
        const data = await response.json();
        const newDevice = { id: data.deviceId, name: newDeviceName || 'New Device' };
        setDevices([...devices, newDevice]);
        setNewDeviceName('');
        setMessage('Device added successfully!');
      } else {
        setMessage('Failed to add device.');
      }
    } catch (error) {
      setMessage('An error occurred while adding a device.');
    }
  };

  return (
    <div>
      <h1>Manager's Control Panel</h1>
      <h3>Selected Site</h3>
      <select
        value={site?.id || ''}
        onChange={(e) => {
          const updatedSite = sites.find(s => s.id === parseInt(e.target.value));
          setSite(updatedSite);
          if (updatedSite) {
            setAreas([]); // Clear previous areas
            setArea(null); // Clear area selection
            // Fetch areas associated with the new site
            const fetchAreas = async () => {
              const token = localStorage.getItem('token');
              try {
                const response = await fetch(`/api/sites/${updatedSite.id}/areas`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                  },
                });
                if (response.ok) {
                  const data = await response.json();
                  setAreas(data.areas || []);
                } else {
                  console.error('Failed to fetch areas.');
                }
              } catch (error) {
                console.error('Error fetching areas:', error);
              }
            };
            fetchAreas();
          } else {
            setAreas([]);
            setDevices([]);
          }
        }}
        
      >
        {sites.map((site) => (
          <option key={site.id} value={site.id}>{site.name}</option>
        ))}
      </select>

      <input
        type="text"
        value={newSiteName}
        onChange={(e) => setNewSiteName(e.target.value)}
        placeholder="New Site Name"
      />
      <button onClick={handleAddSite}>Add Site</button>

      <h3>Selected Area</h3>
      <select
        value={area?.id || ''}
        onChange={(e) => {
          const selectedArea = areas.find(a => a.id === parseInt(e.target.value));
          setArea(selectedArea);
          if (selectedArea) {
            fetchDevices(selectedArea.id);
          }
        }}
      >
        <option value="" disabled>Select an area</option>
        {areas.map((area) => (
          <option key={area.id} value={area.id}>{area.name}</option>
        ))}
      </select>
      <input
        type="text"
        value={newAreaName}
        onChange={(e) => setNewAreaName(e.target.value)}
        placeholder="New Area Name"
      />
      <button onClick={handleAddArea}>Add Area</button>

      <h3>Devices in Selected Area</h3>
      {devices.length > 0 ? (
        <ul>
          {devices.map((device) => (
            <li key={device.id}>{device.name}</li>
          ))}
        </ul>
      ) : (
        <p>No devices available. Add a device below.</p>
      )}
      <input
        type="text"
        value={newDeviceName}
        onChange={(e) => setNewDeviceName(e.target.value)}
        placeholder="New Device Name"
      />
      <button onClick={handleAddDevice}>Add Device</button>

      {message && <p>{message}</p>}
    </div>
  );
}

export default ControlPanel;
