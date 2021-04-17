var toJsonSchema = require("@openapi-contrib/openapi-schema-to-json-schema");

var schema = {
  type: "object",
  required: [
    "id",
    "name",
    "vorname",
    "benutzername",
    "email",
    "password",
    "fachbereich",
  ],
  properties: {
    id: {
      type: "integer",
    },
    name: {
      type: "string",
    },
    vorname: {
      type: "string",
    },
    benutzername: {
      type: "string",
    },
    email: {
      type: "string",
    },
    password: {
      type: "string",
    },
    fachbereich: {
      type: "integer",
    },
  },
};
var convertedSchema = toJsonSchema(schema);

console.log(convertedSchema);
