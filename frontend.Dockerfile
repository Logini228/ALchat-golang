FROM nginx:1.25-alpine

WORKDIR /usr/share/nginx/html

# Clean default Nginx static files
RUN rm -rf ./*

# Copy the custom nginx config file from your host machine
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy your frontend assets directly into Nginx public directory
COPY index.html style.css ./
COPY jscode/ ./jscode/

EXPOSE 3000

# Nginx alpine image has default CMD to start daemon, 
# but explicitly declaring it ensures stability.
CMD ["nginx", "-g", "daemon off;"]