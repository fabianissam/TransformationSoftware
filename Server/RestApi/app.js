const express = require("express");
const controller = require("./Controllers/controller");

const app = express();

//set up template engine

//app.set("view engine", "ejs");

//static files css wird übertragen
app.use(express.static("./Assets"));
app.use(express.json());
app.use(express.urlencoded());

//start controller
controller(app);

// listen to port
app.listen(3000);
console.log("Ready to receive APIRequests in port 3000");
