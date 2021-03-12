var mysql = require("mysql");

// ur own login credentials
var con = mysql.createConnection({
  host: "localhost",
  user: "yourusername",
  password: "yourpassword",
  database: "RestAPI",
});
con.connect(function (err) {
  if (err) throw err;
  console.log("Connected!");
  var sql =
    "CREATE TABLE person (name VARCHAR(20), vorname VARCHAR(20),benutzername VARCHAR(20),password VARCHAR(20), fachbereich INT,id INT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(50));";
  con.query(sql, function (err, result) {
    if (err) throw err;
    console.log("Table created");
  });
});
con.end();
