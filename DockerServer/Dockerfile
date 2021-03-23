FROM node:latest

WORKDIR /app/server

COPY ./GraphQLApi /app/server/GraphQLApi

COPY ./Openapi.json /app

COPY package*.json ./

RUN npm install

CMD [ "node", "transformation.js" ]

EXPOSE 3001