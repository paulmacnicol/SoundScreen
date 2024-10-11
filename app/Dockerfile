# Use an official Node.js image as the base
FROM node:16

# Set the working directory inside the container
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install

# Install MariaDB client (MySQL-compatible)
RUN apt-get update && apt-get install -y mariadb-client

# Copy the rest of the app's code
COPY . .

# Expose the application's port
EXPOSE 5000

# Start the app
CMD ["npm", "start"]
