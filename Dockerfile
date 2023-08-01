FROM node:14
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

WORKDIR /github/workspace

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
