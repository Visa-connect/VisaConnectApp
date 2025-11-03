FROM node:20-alpine

WORKDIR /app

# Copy root package.json and yarn.lock
COPY package.json yarn.lock ./

# Copy server package.json and yarn.lock
COPY server/package.json server/yarn.lock ./server/

# Install dependencies for both frontend and backend
RUN yarn install --frozen-lockfile
RUN cd server && yarn install --frozen-lockfile --production

# Copy source code
COPY . .

# Build frontend
ARG CACHEBUST=1
RUN echo "Cache bust: $CACHEBUST"
RUN yarn build

# Build backend TypeScript
RUN cd server && yarn build

EXPOSE $PORT

# Start the server (which serves both frontend and backend)
CMD ["sh", "-c", "cd server && yarn start"]