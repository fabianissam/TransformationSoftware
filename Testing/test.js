"use strict";

const express = require("express");
const OtG = require("openapi-to-graphql");
const cookieParser = require("cookie-parser");
const oas = require("../Openapi.json");

const graphql = require("graphql");

async function startServer() {
  const { schema } = await OtG.createGraphQLSchema(oas, {
    operationIdFieldNames: true,
    genericPayloadArgName: true,
    createSubscriptionsFromCallbacks: true,
  });
  console.log(graphql.printSchema(schema));
}

startServer();
