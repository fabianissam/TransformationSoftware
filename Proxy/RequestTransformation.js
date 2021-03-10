const graphql = require("graphql");
const OtG = require("openapi-to-graphql");
const Validator = require("jsonschema").Validator;
const toJsonSchema = require("@openapi-contrib/openapi-schema-to-json-schema");
const stringifyObject = require("stringify-object");
//only json as input allowed for now
// form data

const sendRequest = require("./sendRequest");
const $RefParser = require("@apidevtools/json-schema-ref-parser");
//options function for differentiate json and form

function createGraphQLOperation(oas, schema) {
  return async function graphqlOperation(req, res, next) {
    var regex = new RegExp("/graphql.*", "ig");
    if (req.url.match(regex)) {
      var result = sendRequest(req.query.query);
      res.send(result);
    } else {
      var reqtra = new RequestTransformation(oas, schema);
      reqtra.init(req);
      if (!reqtra.validRequest()) {
        var query = await reqtra.createQueryOrMutation();

        console.log(query);
        var result = await sendRequest(query, reqtra.getOperationId());
        res.send(result);
      } else {
        res.status(400);
        res.send({ error: "falsche Anfrage" });
      }
    }
  };
}

// option for authentication wrap to query or subscriptions but dont want that
// add functionality for reusable requestbodys and parameter

class RequestTransformation {
  constructor(oas, schema) {
    this.spec = oas;
    this.data = undefined;
    this.methods = [];
    this.schema = schema;
    this.ast = undefined;
    this.currentMethod = undefined;
  }
  init(req) {
    this.getRequestData(req);
    this.createMethods();
    this.ast = graphql.parse(graphql.printSchema(this.schema));
    // throws Error if false;
  }
  getRequestData(req) {
    var data = {};
    var path = req.baseUrl.concat(req.path);
    data.path = path[path.length - 1] !== "/" ? path + "/" : path;
    data.headers = req.headers;
    data.params = req.params;
    data.query = req.query;
    data.method = req.method.toLowerCase();
    data.body = req.body;
    data.cookies = req.cookies;

    this.data = data;
  }
  validRequest() {
    // working
    var validRequest = true;
    var method = this.methods.find((method) => {
      return (
        this.pathChecker(method) &&
        method.method === this.data.method &&
        this.checkParameters(method) &&
        this.checkBody(method)
      );
    });
    if (!method) {
      validRequest = false;
    }

    return validRequest;
  }
  async checkBody(method) {
    // only for json and formdata
    //working

    var v = new Validator();
    var validBody = true;
    if (method.rest.requestBody) {
      var contentTypes = Object.keys(method.rest.requestBody.content);

      var contentType = contentTypes.find((contentType) => {
        return contentType === this.data.headers["content-type"];
      });
      if (contentType) {
        var schema = method.rest.requestBody.content[contentType].schema;
        //handle anyof

        var resolvedBody = await $RefParser.dereference({
          info: schema,
          components: this.spec.components,
        });
        var convertedSchema = toJsonSchema(resolvedBody.info);

        var propertyKeysSchema = Object.keys(convertedSchema.properties);
        var propertyKeysData = Object.keys(this.data.body);

        if (!arrayCompare(propertyKeysData, propertyKeysSchema)) {
          return false;
        }
        convertedSchema["additionalProperties"] = false;
        convertedSchema["required"] = Object.keys(convertedSchema.properties);

        var obj = this.data.body;
        // eventually put the value in the objectt if not validate

        if (!v.validate(obj, convertedSchema).valid) {
          validBody = false;
        }
      } else {
        validBody = false;
      }
    }
    return validBody;
  }
  async checkParameters(method) {
    //ready but needs to be tested;
    //working
    var validParameters = true;

    var v = new Validator();
    //parameter first
    //params in path
    //query in query
    //header in header
    //cookie in cookie

    var parameters = method.rest.parameters;

    if (parameters) {
      const resolvedParameters = await $RefParser.dereference({
        info: parameters,
        components: this.spec.components,
      });

      for (var para in resolvedParameters.info) {
        var name = para.name;

        var convertedSchema = toJsonSchema.fromParameter(para);
        convertedSchema["additionalProperties"] = false;
        convertedSchema["required"] = Object.keys(convertedSchema.properties);

        var obj = {};
        // eventually put the value in the objectt if not validate

        if (para.in === "header") {
          obj = this.data.headers[name];
        } else if (para.in === "path") {
          obj = this.data.params[name];
        } else if (para.in === "query") {
          obj = this.data.query[name];
        } else if (para.in === "cookie") {
          obj = this.data.cookies[name];
        }
        var propertyKeysSchema = Object.keys(convertedSchema.properties);
        var propertyKeysData = Object.keys(obj);

        if (!arrayCompare(propertyKeysData, propertyKeysSchema)) {
          validParameters = false;
          break;
        }
        if (!v.validate(obj, convertedSchema).valid) {
          validParameters = false;
          break;
        }
      }
    }
    return validParameters;
  }

