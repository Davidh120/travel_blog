const express = require("express");
const router = express.Router();
const mysql = require("mysql2");
var path = require("path");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "hotmail",
  auth: {
    user: "email@hotmail.com",
    pass: "123",
  },
});

function enviarCorreoBienvenida(email, nombre) {
  const options = {
    from: "david.antonio12@hotmail.com",
    to: email,
    subject: "Bienvenido al Blog de viajes",
    text: `Hola ${nombre}`,
  };
  transporter.sendMail(options, (error, info) => {});
}

var pool = mysql.createPool({
  connectionLimit: 20,
  host: "localhost",
  user: "root",
  password: "123",
  database: "blog_viajes",
});

router.get("/", (req, res) => {
  pool.getConnection((err, connection) => {
    let query;
    let modificadorQuery = "";
    let modificadorPagina = "";
    let pagina = 0;
    const busqueda = req.query.busqueda ? req.query.busqueda : "";
    if (busqueda != "") {
      modificadorQuery = `WHERE titulo LIKE '%${busqueda}%' OR
      resumen LIKE '%${busqueda}%' OR
      contenido LIKE '%${busqueda}%' OR
      pseudonimo LIKE '%${busqueda}%'`;
      modificadorPagina = "";
    } else {
      pagina = req.query.pagina ? parseInt(req.query.pagina) : 0;
      if (pagina < 0) {
        pagina = 0;
      }
      modificadorPagina = `LIMIT 5 OFFSET ${pagina * 5}`;
    }
    query = `
        SELECT publicaciones.id id,titulo, resumen, fecha_hora, pseudonimo, votos, avatar FROM blog_viajes.publicaciones
        INNER JOIN blog_viajes.autores
        ON publicaciones.autor_id = autores.id
        ${modificadorQuery}
        ORDER BY fecha_hora DESC
        ${modificadorPagina}
      `;
    connection.query(query, (err, rows, fields) => {
      res.render("pages/index", {
        usuario: req.session.usuario,
        publicaciones: rows,
        busqueda: busqueda,
        pagina: pagina,
      });
    });
    connection.release();
  });
});

router.get("/registro", (req, res) => {
  res.render("pages/registro", {
    usuario: req.session.usuario,
    mensaje: req.flash("mensaje")
  });
});

router.post("/procesar-registro", (req, res) => {
  pool.getConnection((err, connection) => {
    const email = req.body.email.toLowerCase().trim();
    const pseudonimo = req.body.pseudonimo.trim();
    const contrasena = req.body.contrasena;

    const queryEmail = `SELECT * FROM autores WHERE email = ${connection.escape(
      email
    )}`;
    connection.query(queryEmail, (err, rows, fields) => {
      if (rows.length > 0) {
        req.flash("mensaje", "Email duplicado");
        res.redirect("/registro");
      } else {
        const queryPseudonimo = `SELECT * FROM autores WHERE pseudonimo = ${connection.escape(
          pseudonimo
        )}`;
        connection.query(queryPseudonimo, (err, rows, fields) => {
          if (rows.length > 0) {
            req.flash("mensaje", "Pseudonimo duplicado");
            res.redirect("/registro");
          } else {
            const query = `INSERT INTO autores (email,contrasena,pseudonimo)
              VALUES (
                ${connection.escape(email)},
                ${connection.escape(contrasena)},
                ${connection.escape(pseudonimo)})`;
            connection.query(query, (err, rows, fields) => {
              if (req.files && req.files.avatar) {
                const archivoAvatar = req.files.avatar;
                const id = rows.insertId;
                const nombreArchivo = `${id}${path.extname(
                  archivoAvatar.name
                )}`;

                archivoAvatar.mv( //mover el archivo al directorio indicado en la siguiente ruta
                  `./public/avatars/${nombreArchivo}`,
                  (err) => {
                    if(err){
                      return res.status(500).send(err);
                    }
                    const queryAvatar = `UPDATE autores SET avatar = ${connection.escape(
                      nombreArchivo
                    )} WHERE id = ${connection.escape(id)}`;
                    connection.query(queryAvatar, (err, rows, fields) => {
                      enviarCorreoBienvenida(email, pseudonimo)
                      req.flash("mensaje", "Usuario registrado con Avatar");
                      res.redirect("/registro");
                    });
                  }
                );
              } else {
                enviarCorreoBienvenida(email, pseudonimo)
                req.flash("mensaje", "Usuario registrado");
                res.redirect("/registro");
              }
            });
          }
        });
      }
    });
    connection.release();
  });
});

router.get("/inicio", (req, res) => {
  res.render("pages/inicio", {
    usuario: req.session.usuario,
    mensaje: req.flash("mensaje")
  });
});

router.post("/procesar-inicio", (req, res) => {
  pool.getConnection((err, connection) => {
    const query = `
      SELECT *
      FROM autores
      WHERE
      email = ${connection.escape(req.body.email)} AND
      contrasena = ${connection.escape(req.body.contrasena)}
    `;
    connection.query(query, (err, rows, fields) => {
      if (rows.length > 0) {
        req.session.usuario = rows[0];
        res.redirect("/admin/index");
      } else {
        req.flash("mensaje", "Datos inválidos");
        res.redirect("/inicio");
      }
    });
    connection.release();
  });
});

router.get("/detalle/:id", (req, res) => {
  pool.getConnection((err, connection) => {
    const query = `SELECT * FROM publicaciones WHERE id = ${connection.escape(
      req.params.id
    )}`;
    connection.query(query, (err, rows, fields) => {
      if (rows.length > 0) {
        res.render("pages/detalle", { usuario: req.session.usuario, publicacion: rows[0] });
      } else {
        res.redirect("/");
      }
    });
    connection.release();
  });
});

router.get("/autores", (req, res) => {
  pool.getConnection((err, connection) => {
    const query = `SELECT autores.id id, pseudonimo, avatar, publicaciones.id publicacion_id, titulo
    FROM autores
    INNER JOIN
    publicaciones
    ON
    autores.id = publicaciones.autor_id
    ORDER BY autores.id DESC, publicaciones.fecha_hora DESC`;

    connection.query(query, (err, rows, fields) => {
      autores = [];
      ultimoAutorId = undefined;
      rows.forEach((registro) => {
        if (registro.id != ultimoAutorId) {
          ultimoAutorId = registro.id;
          autores.push({
            id: registro.id,
            pseudonimo: registro.pseudonimo,
            avatar: registro.avatar,
            publicaciones: [],
          });
        }
        autores[autores.length - 1].publicaciones.push({
          id: registro.publicacion_id,
          titulo: registro.titulo,
        });
      });
      res.render("pages/autores", {
        usuario: req.session.usuario,
        autores: autores
      });
    });
    connection.release();
  });
});

router.get("/detalle/:id/votar", (req, res) => {
  pool.getConnection((err, connection) => {
    const query = `SELECT * FROM publicaciones WHERE id = ${connection.escape(
      req.params.id
    )}`;
    connection.query(query, (err, rows, fields) => {
      if (rows.length > 0) {
        const queryVotos = `UPDATE publicaciones SET votos = votos + 1 WHERE id = ${connection.escape(
          req.params.id
        )}`;
        connection.query(queryVotos, (err, rows, fields) => {
          res.redirect(`/detalle/${req.params.id}`);
        });
      } else {
        req.flash("mensaje", "Publicacion invalida");
        res.redirect("/");
      }
    });
    connection.release();
  });
});

module.exports = router;
