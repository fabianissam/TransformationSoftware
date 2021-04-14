"use strict";

const express = require("express");
const OtG = require("openapi-to-graphql");
const reqtra = require("./RequestTransformation");
const cookieParser = require("cookie-parser");
const oas = require("../Openapi.json");
const $RefParser = require("@apidevtools/json-schema-ref-parser");
const graphql = require("graphql");

async function startServer() {
  const { schema } = await OtG.createGraphQLSchema(oas, {
    operationIdFieldNames: true,
    genericPayloadArgName: true,
  });
  const newOas = await $RefParser.dereference(oas);
  console.log(graphql.printSchema(schema));
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded());
  app.use(cookieParser());
  app.use(reqtra.createGraphQLOperation(newOas, schema));
  // app.use((req,res,body)=>{
  //handle result
  //})
  app.listen(3000);
}

startServer();