  pathChecker(method) {
    //mostlikely working
    // must be tested
    var pathEqual = false;

    var dataPath = "";
    var oasPath = "";

    var dataPathIndex = 0;
    var oasPathIndex = 0;

    while (true) {
      if (
        dataPathIndex === this.data.path.length &&
        oasPathIndex === method.path.length
      ) {
        this.currentMethod = method;
        break;
      }
      dataPath = "";
      oasPath = "";
      for (var i = dataPathIndex; i < this.data.path.length; i++) {
        dataPath += this.data.path[i];
        if (this.data.path[i] === "/") {
          dataPathIndex = i + 1;
          break;
        }
      }
      for (var i = oasPathIndex; i < method.path.length; i++) {
        oasPath += method.path[i];
        if (method.path[i] === "/") {
          oasPathIndex = i + 1;
          break;
        }
      }
      if (dataPath !== "" && oasPath !== "") {
        if (dataPath === oasPath) {
          pathEqual = true;
          continue;
        }
        var regex = new RegExp("{.*}/", "ig");
        var params = method.rest.parameters;
        if (oasPath.match(regex)) {
          var id = oasPath.slice(1, -2);
          var value = dataPath.slice(0, -1);
          var param = params.find((para) => {
            return para.name === id;
          });
          var type = param.schema.type;

          var result = null;
          if (type === "integer") {
            result = parseInt(value);
            if (Number.isInteger(result)) {
              pathEqual = true;
            }
          } else if (type === "object") {
            result = JSON.parse(value);
            if (typeof result === "object" && value !== null) {
              pathEqual = true;
            }
          } else if (type === "array") {
            result = JSON.parse(value);
            if (Array.isArray(JSON.parse(value))) {
              pathEqual = true;
            }
          } else if (type === "string") {
            result = value;
            if (typeof value === "string" || value instanceof String) {
              pathEqual = true;
            }
          } else {
            pathEqual = false;
            break;
          }

          this.data.params[id] = result;
        }
      } else {
        pathEqual = false;
        break;
      }
    }
    return pathEqual;
  }

  getOperationId() {
    //works but error if not valid

    var result = this.currentMethod.rest.operationId;
    return result;
  }
  createMethods() {
    //works
    var pathKeys = Object.keys(this.spec.paths);
    pathKeys.forEach((path) => {
      var methodKeys = Object.keys(this.spec.paths[path]);
      methodKeys.forEach((method) => {
        var methodPath = path[path.length - 1] !== "/" ? path + "/" : path;
        var method = {
          path: methodPath,
          method: method,
          rest: this.spec.paths[path][method],
        };
        this.methods.push(method);
      });
    });
  }
  async argumentNameBodyParameterConnector(operation) {
    // test it

    var result = {};

    var method = this.methods.find((method) => {
      return method.rest.operationId === operation;
    });

    if (method.rest.requestBody) {
      result.requestBody = this.data.body;
    }

    var parametersList = method.rest.parameters;

    if (parametersList) {
      const resolvedParameter = await $RefParser.dereference({
        info: parametersList,
        components: this.spec.components,
      });

      resolvedParameter.info.forEach((parameter) => {
        var para =
          parameter.name.charAt(0).toUpperCase() +
          parameter.name.slice(1) +
          "Input";
        // if schema type is object
        if (parameter.in === "header") {
          if (parameter.schema.type === "object") {
            result[para] = this.data.headers[parameter.name];
          } else {
            result[parameter.name] = this.data.headers[parameter.name];
          }
        } else if (parameter.in === "query") {
          if (parameter.schema.type === "object") {
            result[para] = this.data.query[parameter.name];
          } else {
            result[parameter.name] = this.data.query[parameter.name];
          }
        } else if (parameter.in === "path") {
          if (parameter.schema.type === "object") {
            result[para] = this.data.params[parameter.name];
          } else {
            result[parameter.name] = this.data.params[parameter.name];
          }
        } else if (parameter.in === "cookies") {
          if (parameter.schema.type === "object") {
            result[para] = this.data.cookies[parameter.name];
          } else {
            result[parameter.name] = this.data.cookies[parameter.name];
          }
        }
      });
    }
    // parameterzuweisung zuerst
    return result;
  }
  //nested input but only one argument for now allowed per request as json
  // can be nested
  //validate with request

