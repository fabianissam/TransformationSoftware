const fetch = require("node-fetch");

module.exports = function sendRequest(query, operation) {
  var result = fetch(`http://localhost:3001/graphql?query=${query}`, {
    method: "get",
  })
    .then((res) => {
      return res.json();
    })
    .then((json) => {
      return json.data[operation];
    });
  return result;
};
