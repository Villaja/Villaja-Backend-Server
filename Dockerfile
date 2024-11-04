# Use Node.js official image as base
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source code
COPY . .

# Create config directory and ensure it exists
RUN mkdir -p config

# Create a volume for config directory
VOLUME /usr/src/app/config

# Expose the port the app runs on
EXPOSE 8000

# Command to run the application
CMD ["npm", "start"]
