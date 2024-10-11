import React, { useState } from 'react';

function Settings({ siteId }) {
  const [jsonData, setJsonData] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      try {
        const json = JSON.parse(content);
        setJsonData(json);
      } catch (error) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/sites/${siteId}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(jsonData),
    });

    if (response.ok) {
      alert('Settings updated successfully');
    } else {
      alert('Failed to update settings');
    }
  };

  return (
    <div>
      <h1>Site Settings</h1>
      <input type="file" accept="application/json" onChange={handleFileUpload} />
      <button onClick={handleSubmit}>Upload JSON</button>
      <button onClick={() => setJsonData(null)}>Cancel</button>
    </div>
  );
}

export default Settings;
