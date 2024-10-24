// Load environment variables from .env file
require('dotenv').config();

// Import necessary modules
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');
const mysql = require('mysql2');
const WebSocket = require('ws');
const path = require('path');

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Set the port for the server
const port = 5000;

// Create a WebSocket server instance, not attached to any server yet
const wss = new WebSocket.Server({ noServer: true });

// In-memory storage for devices
const devices = {};     // Stores devices by code
const devicesById = {}; // Stores devices by deviceId

// Start the HTTP server and capture the server instance
const server = app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});

// Handle WebSocket upgrades
server.on('upgrade', (request, socket, head) => {
  // Implement authentication if needed
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// MySQL database connection
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Middleware to protect routes
const authenticateJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(403).json({ message: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Unauthorized' });
    req.user = user;
    next();
  });
};

// Generate unique 6-digit code for onboarding devices
function generateUniqueCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Handle WebSocket connections
wss.on('connection', (ws) => {
  let code = generateUniqueCode();
  const expirationTime = 2 * 60 * 1000; // 2 minutes
  let expiration = Date.now() + expirationTime;

  // Store the device with its code and expiration time
  devices[code] = { ws, expiration, authenticated: false };

  // Send the initial code to the device
  ws.send(JSON.stringify({ action: 'displayCode', code }));

  let intervalId;

  // Define the code refresh function
  function startCodeRefresh() {
    intervalId = setInterval(() => {
      const newCode = generateUniqueCode();
      expiration = Date.now() + expirationTime;
      devices[newCode] = devices[code];
      delete devices[code];
      code = newCode;
      devices[code].expiration = expiration;
      ws.send(JSON.stringify({ action: 'displayCode', code: newCode }));
    }, expirationTime);
  }

  // Assign startCodeRefresh to the device object
  devices[code].startCodeRefresh = startCodeRefresh;

  // Handle incoming messages from the device
  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.action === 'deviceInfo') {
      devices[code].deviceInfo = data;
    } else if (data.action === 'reconnect' && data.deviceId) {
      const deviceId = data.deviceId;
      // Update devicesById with new ws connection
      devicesById[deviceId] = { ws, authenticated: true };
      console.log(`Device ${deviceId} reconnected`);
    }
  });

  // Handle WebSocket close event
  ws.on('close', () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
    if (!devices[code].authenticated) {
      delete devices[code];
    }
  });
});

// Endpoint to verify device registration
app.post('/api/verify-device', (req, res) => {
  const { code, areaId } = req.body;
  const device = devices[code];

  if (device && device.expiration > Date.now()) {
    // Mark the device as authenticated
    devices[code].authenticated = true;

    // Notify the device that it has been authenticated and request device name
    device.ws.send(JSON.stringify({ action: 'authenticated' }));

    // Start code refresh after authentication
    if (typeof device.startCodeRefresh === 'function') {
      device.startCodeRefresh();
    }

    res.json({ success: true });
  } else {
    res.status(400).json({ success: false, message: 'Invalid or expired code' });
  }
});

// Function to save device information into MariaDB
function saveDeviceInfo(code, device, areaId, deviceName) {
  const deviceInfo = device.deviceInfo || {};
  const userAgent = deviceInfo.userAgent || 'Unknown';
  const deviceType = userAgent;
  const screenWidth = deviceInfo.screenResolution?.width || null;
  const screenHeight = deviceInfo.screenResolution?.height || null;

  const insertDeviceQuery = 'INSERT INTO devices (area_id, name, type, screen_width, screen_height, user_agent, code) VALUES (?, ?, ?, ?, ?, ?, ?)';
  db.execute(insertDeviceQuery, [areaId, deviceName, deviceType, screenWidth, screenHeight, userAgent, code], (err, results) => {
    if (err) {
      console.error('Error saving device info:', err);
    } else {
      const deviceId = results.insertId;
      device.deviceId = deviceId;

      // Map deviceId to the device object
      devicesById[deviceId] = device;

      // Send deviceId back to the device for reconnection purposes
      device.ws.send(JSON.stringify({ action: 'deviceRegistered', deviceId }));

      console.log('Device registered with ID:', deviceId);
    }
  });
}


// Function to retrieve device by ID from in-memory storage
function getDeviceById(deviceId) {
  return devicesById[deviceId];
}

