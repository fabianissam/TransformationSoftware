const fetch = require("node-fetch");

module.exports = function sendRequest(query, operation, basicAuth, method) {
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
          return json.data["viewerBasicAuth"][operation];
        } else {
          return json.data["mutationViewerBasicAuth"][operation];
        }
      } else {
        return json.data[operation];
      }
    });
  return result;
};
