require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
app.use(cors());
app.use(express.json());

const port = 5000;

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

// Signup endpoint
app.post('/api/signup', async (req, res) => {
  const { organization_name, email, password } = req.body;
  if (!organization_name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO users (organization_name, email, password_hash) VALUES (?, ?, ?)';
    const [userResults] = await db.promise().execute(query, [organization_name, email, hashedPassword]);
    const userId = userResults.insertId;

    const insertSiteQuery = 'INSERT INTO sites (user_id, name) VALUES (?, ?)';
    const [siteResults] = await db.promise().execute(insertSiteQuery, [userId, 'Main Site']);
    const siteId = siteResults.insertId;

    const insertAreaQuery = 'INSERT INTO areas (site_id, name) VALUES (?, ?)';
    await db.promise().execute(insertAreaQuery, [siteId, 'Main Area']);

    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
    return res.status(201).json({ message: 'User created', token });

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

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
    return res.status(200).json({ message: 'Login successful', token });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error', error });
  }
});

// Fetch the current site and areas
app.get('/api/sites', authenticateJWT, (req, res) => {
  const userId = req.user.userId;
  const siteQuery = 'SELECT * FROM sites WHERE user_id = ?';
  db.execute(siteQuery, [userId], (err, sites) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    if (sites.length === 0) return res.status(404).json({ message: 'No sites found for user' });

    const siteId = sites[0].id;
    const areaQuery = 'SELECT * FROM areas WHERE site_id = ?';
    db.execute(areaQuery, [siteId], (err, areas) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err });
      res.status(200).json({ site: sites[0], areas });
    });
  });
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

// Rename an area
app.put('/api/areas/:areaId', authenticateJWT, (req, res) => {
  const { areaId } = req.params;
  const { name } = req.body;
  const query = 'UPDATE areas SET name = ? WHERE id = ?';
  db.execute(query, [name, areaId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    res.status(200).json({ message: 'Area renamed successfully' });
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

// Add a new site - Removed subscription checks
app.post('/api/sites', authenticateJWT, (req, res) => {
  const userId = req.user.userId;
  const { name } = req.body;

  const insertQuery = 'INSERT INTO sites (user_id, name) VALUES (?, ?)';
  db.execute(insertQuery, [userId, name], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    res.status(201).json({ message: 'Site created successfully', siteId: results.insertId });
  });
});

// Add a new area
app.post('/api/areas', authenticateJWT, (req, res) => {
  const { siteId, name } = req.body;
  const insertAreaQuery = 'INSERT INTO areas (site_id, name) VALUES (?, ?)';
  db.execute(insertAreaQuery, [siteId, name], (err, results) => {
    if (err) return res.status(500).json({ message: 'Failed to add area', error: err });
    res.status(201).json({ message: 'Area added successfully!', areaId: results.insertId });
  });

});// Add a new device
app.post('/api/devices', authenticateJWT, (req, res) => {
  const { areaId, name } = req.body;
  const insertDeviceQuery = 'INSERT INTO devices (area_id, name) VALUES (?, ?)';
  db.execute(insertDeviceQuery, [areaId, name], (err, results) => {
    if (err) return res.status(500).json({ message: 'Failed to add device', error: err });
    res.status(201).json({ message: 'Device added successfully!', deviceId: results.insertId });
  });
});

// Fetch devices for a specific area
app.get('/api/areas/:areaId/devices', authenticateJWT, (req, res) => {
  const { areaId } = req.params;
  const deviceQuery = 'SELECT * FROM devices WHERE area_id = ?';
  db.execute(deviceQuery, [areaId], (err, devices) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    res.status(200).json({ devices });
  });
});

// Update site settings with JSON data
app.put('/api/sites/:siteId/settings', authenticateJWT, (req, res) => {
  const { siteId } = req.params;
  const settings = req.body;
  const query = 'UPDATE sites SET settings = ? WHERE id = ?';
  db.execute(query, [JSON.stringify(settings), siteId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    res.status(200).json({ message: 'Settings updated successfully' });
  });
});

app.get('/api/sites/:siteId/areas', authenticateJWT, async (req, res) => {
  const { siteId } = req.params;

  try {
    const [areaResults] = await db.promise().execute('SELECT * FROM areas WHERE site_id = ?', [siteId]);

    if (areaResults.length === 0) {
      return res.status(404).json({ message: 'No areas found for this site.' });
    }

    res.status(200).json({ areas: areaResults });
  } catch (error) {
    console.error('Error fetching areas:', error);
    return res.status(500).json({ message: 'Server error', error });
  }
});

// Function to determine site limits based on subscription type
const getSiteLimit = (subscriptionType) => {
  switch (subscriptionType) {
    case 'Free':
      return 1;
    case 'Single Site':
      return 1;
    case 'Multi Site':
      return 5;
    case 'Enterprise':
      return Infinity;
    default:
      return 1;
  }
};

// Start the server
app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
