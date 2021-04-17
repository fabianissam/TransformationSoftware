const fetch = require("node-fetch");

module.exports = function sendRequest(
  query,
  operation,
  basicAuth,
  basicAuthName,
  method
) {
  var result = fetch(`http://localhost:3001/graphql?query=${query}`, {
    method: "post",
    body: {
      query: query,
    },
  }).then((res) => {
    return res.json();
  });
// when rest client makes normal graphql queries
  if (
    operation === undefined &&
    basicAuth === undefined &&
    basicAuthName === basicAuthName &&
    method === undefined
  ) {
    result.then((json) => {
      return json;
    });
  } else { // when client send normal rest queries
    result
      .then((json) => {
        console.log(json);
        if (basicAuth) {
          if (method === "get") {
            return json.data[`viewer${basicAuthName}`][operation];
          } else {
            return json.data[`mutationViewer${basicAuthName}`][operation];
          }
        } else {
          return json.data[operation];
        }
      })
      .catch((err) => {
        return err;
      });
  }
  return result;
};