  async createQueryOrMutation() {
    var graphQLOperation = "";

    var graphQLOperationName = this.getOperationId();
    var argumentKeyValues = await this.argumentNameBodyParameterConnector(
      graphQLOperationName
    );
    var argumentKeys = Object.keys(argumentKeyValues);
    var afterOperation = graphQLOperationName;

    if (argumentKeys.length > 0) {
      afterOperation += `(`;
      argumentKeys.forEach((key) => {
        afterOperation += `${key}: ${stringifyObject(argumentKeyValues[key], {
          indent: "  ",
          singleQuotes: false,
        })}`; // object needs to be string
      });

      afterOperation += ")";
    }

    // all Elements to make a successful graphql query
    var typeKeys = this.getTypeKeys(graphQLOperationName);
    var typeKeysToString = this.getTypeKeysToString(typeKeys);

    if (this.data.method === "get") {
      graphQLOperation = `query{${afterOperation}${typeKeysToString}}`;
    } else {
      graphQLOperation = `mutation{${afterOperation}${typeKeysToString}}`;
    }
    return graphQLOperation;
  }
  getTypeKeysToString(typeKeys) {
    //works
    if (typeKeys.length === 0) {
      return "";
    }
    var result = "{";
    typeKeys.forEach((typeKey) => {
      result += typeKey.name;
      if (typeKey.nested.length > 0) {
        result += this.getTypeKeysToString(typeKey.nested);
      } else {
        result += ",";
      }
    });
    result += "}";
    return result;
  }
  getTypeKeys(operation) {
    //works
    // get from ast all typekeys to make query succesful search for return value of operation then take return value of operation filter all typekeys // can be nested
    //if other than primitive datatype create object with the typekeys within it
    // string or object if nested

    var definitions = this.ast.definitions;
    var soloDefinition = {};
    if (this.data.method === "get") {
      soloDefinition = definitions.find((definition) => {
        return definition.name.value === "Query";
      });
    } else {
      soloDefinition = definitions.find((definition) => {
        return definition.name.value === "Mutation";
      });
    }
    var soloType = soloDefinition.fields.find((type) => {
      return type.name.value === operation;
    });
    // The return type of the operation
    var returnType = null;
    if (soloType.type.kind === "ListType") {
      returnType = soloType.type.type.name.value;
    } else {
      var returnType = soloType.type.name.value;
    }

    if (
      !(
        returnType === "Int" ||
        returnType === "String" ||
        returnType === "Boolean" ||
        returnType === "Float" ||
        returnType === "ID"
      )
    ) {
      return this.getTypesHelper(returnType);
    }
    return [];
  }
  getTypesHelper(returnType) {
    // works
    var definitions = this.ast.definitions;
    var typeDefiniton = definitions.find((definition) => {
      return definition.name.value === returnType;
    });
    var attributes = [];
    typeDefiniton.fields.forEach((attribute) => {
      if (attribute.arguments.length === 0) {
        var newReturnType = attribute.type.name.value;
        var typeObj = {};
        typeObj.name = attribute.name.value;
        typeObj.nested = !(
          newReturnType === "Int" ||
          newReturnType === "String" ||
          newReturnType === "Boolean" ||
          newReturnType === "Float" ||
          newReturnType === "ID"
        )
          ? this.getTypesHelper(attribute.type.name.value)
          : [];
        attributes.push(typeObj);
      }
    });
    return attributes;
  }

  getArgumentNames(operation) {
    //works
    var allArguments = [];
    var definitions = this.ast.definitions;
    var soloDefinition = {};
    if (this.data.method === "get") {
      soloDefinition = definitions.find((definition) => {
        return definition.name.value === "Query";
      });
    } else {
      soloDefinition = definitions.find((definition) => {
        return definition.name.value === "Mutation";
      });
    }
    var soloType = soloDefinition.fields.find((type) => {
      return type.name.value === operation;
    });

    if (soloType.arguments.length > 0) {
      soloType.forEach((arg) => {
        allArguments.push(arg.name.value);
      });
    }

    //return list of string
    return allArguments;
  }
}

module.exports = { createGraphQLOperation };

function arrayCompare(_arr1, _arr2) {
  if (
    !Array.isArray(_arr1) ||
    !Array.isArray(_arr2) ||
    _arr1.length !== _arr2.length
  ) {
    return false;
  }

  // .concat() to not mutate arguments
  const arr1 = _arr1.concat().sort();
  const arr2 = _arr2.concat().sort();

  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }

  return true;
}
