FROM node:24-alpine

WORKDIR /app

# Install dependencies first for efficient caching
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source code
COPY . .

EXPOSE 8082

CMD ["npm", "start"]
