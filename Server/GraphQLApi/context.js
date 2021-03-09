var mysql = require("mysql");

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

module.exports = class Context {
  constructor() {}

  insertPerson(personData) {
    var sql = `insert into person(id, name, vorname,benutzername,password,fachbereich,email) values (${personData.id},'${personData["name"]}' ,'${personData["vorname"]}' ,'${personData["benutzername"]}' ,'${personData["password"]}' ,'${personData["fachbereich"]}' ,'${personData["email"]}')`;
    con.query(sql, function (err, result) {
      if (err) {
        throw err;
      }
    });
  }

  updatePerson(personData) {
    var sql = `update person set id = ${personData.id} ,name= '${personData.name}' ,vorname='${personData.vorname}' ,benutzername = '${personData.benutzername}' ,password= '${personData.password}' ,fachbereich ='${personData.fachbereich}' ,email = '${personData.email}' where id = ${personData.id};`;
    con.query(sql, function (err, result) {
      if (err) {
        throw err;
      }
    });
  }
  deletePerson(id) {
    var sql = `delete from person where id = ${id};`;
    con.query(sql, function (err, result) {
      if (err) {
        throw err;
      }
    });
  }
  getPerson(id, callback) {
    var sql = `select * from person where id = ${id};`;
    con.query(sql, (err, result) => {
      if (err) throw err;
      callback(result[0]);
    });
  }
  getAllPerson(callback) {
    var sql = `select * from person;`;
    con.query(sql, (err, result) => {
      if (err) throw err;
      callback(result);
    });
  }
};

/*var context = new Context();

async function getData() {
  var result = await context.getAllPerson((res) => {
    console.log(res);
    return res;
  });
  console.log(result);
}
//console.log(context.getAllPerson());
getData();
con.end();
*/
