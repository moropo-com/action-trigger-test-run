FROM node:14
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# GitHub sets up a workspace at /github/workspace
WORKDIR /github/workspace

COPY message.md .

# Entrypoint is the command that starts your action
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
