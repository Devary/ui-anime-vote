FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN mkdir -p /usr/share/nginx/html/ui-anime-vote
COPY dist/ui-anime-vote/browser/ /usr/share/nginx/html/ui-anime-vote/

EXPOSE 8080
