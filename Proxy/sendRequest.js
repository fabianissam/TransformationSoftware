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
  })
    .then((res) => {
      return res.json();
    })
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
    });
  return result;
};
