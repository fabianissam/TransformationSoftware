"use strict";

const express = require("express");
const { graphqlHTTP } = require("express-graphql");
const OtG = require("openapi-to-graphql");
const context = require("./context");
const oas = require("../../Openapi.json");
const util = require("util");

async function startServer() {
  // use OpenAPI-to-GraphQL to create a GraphQL schema:
  const { schema } = await OtG.createGraphQLSchema(oas, {
    operationIdFieldNames: true,
    genericPayloadArgName: true, // änderung
    customResolvers: {
      "simple FHAachen API": {
        "/person": {
          get: (obj, args, context, info) => {
            //console.log(info);
            //console.log(obj._openAPIToGraphQL.security.basicAuth);
            console.log(obj._openAPIToGraphQL.security.basicAuth);
            var myResultsPromise = new Promise((resolve, reject) => {
              context.getAllPerson((results) => {
                resolve(results);
              });
            });
            myResultsPromise.then((res) => {
              return res;
            });
            return myResultsPromise;
          },
          post: (obj, args, context, info) => {
            context.insertPerson(args.requestBody);
            return args.requestBody;
          },
          put: (obj, args, context, info) => {
            context.updatePerson(args.requestBody);
            return args.requestBody;
          },
        },
        "/person/{id}/": {
          get: (obj, args, context, info) => {
            var myResultsPromise = new Promise((resolve, reject) => {
              context.getPerson(args.id, (results) => {
                resolve(results);
              });
            });
            myResultsPromise.then((res) => {
              return res;
            });
            return myResultsPromise;
          },
          delete: (obj, args, context, info) => {
            context.deletePerson(args.id);
            return "hat geklappt";
          },
        },
        "/person/{userid}/adress": {
          get: (obj, args, context, info) => {
            return { street: "Erfttalweg 20", zipCode: "50169" };
          },
        },
      },
    },
  });

  //console.log(printSchema(schema));

  // setup Express.js app and serve the schema:
  const app = express();

  var ctx = new context();

  app.use(
    "/graphql",
    graphqlHTTP({
      schema: schema,
      context: ctx,
      graphiql: true,
    })
  );

  app.listen(3001);
}

// Kick things off:
startServer();
