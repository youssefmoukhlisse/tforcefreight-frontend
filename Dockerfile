FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html app.css shell.css information.css operations.css app.js information.js operations.js /usr/share/nginx/html/
COPY regional-parity.css regional-parity.js resource-parity.css resource-parity.js /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
