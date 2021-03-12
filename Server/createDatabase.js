var mysql = require("mysql");

// ur own login credetentials

var con = mysql.createConnection({
  host: "localhost",
  user: "yourusername",
  password: "yourpassword",
});

con.connect(function (err) {
  if (err) throw err;
  console.log("Connected!");
  con.query("CREATE DATABASE RestAPI", function (err, result) {
    if (err) throw err;
    console.log("Database created");
  });
});
con.end();
