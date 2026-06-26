# Use the official Node.js 22 alpine image for a small container footprint
FROM node:22-alpine

# Set the working directory
WORKDIR /app

# Copy package.json first to leverage Docker layer caching (avoiding package-lock.json to bypass npm native binding bugs)
COPY package.json ./

# Install all dependencies (including devDependencies needed for building & tsx)
RUN npm install

# Copy the rest of the application files
COPY . .

# Set environment to production for client build
ENV NODE_ENV=production

# Build the React/Vite frontend into the static /dist directory
RUN npm run build

# Expose port 3000 (metadata for documentation, Cloud Run routes dynamically)
EXPOSE 3000

# Start the full-stack server using tsx
CMD ["npx", "tsx", "server.ts"]
