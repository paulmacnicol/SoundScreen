import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import './ControlPanel.css';
import DJManager from './DJManager';

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
  const [selectedDevice, setSelectedDevice] = useState(null); // Selected device for control
  const [nowPlaying, setNowPlaying] = useState(null); // Mockup Now Playing data
  const [upNext, setUpNext] = useState(null); // Mockup Up Next data
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
    
          if (isMounted) {
            // This line handles both single and multiple site cases
            const fetchedSites = Array.isArray(data.sites) ? data.sites : [data.site];
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

// Rename the selected site
const handleRenameSite = async () => {
  if (!site) {
    setMessage('Please select a site to rename.');
    return;
  }

  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`/api/sites/${site.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ name: newSiteName }),
    });

    if (response.ok) {
      const updatedSites = sites.map(s => s.id === site.id ? { ...s, name: newSiteName } : s);
      setSites(updatedSites);
      setNewSiteName('');
      setMessage('Site renamed successfully!');
    } else {
      setMessage('Failed to rename site.');
    }
  } catch (error) {
    setMessage('An error occurred while renaming the site.');
  }
};

// Rename the selected area
const handleRenameArea = async () => {
  if (!area) {
    setMessage('Please select an area to rename.');
    return;
  }

  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`/api/areas/${area.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ name: newAreaName }),
    });

    if (response.ok) {
      const updatedAreas = areas.map(a => a.id === area.id ? { ...a, name: newAreaName } : a);
      setAreas(updatedAreas);
      setNewAreaName('');
      setMessage('Area renamed successfully!');
    } else {
      setMessage('Failed to rename area.');
    }
  } catch (error) {
    setMessage('An error occurred while renaming the area.');
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

  const handleDeviceSelection = (deviceId) => {
    const selected = devices.find(device => device.id === deviceId);
    setSelectedDevice(selected);

    // For now, mock the Now Playing and Up Next data
    setNowPlaying({
      title: 'Current Track - Chill Mix',
      link: 'https://www.youtube.com/watch?v=5qap5aO4i9A' // Placeholder YouTube link for live mix
    });
    setUpNext({
      title: 'Next Track - Morning Vibes',
      link: 'https://www.youtube.com/watch?v=L_jWHffIx5E' // Another placeholder link
    });
  };

  function RegisterDevice({ areaId, onDeviceRegistered }) {
    const [code, setCode] = useState('');
    const [deviceName, setDeviceName] = useState('');
    const [isVerified, setIsVerified] = useState(false);
  
    const handleSubmitCode = async (e) => {
      e.preventDefault();
      const response = await fetch('/api/verify-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, areaId }),
      });
      const result = await response.json();
      if (result.success) {
        setIsVerified(true);
      } else {
        alert(result.message || 'Failed to verify device.');
      }
    };
  
    const handleSubmitName = async (e) => {
      e.preventDefault();
      const token = localStorage.getItem('token');
      const response = await fetch('/api/update-device-name', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ code, deviceName, areaId: areaId }),
      });
      const result = await response.json();
      if (result.success) {
        alert('Device registered successfully!');
        setCode('');
        setDeviceName('');
        setIsVerified(false);
        onDeviceRegistered(); // Refresh device list
      } else {
        alert(result.message || 'Failed to update device name.');
      }
    };
    
  
    if (!isVerified) {
      return (
        <form onSubmit={handleSubmitCode}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter 6-digit code"
            required
          />
          <button type="submit">Verify Device</button>
        </form>
      );
    } else {
      return (
        <form onSubmit={handleSubmitName}>
          <input
            type="text"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="Enter Device Name"
            required
          />
          <button type="submit">Save Device Name</button>
        </form>
      );
    }
  }
  


  // Refresh devices function
  const refreshDevices = () => {
    if (area) {
      fetchDevices(area.id);
    }
  };

  // RegisterDevice Component
  function RegisterDevice({ areaId, onDeviceRegistered }) {
    const [code, setCode] = useState('');
    const [deviceName, setDeviceName] = useState('');
    const [isVerified, setIsVerified] = useState(false);
  
    const handleSubmitCode = async (e) => {
      e.preventDefault();
      const response = await fetch('/api/verify-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, areaId }),
      });
      const result = await response.json();
      if (result.success) {
        setIsVerified(true);
      } else {
        alert(result.message || 'Failed to verify device.');
      }
    };
  
    const handleSubmitName = async (e) => {
      e.preventDefault();
      const token = localStorage.getItem('token');
      const response = await fetch('/api/update-device-name', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ code, deviceName, areaId: areaId }),
      });
      const result = await response.json();
      if (result.success) {
        alert('Device registered successfully!');
        setCode('');
        setDeviceName('');
        setIsVerified(false);
        onDeviceRegistered(); // Refresh device list
      } else {
        alert(result.message || 'Failed to update device name.');
      }
    };
  
    if (!isVerified) {
      return (
        <form onSubmit={handleSubmitCode}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter 6-digit code"
            required
          />
          <button type="submit">Verify Device</button>
        </form>
      );
    } else {
      return (
        <form onSubmit={handleSubmitName}>
          <input
            type="text"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="Enter Device Name"
            required
          />
          <button type="submit">Save Device Name</button>
        </form>
      );
    }
  }

  // DeviceList Component with Actions
  function DeviceList({ areaId }) {
    const [devices, setDevices] = useState([]);
  
    useEffect(() => {
      let isMounted = true;
  
      if (areaId) {
        // Fetch device list from backend
        const token = localStorage.getItem('token');
        fetch(`/api/areas/${areaId}/devices`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
          .then((response) => response.json())
          .then((data) => {
            if (isMounted) {
              setDevices(data.devices || []);
            }
          })
          .catch((error) => {
            if (isMounted) {
              console.error('Error fetching devices:', error);
            }
          });
      }
  
      return () => {
        isMounted = false;
      };
    }, [areaId]);
  
    const handleForgetDevice = (deviceId) => {
      const token = localStorage.getItem('token');
      fetch('/api/forget-device', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ deviceId }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            setDevices(devices.filter((device) => device.id !== deviceId));
          } else {
            alert(data.message || 'Failed to forget device.');
          }
        })
        .catch((error) => {
          console.error('Error forgetting device:', error);
        });
    };
  
    const handlePlayVideo = (deviceId) => {
      const token = localStorage.getItem('token');
      fetch('/api/send-command', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ deviceId, command: 'playVideo' }),
      });
    };
  
    return (
      <ul>
        {devices.map((device) => (
          <li key={device.id}>
            {device.name} - {device.status || 'Unknown'}
            <button onClick={() => handlePlayVideo(device.id)}>Play Video</button>
            <button onClick={() => handleForgetDevice(device.id)}>Forget Device</button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="control-panel">
      <h1>Manager's Control Panel</h1>

      <div className="selectors">
        <h3>Selected Site</h3>
        <div className="device-selection">
          <select value={site?.id || ''} onChange={(e) => handleSiteChange(parseInt(e.target.value))}>
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
          <button onClick={handleRenameSite}>Rename Site</button>
        </div>

        <h3>Selected Area</h3>
        <div className="device-selection">
          <select value={area?.id || ''} onChange={(e) => {
            const selectedArea = areas.find(a => a.id === parseInt(e.target.value));
            setArea(selectedArea);
            if (selectedArea) {
              fetchDevices(selectedArea.id);
            }
          }}>
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
          <button onClick={handleRenameArea}>Rename Area</button>
        </div>
      </div>

      {/* Register Device Component */}
      <div className="register-device">
        <h3>Register a New Device</h3>
        <RegisterDevice areaId={area?.id} onDeviceRegistered={refreshDevices} />
      </div>

      {/* Device List Component */}
      <div className="device-list">
        <h3>Devices in Selected Area</h3>
        <DeviceList areaId={area?.id} />
      </div>

      {selectedDevice && (
        <div className="media-control">
          <h3>Now Playing on {selectedDevice.name}</h3>
          {nowPlaying ? (
            <div className="now-playing">
              <a href={nowPlaying.link} target="_blank" rel="noopener noreferrer">{nowPlaying.title}</a>
            </div>
          ) : (
            <p>No media currently playing</p>
          )}

          <h4>Up Next</h4>
          {upNext ? (
            <div className="up-next">
              <a href={upNext.link} target="_blank" rel="noopener noreferrer">{upNext.title}</a>
            </div>
          ) : (
            <p>No media in the queue</p>
          )}

          {/* Mockup Drag-and-Drop Playlist */}
          <div className="playlist-drag-drop">
            <h4>Drag Media to Playlist</h4>
            <div className="playlist">
              <p>Drag YouTube links here...</p>
            </div>
          </div>
        </div>
      )}

      {message && <p className="message">{message}</p>}
    </div>
  );
}

export default ControlPanel;