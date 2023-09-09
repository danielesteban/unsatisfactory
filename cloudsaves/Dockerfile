FROM node:hydrogen

# Create working directory
RUN mkdir -p /usr/src/server
WORKDIR /usr/src/server

# Install dependencies
ENV NODE_ENV=production
RUN curl -f https://get.pnpm.io/v6.16.js | node - add --global pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# Copy source
COPY dist dist

# De-escalate privileges
USER node

# Start server
ENV PORT 80
EXPOSE 80
CMD ["node", "dist/main.js"]
