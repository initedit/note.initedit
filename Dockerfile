FROM node:alpine3.13 as build
WORKDIR /root
COPY . .
RUN npm ci
RUN npm run build:prod
RUN echo "" > /root/dist/NoteUI/.htaccess

FROM httpd as deploy
COPY --from=build /root/dist/NoteUI/ /usr/local/apache2/htdocs/
EXPOSE 80