// Endpoint to handle commands from the control panel
app.post('/api/send-command', authenticateJWT, (req, res) => {
  const { deviceId, command } = req.body;
  const device = getDeviceById(deviceId);

  if (device && device.ws && device.authenticated) {
    device.ws.send(JSON.stringify({ action: command, videoUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' }));
    res.json({ success: true });
  } else {
    console.error('Device not connected or not authenticated:', deviceId);
    res.status(400).json({ success: false, message: 'Device not connected or not authenticated' });
  }
});

// Serve the register.html page for device onboarding
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Serve the device.html page for authenticated devices
app.get('/device', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'device.html'));
});

// Signup endpoint
app.post('/api/signup', async (req, res) => {
  const { organization_name, email, password } = req.body;
  if (!organization_name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO users (organization_name, email, password_hash, subscription_type) VALUES (?, ?, ?, ?)';
    const [userResults] = await db.promise().execute(query, [organization_name, email, hashedPassword, 'free']);
    const userId = userResults.insertId;

    const insertSiteQuery = 'INSERT INTO sites (user_id, name) VALUES (?, ?)';
    const [siteResults] = await db.promise().execute(insertSiteQuery, [userId, 'Main Site']);
    const siteId = siteResults.insertId;

    const insertAreaQuery = 'INSERT INTO areas (site_id, name) VALUES (?, ?)';
    await db.promise().execute(insertAreaQuery, [siteId, 'Main Area']);

    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
    return res.status(201).json({ message: 'User created successfully, please login' });

  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ message: 'Server error', error });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'All fields are required' });

  try {
    const [userResults] = await db.promise().execute('SELECT * FROM users WHERE email = ?', [email]);
    if (userResults.length === 0) return res.status(400).json({ message: 'Invalid credentials' });

    const user = userResults[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(400).json({ message: 'Invalid credentials' });

    // Fetch the user's main site and area
    const [siteResults] = await db.promise().execute('SELECT * FROM sites WHERE user_id = ?', [user.id]);
    const [areaResults] = await db.promise().execute('SELECT * FROM areas WHERE site_id = ?', [siteResults[0].id]);

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });

    // Return token and user's default site and area
    return res.status(200).json({
      message: 'Login successful',
      token,
      site: siteResults[0],
      area: areaResults[0],
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error', error });
  }
});

// Fetch all sites and areas for the authenticated user
app.get('/api/sites', authenticateJWT, (req, res) => {
  const userId = req.user.userId;

  // Fetch all sites for the user
  const siteQuery = 'SELECT * FROM sites WHERE user_id = ?';
  db.execute(siteQuery, [userId], (err, sites) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    if (sites.length === 0) return res.status(404).json({ message: 'No sites found for user' });

    // Get the list of site IDs
    const siteIds = sites.map(site => site.id);

    // Dynamically generate placeholders for the site IDs
    const placeholders = siteIds.map(() => '?').join(',');

    const areaQuery = `SELECT * FROM areas WHERE site_id IN (${placeholders})`;
    
    // Execute the query with the siteIds as individual arguments
    db.execute(areaQuery, siteIds, (err, areas) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err });

      // Attach areas to the correct sites
      const sitesWithAreas = sites.map(site => ({
        ...site,
        areas: areas.filter(area => area.site_id === site.id)
      }));

      // Return all sites with their associated areas
      res.status(200).json({ sites: sitesWithAreas });
    });
  });
});



// Fetch areas for a specific site
app.get('/api/sites/:siteId/areas', authenticateJWT, (req, res) => {
  const { siteId } = req.params;
  
  const query = 'SELECT * FROM areas WHERE site_id = ?';
  db.execute(query, [siteId], (err, areas) => {
    if (err) {
      return res.status(500).json({ message: 'Database error', error: err });
    }
    
    if (areas.length === 0) {
      return res.status(404).json({ message: 'No areas found for this site' });
    }
    
    return res.status(200).json({ areas });
  });
});

