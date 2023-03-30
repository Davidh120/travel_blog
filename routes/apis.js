const express = require("express");
const router = express.Router();
const mysql = require("mysql2");

var pool = mysql.createPool({
    connectionLimit: 20,
    host: "localhost",
    user: "root",
    password: "David1002",
    database: "blog_viajes",
  });

router.get("/api/v1/publicaciones", (req, res) => {
  pool.getConnection((err, connection) => {
    let query = "";
    let modificadorQuery = "";
    const busqueda = req.query.busqueda ? req.query.busqueda : "";
    if (busqueda != "") {
      modificadorQuery = `WHERE titulo = ${connection.escape(
        req.query.busqueda
      )} OR
        resumen = ${connection.escape(req.query.busqueda)} OR
        contenido = ${connection.escape(req.query.busqueda)}`;
    }
    query = `SELECT * FROM publicaciones ${modificadorQuery}`;
    connection.query(query, (err, rows, fields) => {
      if (rows.length > 0) {
        res.status(200);
        res.json({ data: rows });
      } else {
        res.status(404);
        res.send({ erros: ["No se encuentra esta publicacion"] });
      }
    });
    connection.release();
  });
});

router.get("/api/v1/publicaciones/:id", (req, res) => {
  pool.getConnection((err, connection) => {
    const query = `SELECT * FROM publicaciones WHERE id = ${connection.escape(
      req.params.id
    )}`;
    connection.query(query, (err, rows, fields) => {
      if (rows.length > 0) {
        res.status(200);
        res.json({ data: rows[0] });
      } else {
        res.status(404);
        res.send({ errors: ["No se encuentra esta publicacion"] });
      }
    });
    connection.release();
  });
});

router.get("/api/v1/autores", (req, res) => {
  pool.getConnection((err, connection) => {
    const query = `SELECT * FROM autores`;
    connection.query(query, (err, rows, fields) => {
      if (rows.length > 0) {
        res.status(200);
        res.json({ data: rows });
      } else {
        res.status(404);
        res.send({ errors: ["Autores no encontrados"] });
      }
    });
    connection.release();
  });
});

router.get("/api/v1/autores/:id", (req, res) => {
  pool.getConnection((err, connection) => {
    const query = `SELECT autores.id id, pseudonimo, avatar, titulo, publicaciones.id publicacion_id
      FROM autores
      INNER JOIN publicaciones
      ON autores.id = publicaciones.autor_id
      WHERE autores.id = ${connection.escape(req.params.id)}`;
    connection.query(query, (err, rows, fields) => {
      if (rows.length > 0) {
        res.status(200);
        res.json({ data: rows });
      } else {
        res.status(404);
        res.send({ errors: ["No se encuentra a este autor"] });
      }
    });
    connection.release();
  });
});

router.post("/api/v1/autores", (req, res) => {
  pool.getConnection((err, connection) => {
    const email = req.body.email.toLowerCase().trim();
    const pseudonimo = req.body.pseudonimo.trim();
    const contrasena = req.body.contrasena;

    const queryEmail = `SELECT * FROM autores WHERE email = ${connection.escape(
      email
    )}`;
    connection.query(queryEmail, (err, rows, fields) => {
      if (rows.length > 0) {
        res.status(404);
        res.send({ errors: ["Email duplicado"] });
      } else {
        const queryPseudonimo = `SELECT * FROM autores WHERE pseudonimo = ${connection.escape(
          pseudonimo
        )}`;
        connection.query(queryPseudonimo, (err, rows, fields) => {
          if (rows.length > 0) {
            res.status(404);
            res.send({ errors: ["Pseudonimo duplicado"] });
          } else {
            const query = `INSERT INTO autores (email,contrasena,pseudonimo)
                VALUES (
                  ${connection.escape(email)},
                  ${connection.escape(contrasena)},
                  ${connection.escape(pseudonimo)})`;
            connection.query(query, (err, rows, fields) => {
              const nuevoId = rows.insertId;
              const queryConsulta = `SELECT * FROM autores WHERE id = ${connection.escape(
                nuevoId
              )}`;
              connection.query(queryConsulta, (error, rows, fields) => {
                res.status(201);
                res.json({ data: rows[0] });
              });
            });
          }
        });
      }
    });
    connection.release();
  });
});

router.post("/api/v1/publicaciones", (req, res) => {
  pool.getConnection((err, connection) => {
    const date = new Date();
    const fecha = `${date.getFullYear()}-${
      date.getMonth() + 1
    }-${date.getDate()}`;
    const queryDatos = `
        SELECT *
        FROM autores
        WHERE
        email = ${connection.escape(req.query.email)} AND
        contrasena = ${connection.escape(req.query.contrasena)}`;
    connection.query(queryDatos, (err, rows, fields) => {
      if (rows.length > 0) {
        const query = `INSERT INTO publicaciones (titulo, resumen, contenido, autor_id, fecha_hora)
        VALUES (${connection.escape(req.body.titulo)},
        ${connection.escape(req.body.resumen)},
        ${connection.escape(req.body.contenido)},
        ${connection.escape(rows[0].id)},
        ${connection.escape(fecha)})`;
        connection.query(query, (err, rows, fields) => {
          const nuevoId = rows.insertId;
          const queryConsulta = `SELECT * FROM publicaciones WHERE id = ${connection.escape(
            nuevoId
          )}`;
          connection.query(queryConsulta, (error, rows, fields) => {
            res.status(201);
            res.json({ data: rows[0] });
          });
        });
      } else {
        res.status(404);
        res.send({ errors: ["Datos invalidos"] });
      }
    });
    connection.release();
  });
});

router.delete("/api/v1/publicaciones/:id", (req, res) => {
  pool.getConnection((err, connection) => {
    const queryDatos = `
        SELECT *
        FROM autores
        WHERE
        email = ${connection.escape(req.query.email)} AND
        contrasena = ${connection.escape(req.query.contrasena)}`;
    connection.query(queryDatos, (err, rows, fields) => {
      if (rows.length > 0) {
        const query = `SELECT * FROM publicaciones WHERE id = ${connection.escape(
          req.params.id
        )}`;
        connection.query(query, (err, rows, fields) => {
          if (rows.length > 0) {
            const queryDelete = `DELETE FROM publicaciones WHERE id = ${connection.escape(
              req.params.id
            )}`;
            connection.query(queryDelete, (err, rows, fields) => {
              res.status(204);
              res.json();
            });
          } else {
            res.status(404);
            res.send({ errors: ["No se encuentra esa publicacion"] });
          }
        });
      } else {
        res.status(404);
        res.send({ errors: ["Datos invalidos"] });
      }
    });
    connection.release();
  });
});

module.exports = router;
