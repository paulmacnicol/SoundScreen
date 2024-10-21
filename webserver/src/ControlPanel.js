import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';

function ControlPanel() {
  const [site, setSite] = useState(null);  // Current selected site
  const [sites, setSites] = useState([]);  // All sites for the user
  const [area, setArea] = useState(null);  // Current selected area
  const [areas, setAreas] = useState([]);  // All areas for the current site
  const [devices, setDevices] = useState([]);  // Devices in the selected area
  const [newSiteName, setNewSiteName] = useState('');
  const [newAreaName, setNewAreaName] = useState('');
  const [newDeviceName, setNewDeviceName] = useState('');
  const [message, setMessage] = useState('');
  const history = useHistory();

  // Fetch sites and set default site and area on component mount
  useEffect(() => {
    let isMounted = true;  // Flag to check if the component is still mounted

    const fetchSitesAndAreas = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch('/api/sites', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();

          // Ensure the sites property exists in the response
          if (isMounted) {
            const fetchedSites = data.site ? [data.site] : [];  // Use empty array if sites is undefined
            setSites(fetchedSites);

            // Automatically select the first site if available
            if (fetchedSites.length > 0) {
              const firstSite = fetchedSites[0];
              setSite(firstSite);

              // Fetch areas for the first site
              const areasResponse = await fetch(`/api/sites/${firstSite.id}/areas`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (areasResponse.ok) {
                const areasData = await areasResponse.json();
                setAreas(areasData.areas || []);

                // Automatically select the first area if available
                if (areasData.areas && areasData.areas.length > 0) {
                  setArea(areasData.areas[0]);
                  fetchDevices(areasData.areas[0].id);
                }
              }
            } else {
              setMessage('No sites found.');
            }
          }
        } else {
          setMessage('Failed to load sites.');
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching sites:', error);
          setMessage('An error occurred while fetching sites.');
        }
      }
    };

    fetchSitesAndAreas();

    return () => {
      isMounted = false;  // Cleanup function to avoid memory leaks
    };
  }, []);

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
        // Handle case when there are no devices for the selected area
        setDevices(data.devices || []);
        if (data.devices.length === 0) {
          setMessage('No devices available for this area.');
        }
      } else {
        setMessage('Failed to load devices.');
      }
    } catch (error) {
      setMessage('An error occurred while fetching devices.');
    }
  };
  
  // Add a new site
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

// Add a new area and automatically select it
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
      const newArea = { id: data.areaId, name: newAreaName || `Area ${data.areaId}` };
      setAreas([...areas, newArea]);
      setNewAreaName('');

      // Automatically select the new area
      setArea(newArea);
      fetchDevices(newArea.id);
    } else {
      setMessage('Failed to add area.');
    }
  } catch (error) {
    setMessage('An error occurred while adding an area.');
  }
};

// When a site is selected, automatically select the first area
const handleSiteChange = async (siteId) => {
  const updatedSite = sites.find(s => s.id === siteId);
  setSite(updatedSite);

  if (updatedSite) {
    setAreas([]); // Clear previous areas
    setArea(null); // Clear area selection

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/sites/${siteId}/areas`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAreas(data.areas || []);

        // Automatically select the first area if available
        if (data.areas && data.areas.length > 0) {
          const firstArea = data.areas[0];
          setArea(firstArea);
          fetchDevices(firstArea.id);  // Automatically fetch devices for the first area
        }
      } else {
        setMessage('Failed to fetch areas.');
      }
    } catch (error) {
      console.error('Error fetching areas:', error);
    }
  } else {
    setAreas([]);
    setDevices([]);
  }
};
 
  
  // Add a new device
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
        onChange={(e) => handleSiteChange(parseInt(e.target.value))}
      >
        <option value="" disabled>Select a site</option>
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
