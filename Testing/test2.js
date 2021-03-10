const Resolver = require("@stoplight/json-ref-resolver").Resolver;
const OtG = require("openapi-to-graphql");
const oas = require("../Openapi.json");
const graphql = require("graphql");
const util = require("util");
const Validator = require("jsonschema").Validator;
const toJsonSchema = require("@openapi-contrib/openapi-schema-to-json-schema");
const $RefParser = require("@apidevtools/json-schema-ref-parser");

var v = new Validator();
var obj = {
  irgendwas: 1,
};
var parameters = {
  name: "id",
  in: "path",
  required: true,
  description: "",
  schema: {
    $ref: "#/components/schemas/person",
  },
};
var schema = {
  $ref: "#/components/schemas/person",
};
async function hello() {
  let resolved = await $RefParser.dereference({
    info: schema,
    components: oas.components,
  });

  let convertedSchema = toJsonSchema(resolved.info);
  convertedSchema.additionalProperties = false;
  convertedSchema.required = Object.keys(convertedSchema.properties);

  console.log(convertedSchema);
  var result = v.validate(obj, convertedSchema).valid;
  console.log(result);
}
hello();
