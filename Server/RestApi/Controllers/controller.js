var mysql = require("mysql");
const personController = require("./personController");

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "fabian123!",
  database: "RestAPI",
});
con.connect(function (err) {
  if (err) throw err;
  console.log("Connected!");
});

//master controller
module.exports = function (app) {
  /*app.get("/", (req, res) => {
    res.render("../Views/index");
  });*/
  personController(app, con);
};

/*const aliendatabase = [
  { id: 1, name: "hi", points: 40 },
  { id: 2, name: "baum", points: 60 },
  { id: 3, name: "ali", points: 420 },
  { id: 4, name: "peter", points: 404 },
  { id: 5, name: "manfred", points: 404 },
  { id: 6, name: "uschi", points: 4066 },
  { id: 7, name: "fabian", points: 40656 },
  { id: 8, name: "finley", points: 4032 },
  { id: 9, name: "kilian", points: 403432 },
  { id: 10, name: "troll", points: 402434 },
  { id: 11, name: "hihihihi", points: 404234234 },
];*/

/*mongoose.connect(
  "mongodb://localhost/FachhochschuleAachen",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  function (err) {
    if (err) console.log(err);
  }
);*/

//const mongoose = require("mongoose");
