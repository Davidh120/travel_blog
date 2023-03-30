const express = require("express");
const app = express();
const session = require("express-session");
const flash = require("express-flash");
const mysql = require("mysql2");
const fileUpload = require("express-fileupload");
const autenticador = require("./middleware/autenticador");
const routerPublicas = require("./routes/publicas");
const routerPrivadas = require("./routes/privadas");
const apis = require("./routes/apis");

var pool = mysql.createPool({
  connectionLimit: 20,
  host: "localhost",
  user: "root",
  password: "David1002",
  database: "blog_viajes",
});

app.use(express.json()); //app.use(bodyParser.json()); "ya no es necesario usar bodyparser por que ahora esta incluido por defecto en express"
app.use(express.urlencoded({ extended: true })); //app.use(bodyParser.urlencoded({ extended: true })); "ya no es necesario usar bodyparser por que ahora esta incluido por defecto en express"
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(
  session({ secret: "token-secret", resave: true, saveUninitialized: true })
);
app.use(flash());
app.use(fileUpload());

app.use(autenticador);
app.use(routerPublicas);
app.use(routerPrivadas);
app.use(apis);

app.listen(8080, () => {
  console.log(`Server running in port 8080`);
});
