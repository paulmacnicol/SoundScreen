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

// Fetch the current site and areas for the authenticated user
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


// Start the server
app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
