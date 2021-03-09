var method = document.getElementsByTagName("select")[0].value;
var url = document.getElementById("url").nodeValue;


function createPerson() {

  
  fetch(url, {
    method: method,
   /* headers: {
      "Content-Type": "application/json",
    },
    body: "/*JSON.stringify({ data: document.getElementById("alien") }),*/
  });
}
function updatePerson()

document.getElementsByTagName("button")[0].onclick = createPerson;
