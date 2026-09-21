# Build
FROM node:16-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .
ARG REACT_APP_*=""
ENV GENERATE_SOURCEMAP=false
RUN npm run build

# Serve
FROM node:20-alpine
WORKDIR /app
RUN npm i -g serve
COPY --from=build /app/build ./build
ENV PORT=3000
EXPOSE 3000
CMD ["sh", "-c", "serve -s build -l $PORT"]
