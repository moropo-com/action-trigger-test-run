# Use the official lightweight Node.js 14 image.
FROM node:14-slim

# Set the working directory as /github/workspace
WORKDIR /github/workspace

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install production dependencies.
RUN npm install --only=production

# Copy local code to the container image.
COPY . .

# Make your script executable
RUN chmod +x /github/workspace/index.js

# Run the web service on container startup.
CMD [ "node", "/github/workspace/index.js" ]
