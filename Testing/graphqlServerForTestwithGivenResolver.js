const express = require("express");
const { graphqlHTTP } = require("express-graphql");
const { createGraphQLSchema } = require("openapi-to-graphql");

const oas = require("../OpenapiTest.json");

async function main(oas) {
  // generate schema

  const { schema, report } = await createGraphQLSchema(oas);

  // server schema:
  const app = express();
  app.use(
    "/graphql",
    graphqlHTTP({
      schema,
      graphiql: true,
    })
  );
  app.listen(9999);
}

main(oas); // oas