// Add a new site and automatically create an "Area 1"
app.post('/api/sites', authenticateJWT, async (req, res) => {
  const userId = req.user.userId;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Site name is required' });
  }

  try {
    // Insert new site
    const insertSiteQuery = 'INSERT INTO sites (user_id, name) VALUES (?, ?)';
    const [siteResults] = await db.promise().execute(insertSiteQuery, [userId, name]);
    const siteId = siteResults.insertId;

    // Automatically create "Area 1" for the new site
    const insertAreaQuery = 'INSERT INTO areas (site_id, name) VALUES (?, ?)';
    const [areaResults] = await db.promise().execute(insertAreaQuery, [siteId, 'Area 1']);
    const areaId = areaResults.insertId;

    return res.status(201).json({ message: 'Site and Area created successfully', siteId, areaId });
  } catch (error) {
    console.error('Error creating site and area:', error);
    return res.status(500).json({ message: 'Error creating site and area', error });
  }
});


// Add a new area
app.post('/api/areas', authenticateJWT, (req, res) => {
  const { siteId, name } = req.body;
  const insertAreaQuery = 'INSERT INTO areas (site_id, name) VALUES (?, ?)';
  db.execute(insertAreaQuery, [siteId, name], (err, results) => {
    if (err) return res.status(500).json({ message: 'Failed to add area', error: err });
    res.status(201).json({ message: 'Area added successfully!', areaId: results.insertId });
  });
});
// Rename an area
app.put('/api/areas/:areaId', authenticateJWT, (req, res) => {
  const { areaId } = req.params;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Area name is required' });
  }

  const query = 'UPDATE areas SET name = ? WHERE id = ?';
  db.execute(query, [name, areaId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    if (results.affectedRows === 0) return res.status(404).json({ message: 'Area not found' });

    res.status(200).json({ message: 'Area renamed successfully' });
  });
});

// Rename a site
app.put('/api/sites/:siteId', authenticateJWT, (req, res) => {
  const { siteId } = req.params;
  const { name } = req.body;
  const query = 'UPDATE sites SET name = ? WHERE id = ?';
  db.execute(query, [name, siteId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    res.status(200).json({ message: 'Site renamed successfully' });
  });
});

// Delete an area
app.delete('/api/areas/:areaId', authenticateJWT, (req, res) => {
  const { areaId } = req.params;
  const query = 'DELETE FROM areas WHERE id = ?';
  db.execute(query, [areaId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    res.status(200).json({ message: 'Area deleted successfully' });
  });
});
// Fetch devices for a specific area
app.get('/api/areas/:areaId/devices', authenticateJWT, (req, res) => {
  const { areaId } = req.params;
  
  const query = 'SELECT * FROM devices WHERE area_id = ?';
  db.execute(query, [areaId], (err, devices) => {
    if (err) {
      return res.status(500).json({ message: 'Database error', error: err });
    }

    // Return an empty array if no devices found, instead of 404
    return res.status(200).json({ devices: devices || [] });
  });
});



// Add a new device to an area
app.post('/api/devices', authenticateJWT, (req, res) => {
  const { areaId, name } = req.body;

  if (!areaId || !name) {
    return res.status(400).json({ message: 'Area ID and device name are required' });
  }

  const insertDeviceQuery = 'INSERT INTO devices (area_id, name) VALUES (?, ?)';
  db.execute(insertDeviceQuery, [areaId, name], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to add device', error: err });
    }
    
    return res.status(201).json({ message: 'Device added successfully!', deviceId: results.insertId });
  });
});

//Implement /api/update-device-name Endpoint
app.post('/api/update-device-name', authenticateJWT, (req, res) => {
  const { code, deviceName, areaId } = req.body;
  const device = devices[code];

  if (device) {
    // Save device info with the provided name
    saveDeviceInfo(code, device, areaId, deviceName);

    // Remove the code from devices since the device is now registered
    delete devices[code];

    res.json({ success: true });
  } else {
    res.status(400).json({ success: false, message: 'Device not found' });
  }
});



//Setup the /register endpoint
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

//Add the route to serve device.html
app.get('/device', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'device.html'));
});


//Implement /api/forget-device Endpoint
app.post('/api/forget-device', authenticateJWT, (req, res) => {
  const { deviceId } = req.body;

  const deleteDeviceQuery = 'DELETE FROM devices WHERE id = ?';
  db.execute(deleteDeviceQuery, [deviceId], (err) => {
    if (err) {
      console.error('Error deleting device:', err);
      res.status(500).json({ success: false, message: 'Database error' });
    } else {
      const device = devicesById[deviceId];
      if (device && device.ws) {
        device.ws.send(JSON.stringify({ action: 'disconnect' }));
        device.ws.close();
        delete devicesById[deviceId];
      }
      res.json({ success: true });
    }
  });
});
