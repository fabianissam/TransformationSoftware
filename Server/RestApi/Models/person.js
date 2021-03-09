// return object with all required function to get information

module.exports.insertPerson = (con, personData) => {
  var sql = `insert into person(id, name, vorname,benutzername,password,fachbereich,email) values (${personData.id},'${personData["name"]}' ,'${personData["vorname"]}' ,'${personData["benutzername"]}' ,'${personData["password"]}' ,'${personData["fachbereich"]}' ,'${personData["email"]}')`;
  con.query(sql, function (err, result) {
    if (err) {
      throw err;
    }
  });
};
module.exports.updatePerson = (con, personData) => {
  var sql = `update person set id = ${personData.id} ,name= '${personData.name}' ,vorname='${personData.vorname}' ,benutzername = '${personData.benutzername}' ,password= '${personData.password}' ,fachbereich ='${personData.fachbereich}' ,email = '${personData.email}' where id = ${personData.id};`;
  con.query(sql, function (err, result) {
    if (err) {
      throw err;
    }

    return result;
  });
};
module.exports.deletePerson = (con, id) => {
  // console.log(id);
  var sql = `delete from person where id = ${id};`;
  con.query(sql, function (err, result) {
    if (err) {
      throw err;
    }

    return result;
  });
};

/*var personMethods = {
  allPersons: () => {
    var sql = "select * from person;";
    con.query(sql, function (err, result) {
      if (err) {
        throw err;
      }
      return result;
    });
    return null;
  },
  onePerson: (id) => {
    var sql = `select * from person where person_id = ${id};`;
    con.query(sql, function (err, result) {
      if (err) {
        throw err;
      }
      return result;
    });
    return null;
  },
  insertPerson: (personData) => {
    var sql = `insert into person(person_id,name, vorname,benutzername,password,fachbereich,email) values ${personData}`;
    con.query(sql, function (err, result) {
      if (err) {
        throw err;
      }
      return result;
    });
    return null;
  },
  updatePerson: (personData) => {return null;},
  deletePerson: (id) => {return null;},
};*/
