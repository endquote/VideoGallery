FROM node:8-alpine

RUN set -xe
RUN apk add --no-cache ca-certificates ffmpeg openssl python3 imagemagick
RUN pip3 install youtube-dl

WORKDIR /rgbtv
ADD . /rgbtv
RUN npm install

EXPOSE 8080

CMD npm --prefix ./server start
