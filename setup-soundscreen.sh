#!/bin/bash

# Base project directory
mkdir -p ~/SoundScreen/{db,app,webserver,control,nginx}

# Create docker-compose.yml
cat <<EOL > ~/SoundScreen/docker-compose.yml
version: '3.8'
services:
  db:
    image: mariadb:latest
    container_name: soundscreen_db
    env_file:
      - ./db/db.env
    volumes:
      - ./db/data:/var/lib/mysql
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "3306:3306"
    networks:
      - soundscreen-net

  app:
    build: ./app
    container_name: soundscreen_app
    environment:
      - NODE_ENV=production
    ports:
      - "5000:5000"
    networks:
      - soundscreen-net
    depends_on:
      - db

  webserver:
    build: ./webserver
    container_name: soundscreen_web
    ports:
      - "3000:3000"
    networks:
      - soundscreen-net

  control:
    build: ./control
    container_name: soundscreen_control
    ports:
      - "4000:4000"
    networks:
      - soundscreen-net

  nginx:
    image: nginx:latest
    container_name: soundscreen_nginx
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - /etc/letsencrypt/live/soundscreen.soundcheckvn.com:/etc/letsencrypt/live/soundscreen.soundcheckvn.com:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - app
      - webserver
      - control
    networks:
      - soundscreen-net

networks:
  soundscreen-net:
    driver: bridge
EOL

# Create init.sql for database
cat <<EOL > ~/SoundScreen/db/init.sql
CREATE DATABASE IF NOT EXISTS soundscreen;

USE soundscreen;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  subscription_type ENUM('free', 'single_site', 'multi_site', 'enterprise') DEFAULT 'free',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(255),
  opening_hours VARCHAR(255),
  phone VARCHAR(20),
  website VARCHAR(255),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS areas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  site_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS devices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  area_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE CASCADE
);
EOL

# Create db.env for database credentials
cat <<EOL > ~/SoundScreen/db/db.env
MYSQL_ROOT_PASSWORD=your_root_password
MYSQL_DATABASE=soundscreen
MYSQL_USER=paul
MYSQL_PASSWORD=your_password
EOL

# Create app Dockerfile (backend)
cat <<EOL > ~/SoundScreen/app/Dockerfile
FROM node:16

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5000
CMD [ "npm", "start" ]
EOL

# Create app package.json (backend)
cat <<EOL > ~/SoundScreen/app/package.json
{
  "name": "soundscreen-backend",
  "version": "1.0.0",
  "description": "Backend for Soundscreen project",
  "main": "index.js",
  "scripts": {
    "start": "node src/index.js"
  },
  "dependencies": {
    "bcrypt": "^5.0.1",
    "cors": "^2.8.5",
    "dotenv": "^10.0.0",
    "express": "^4.17.1",
    "jsonwebtoken": "^8.5.1",
    "mysql2": "^2.2.5"
  }
}
EOL

# Create app index.js (backend)
mkdir -p ~/SoundScreen/app/src
cat <<EOL > ~/SoundScreen/app/src/index.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');
const mysql = require('mysql2');
require('dotenv').config();

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

// Signup endpoint
app.post('/api/signup', async (req, res) => {
  const { organization_name, email, password } = req.body;

  if (!organization_name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const query = 'INSERT INTO users (organization_name, email, password_hash) VALUES (?, ?, ?)';
  db.execute(query, [organization_name, email, hashedPassword], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error', error: err });
    }

    const token = jwt.sign({ userId: results.insertId }, JWT_SECRET, { expiresIn: '1h' });
    return res.status(201).json({ message: 'User created', token });
  });
});

// Login endpoint
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const query = 'SELECT * FROM users WHERE email = ?';
  db.execute(query, [email], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = results[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
    return res.status(200).json({ message: 'Login successful', token });
  });
});

// Protect routes with JWT
const authenticateJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    req.user = user;
    next();
  });
};

// Test route for authenticated users
app.get('/api/dashboard', authenticateJWT, (req, res) => {
  return res.status(200).json({ message: 'Welcome to the dashboard!', user: req.user });
});

// Start the server
app.listen(port, () => {
  console.log(\`Backend running on port \${port}\`);
});
EOL

# Create webserver Dockerfile
cat <<EOL > ~/SoundScreen/webserver/Dockerfile
FROM node:16

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000
CMD [ "npm", "start" ]
EOL

# Create webserver package.json
cat <<EOL > ~/SoundScreen/webserver/package.json
{
  "name": "soundscreen-web",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^17.0.2",
    "react-dom": "^17.0.2",
    "react-router-dom": "^5.2.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  }
}
EOL

# Create control Dockerfile
cat <<EOL > ~/SoundScreen/control/Dockerfile
FROM node:16

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 4000
CMD [ "npm", "start" ]
EOL

# Create control package.json
cat <<EOL > ~/SoundScreen/control/package.json
{
  "name": "soundscreen-control",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^17.0.2",
    "react-dom": "^17.0.2"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  }
}
EOL

# Create nginx.conf
cat <<EOL > ~/SoundScreen/nginx/nginx.conf
server {
    listen 80;
    listen 443 ssl;

    ssl_certificate /etc/letsencrypt/live/soundscreen.soundcheckvn.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/soundscreen.soundcheckvn.com/privkey.pem;

    location / {
        proxy_pass http://webserver:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    location /api/ {
        proxy_pass http://app:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    location /control/ {
        proxy_pass http://control:4000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOL

# Done
echo "Project structure and files created successfully!"
