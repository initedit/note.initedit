FROM node:16.13 as build
WORKDIR /root
COPY . .
RUN npm ci
RUN npm run build:prod
COPY .htaccess /root/dist/NoteUI/.htaccess

FROM httpd as deploy
ENV NOTE_API_BACKEND='https://api.note.initedit.com/api/'
COPY --from=build /root/dist/NoteUI/ /usr/local/apache2/htdocs/
RUN echo 'sed -i "s|replace_with_note_api_backend|$NOTE_API_BACKEND|g" /usr/local/apache2/htdocs/main.*.js' > /usr/local/apache2/htdocs/update_api.sh && \
    chmod +x /usr/local/apache2/htdocs/update_api.sh
EXPOSE 80
CMD ["/bin/bash","-c","/usr/local/apache2/htdocs/update_api.sh && /usr/local/bin/httpd-foreground"]