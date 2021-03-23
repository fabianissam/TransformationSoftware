FROM node:latest

WORKDIR /app/proxy

COPY ./Proxy /app/proxy

COPY ./Openapi.json /app

COPY package*.json ./

RUN npm install

CMD [ "node", "proxy.js" ]

EXPOSE 3000