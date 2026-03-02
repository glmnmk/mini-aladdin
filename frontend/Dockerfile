FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy application source
COPY . .

# Expose port (Vite default is 5173)
EXPOSE 5173

# Start development server
CMD ["npm", "run", "dev"]
