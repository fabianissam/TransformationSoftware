const graphql = require("graphql");
const $RefParser = require("@apidevtools/json-schema-ref-parser");
const Validator = require("jsonschema").Validator;
const toJsonSchema = require("@openapi-contrib/openapi-schema-to-json-schema");
const stringifyObject = require("stringify-object");
var Buffer = require("buffer/").Buffer;
//only json as input allowed for now
// form data
const sendRequest = require("./sendRequest");

function createGraphQLOperation(oas, schema) {
  return async function graphqlOperation(req, res, next) {
    var regex = new RegExp("/graphql.*", "ig");
    if (req.url.match(regex)) {
      var result = sendRequest(req.query.query);
      res.send(result);
    } else {
      var reqtra = new RequestTransformation(oas, schema);
      reqtra.init(req);
      var valid = await reqtra.validRequest();
      if (valid) {
        reqtra.checkBasicAuth();
        var query = await reqtra.createQueryOrMutation();

        console.log(query);
        var result = await sendRequest(
          query,
          reqtra.getOperationId(),
          reqtra.basicAuth,
          reqtra.basicAuthName,
          reqtra.data.method
        );
        res.send(result);
      } else {
        res.status(400);
        res.send({ error: "falsche Anfrage" });
      }
    }
  };
}

// subscriptions not supported yet
// no polymorphism supported yet

// body only json allowed
class RequestTransformation {
  constructor(oas, schema) {
    this.spec = oas;
    this.data = undefined;
    this.methods = [];
    this.schema = schema;
    this.ast = undefined;
    this.currentMethod = undefined;
    this.basicAuthName = "";
    this.basicAuth = false; // maybe a string which auth will be used but for now a boolean
    this.enum = [];
  }
  init(req) {
    this.getRequestData(req);
    this.createMethods();
    this.ast = graphql.parse(graphql.printSchema(this.schema));
    this.ast.definitions.forEach((definition) => {
      if (definition.kind === "EnumTypeDefinition") {
        this.enum.push(definition);
      }
    });

    // throws Error if false;
  }
  getRequestData(req) {
    var data = {};
    var path = req.baseUrl.concat(req.path);
    data.path = path[path.length - 1] !== "/" ? path + "/" : path;
    data.headers = req.headers; // maybe check if authorization header sent
    data.params = req.params;
    data.query = req.query;
    data.method = req.method.toLowerCase();
    data.body = req.body;
    data.cookies = req.cookies;

    this.data = data;
  }
  async validRequest() {
    // working
    var validRequest = false;
    for (var key in this.methods) {
      var method = this.methods[key];
      var validMethod = this.data.method === method.method;
      var validPath = this.pathChecker(method);
      var validBody = await this.checkBody(method);
      var validParameters = await this.checkParameters(method);
      if (validMethod && validPath && validBody && validParameters) {
        validRequest = true;
        break;
      }
    }
    return validRequest;
  }
  async checkBody(method) {
    //funktioniert nur wenn {} geschickt wird;
    var v = new Validator();
    var validBody = false;
    if (method.rest.requestBody) {
      var required = method.rest.requestBody.required
        ? method.rest.requestBody.required
        : false;
      if (Object.keys(this.data.body).length !== 0) {
        var contentTypes = Object.keys(method.rest.requestBody.content);
        var contentType = contentTypes.find((contentType) => {
          return contentType === this.data.headers["content-type"];
        });

        var schema = method.rest.requestBody.content[contentType].schema;
        var convertedSchema = toJsonSchema(schema);
        if (contentType === "application/json") {
          validBody = v.validate(this.data.body, convertedSchema).valid;
        } else if (contentType === "application/x-www-form-urlencoded") {
          // needs to be tested lol // needs to get transfered into the correct datatypes because form is all string
          //formDataTransformer();
          var obj = this.data.body;
          var finalObj = this.rightTypeConverter(obj, schema);
          this.data.body = finalObj;
          validBody = v.validate(finalObj, convertedSchema).valid;
        }
      } else {
        if (!required) {
          validBody = true;
        }
      }
    } else {
      validBody = true;
    }

    return validBody;
  }
  rightTypeConverter(data, schema) {
    if (schema === undefined) return data;
    var result = data;
    if (schema.type === "integer") {
      result = parseInt(data);
    } else if (schema.type === "string") {
      result = data;
      // } else if (schema.type === "boolean") {
      // } else if (schema.type === "number") {
    } else if (schema.type === "object") {
      var properties = schema.properties;
      var propertyKeys = Object.keys(properties);
      propertyKeys.forEach((propertyKey) => {
        result[propertyKey] = this.rightTypeConverter(
          data[propertyKey],
          properties[propertyKey]
        );
      });
    } else if (schema.type === "array") {
      var itemsType = schema.items;
      for (var key in data) {
        result[key] = this.rightTypeConverter(data[key], itemsType);
      }
    }
    return result;
  }

