# Step 1: Build the application
FROM node:21 AS build-stage

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the application
RUN npm run build

# Step 2: Serve the application
FROM nginx:stable-alpine AS production-stage

# Copy the built files from the build stage
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy the default nginx configuration provided by nginx
#COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Add ENV meta Tag for nginx's SSI
RUN sed -i '/<head>/a <meta name="app_url" content="<!--# echo var=\"nginx_ssi_url\" -->">' /usr/share/nginx/html/index.html
RUN sed -i '/<head>/a <meta name="app_env" content="<!--# echo var=\"nginx_ssi_env\" -->">' /usr/share/nginx/html/index.html

# Expose port 80
EXPOSE 80

# Start nginx server
CMD ["nginx", "-g", "daemon off;"]
