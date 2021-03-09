const person = require("../Models/person");
// delete/update coming soon

/*var personobj = {name: "Abdallah",
  vorname: "Fabian",
  benutzername: "fabianissam",
  password: "fabianissam",
  fachbereich: "FB5",
  email: "fabian.abdallah98@googlemail.com",
};*/
module.exports = function (app, con) {
  //connection created for interaction with database

  //get all persons from the database
  app.get("/person", (req, res) => {
    var sql = `select * from person;`;
    con.query(sql, (err, result) => {
      if (err) throw err;
      console.log(result);
      res.send(result);
    });
  });

  //insert a person to the database
  app.post("/person", (req, res) => {
    console.log(req.headers);
    person.insertPerson(con, req.body);
    res.send(req.body);
  });

  // update a person in the database
  app.put("/person", (req, res) => {
    person.updatePerson(con, req.body);
    res.send(req.body);
  });

  //delete a person from the database
  app.delete("/person/:id", (req, res) => {
    person.deletePerson(con, req.params.id);
    res.status(200);
    res.send("200 OK akzeptiert");
  });

  //get one specific person from the database
  app.get("/person/:id", (req, res) => {
    var sql = `select * from person where id = ${req.params.id};`;
    con.query(sql, (err, result) => {
      if (err) throw err;
      res.send(result[0]);
    });
  });
};

/* personModel.findOne({ _id: req.params.id }, function (err, doc) {
      if (err) res.send({ error: "person doesnt exist" });
      else {
        res.send(doc);
      }
    });
    */
