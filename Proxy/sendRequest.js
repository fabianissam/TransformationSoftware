const fetch = require("node-fetch");

module.exports = function sendRequest(query) {
  var result = fetch(`localhost:3001/graphql?query=${query}`, {
    method: "get",
  })
    .then((res) => {
      return res.json;
    })
    .then((json) => {
      return json.data;
    });
  return result;
};
