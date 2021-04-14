"use strict";

const express = require("express");
const OtG = require("openapi-to-graphql");
const cookieParser = require("cookie-parser");
const oas = require("../OpenapiTest.json");
const util = require("util");

const graphql = require("graphql");

async function startServer() {
  const { schema } = await OtG.createGraphQLSchema(oas, {
    operationIdFieldNames: true,
    genericPayloadArgName: true,
  });
  console.log(graphql.printSchema(schema));
  var y = graphql.printSchema(schema);
  var x = graphql.parse(y);
 // console.log(util.inspect(x, false, null));
}

startServer();