  async checkParameters(method) {
    //ready but needs to be tested;
    //working
    var validParameters = true;

    var v = new Validator();

    var parameters = method.rest.parameters;

    if (parameters) {
      for (var key in parameters) {
        var para = parameters[key];
        var name = para.name;
        var schema = para.schema;
        var required = para.required ? para.required : false;

        var convertedSchema = toJsonSchema.fromParameter(para);

        var obj = {};
        // eventually put the value in the objectt if not validate

        if (para.in === "header") {
          if (this.data.headers[name]) {
            obj = this.data.headers[name];
            var finalObj = this.rightTypeConverter(obj, schema);
            this.data.headers[name] = finalObj;
          } else {
            if (required) {
              validParameters = false;
              break;
            } else {
              continue;
            }
          }
        } else if (para.in === "path") {
          if (this.data.params[name]) {
            obj = this.data.params[name];
            var finalObj = this.rightTypeConverter(obj, schema);
            this.data.params[name] = finalObj;
          } else {
            if (required) {
              validParameters = false;
              break;
            } else {
              continue;
            }
          }
        } else if (para.in === "query") {
          if (this.data.query[name]) {
            obj = this.data.query[name];
            var finalObj = this.rightTypeConverter(obj, schema);
            this.data.query[name] = finalObj;
          } else {
            if (required) {
              validParameters = false;
              break;
            } else {
              continue;
            }
          }
        } else if (para.in === "cookie") {
          if (this.data.cookies[name]) {
            obj = this.data.cookies[name];
            var finalObj = this.rightTypeConverter(obj, schema);
            this.data.cookies[name] = finalObj;
          } else {
            if (required) {
              validParameters = false;
              break;
            } else {
              continue;
            }
          }
        }
        if (!v.validate(finalObj, convertedSchema).valid) {
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
        } else {
          pathEqual = false;
          break;
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
      if (Object.keys(this.data.body).length > 0) {
        result.requestBody = this.data.body;
      }
    }

    var parametersList = method.rest.parameters;

    if (parametersList) {
      parametersList.forEach((parameter) => {
        var para =
          parameter.name.charAt(0).toUpperCase() +
          parameter.name.slice(1) +
          "Input";
        // if schema type is object
        if (parameter.in === "header") {
          if (this.data.header[parameter.name]) {
            if (parameter.schema.type === "object") {
              result[para] = this.data.headers[parameter.name];
            } else {
              result[parameter.name] = this.data.headers[parameter.name];
            }
          }
        } else if (parameter.in === "query") {
          if (this.data.query[parameter.name]) {
            if (parameter.schema.type === "object") {
              result[para] = this.data.query[parameter.name];
            } else {
              result[parameter.name] = this.data.query[parameter.name];
            }
          }
        } else if (parameter.in === "path") {
          if (this.data.params[parameter.name]) {
            if (parameter.schema.type === "object") {
              result[para] = this.data.params[parameter.name];
            } else {
              result[parameter.name] = this.data.params[parameter.name];
            }
          }
        } else if (parameter.in === "cookies") {
          if (this.data.cookies[parameter.name]) {
            if (parameter.schema.type === "object") {
              result[para] = this.data.cookies[parameter.name];
            } else {
              result[parameter.name] = this.data.cookies[parameter.name];
            }
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
    if (this.basicAuth) {
      var usernameAndPassword = this.getBasicAuthUsernameAndPassword();
      var basicAuthViewerOperation = "";
      if (this.data.method === "get") {
        graphQLOperation = `${afterOperation}${typeKeysToString}`;
        basicAuthViewerOperation = `query{viewer${this.basicAuthName}(username: "${usernameAndPassword[0]}", password: "${usernameAndPassword[1]}"){
          ${graphQLOperation}
        }}`;
      } else {
        graphQLOperation = `${afterOperation}${typeKeysToString}`;
        basicAuthViewerOperation = `mutation{mutationViewer${this.basicAuthName}(username: "${usernameAndPassword[0]}", password: "${usernameAndPassword[1]}"){
          ${graphQLOperation}
        }}`;
      }
      return basicAuthViewerOperation;
    } else {
      if (this.data.method === "get") {
        graphQLOperation = `query{${afterOperation}${typeKeysToString}}`;
      } else {
        graphQLOperation = `mutation{${afterOperation}${typeKeysToString}}`;
      }
      return graphQLOperation;
    }
  }
  getBasicAuthNameSchema() {
    var allSecuritySchemes = Object.keys(this.spec.components.securitySchemes);
    var result = allSecuritySchemes.find((schema) => {
      var tmp = this.spec.components.securitySchemes[schema];
      return tmp.type === "http" && tmp.scheme === "basic";
    });
    return result; // first letter uppercase
  }
  getBasicAuthUsernameAndPassword() {
    if (this.data.headers.authorization) {
      return new Buffer(this.data.headers.authorization.split(" ")[1], "base64")
        .toString()
        .split(":");
    } else {
      return ["", ""];
    }
  }
  checkBasicAuth() {
    if (this.spec.components.securitySchemes) {
      /* var localBasicAuthName = this.getBasicAuthNameSchema();
      this.basicAuthName =
        localBasicAuthName.charAt(0).toUpperCase() +
        localBasicAuthName.slice(1);*/
      this.basicAuthName = "BasicAuth";

      if (this.currentMethod.rest.security) {
        var securityMethod = Object.keys(
          this.currentMethod.rest.security[0]
        )[0];
        if (
          this.spec.components.securitySchemes[securityMethod].type ===
            "http" &&
          this.spec.components.securitySchemes[securityMethod].scheme ===
            "basic"
        ) {
          this.basicAuth = true;
        }
      }
      if (this.spec.security) {
        var securityMethod = Object.keys(this.spec.security[0])[0];
        if (
          this.spec.components.securitySchemes[securityMethod].type ===
            "http" &&
          this.spec.components.securitySchemes[securityMethod].scheme ===
            "basic"
        ) {
          this.basicAuth = true;
        }
      }
    }
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
    var searchFor = "";
    if (this.data.method === "get") {
      searchFor = this.basicAuth ? `Viewer${this.basicAuthName}` : "Query";
      soloDefinition = definitions.find((definition) => {
        return definition.name.value === searchFor;
      });
    } else {
      searchFor = this.basicAuth
        ? `MutationViewer${this.basicAuthName}`
        : "Mutation";
      soloDefinition = definitions.find((definition) => {
        return definition.name.value === searchFor;
      });
    }
    var soloType = soloDefinition.fields.find((type) => {
      return type.name.value === operation;
    });
    // The return type of the operation
    var returnType = null;
    if (
      soloType.type.kind === "ListType" ||
      soloType.type.kind === "NotNullType"
    ) {
      returnType = soloType.type.type.name.value;
    } else {
      var returnType = soloType.type.name.value;
    }
    var enumType = this.enum.find((enumType) => {
      return enumType.name.value === returnType;
    });
    var enumTypeBool = false;
    if (enumType) {
      enumTypeBool = true;
    }
    if (
      !(
        returnType === "Int" ||
        returnType === "String" ||
        returnType === "Boolean" ||
        returnType === "Float" ||
        returnType === "ID" ||
        enumTypeBool
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
        var newReturnType = null;
        if (
          attribute.type.kind === "Listtype" ||
          attribute.type.kind === "NonNullType"
        ) {
          newReturnType = attribute.type.type.name.value;
        } else {
          newReturnType = attribute.type.name.value;
        }
        var enumType = this.enum.find((enumType) => {
          return enumType.name.value === newReturnType;
        });
        var enumTypeBool = false;
        if (enumType) {
          enumTypeBool = true;
        }

        var typeObj = {};
        typeObj.name = attribute.name.value;
        typeObj.nested = !(
          newReturnType === "Int" ||
          newReturnType === "String" ||
          newReturnType === "Boolean" ||
          newReturnType === "Float" ||
          newReturnType === "ID" ||
          enumTypeBool
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

    var searchFor = "";

    if (this.data.method === "get") {
      searchFor = this.basicAuth ? `Viewer${this.basicAuthName}` : "Query";
      soloDefinition = definitions.find((definition) => {
        return definition.name.value === searchFor;
      });
    } else {
      searchFor = this.basicAuth
        ? `MutationViewer${this.basicAuthName}`
        : "Mutation";
      soloDefinition = definitions.find((definition) => {
        return definition.name.value === searchFor;
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
