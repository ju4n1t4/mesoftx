# ---- Stage 1: Build ----
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build -- --configuration production

# ---- Stage 2: Serve (nginx) ----
FROM nginx:alpine

COPY --from=build /app/dist/mesoftx-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
