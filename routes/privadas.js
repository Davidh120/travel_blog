const express = require("express");
const router = express.Router();
const mysql = require("mysql2");
var path = require("path");

var pool = mysql.createPool({
  connectionLimit: 20,
  host: "localhost",
  user: "root",
  password: "123",
  database: "blog_viajes",
});

router.get("/admin/index", (req, res) => {
  pool.getConnection((err, connection) => {
    const query = `SELECT * FROM publicaciones WHERE autor_id = ${connection.escape(
      req.session.usuario.id
    )}`;
    connection.query(query, (err, rows, fields) => {
      res.render("pages/admin/index", {
        usuario: req.session.usuario,
        mensaje: req.flash("mensaje"),
        publicaciones: rows,
      });
    });
    connection.release();
  });
});

router.get("/admin/agregar", (req, res) => {
  res.render("pages/admin/agregar", {
    mensaje: req.flash("mensaje"),
    usuario: req.session.usuario,
  });
});

router.post("/admin/procesar-agregar", (req, res) => {
  pool.getConnection((err, connection) => {
    const date = new Date();
    const fecha = `${date.getFullYear()}-${
      date.getMonth() + 1
    }-${date.getDate()}`;
    const query = `INSERT INTO publicaciones (titulo, resumen, contenido, autor_id, fecha_hora)
      VALUES (${connection.escape(req.body.titulo)},
      ${connection.escape(req.body.resumen)},
      ${connection.escape(req.body.contenido)},
      ${connection.escape(req.session.usuario.id)},
      ${connection.escape(fecha)})`;
    connection.query(query, (err, rows, fields) => {
      req.flash("mensaje", "Publicacion agregada");
      res.redirect("/admin/index");
    });
    connection.release();
  });
});

router.get("/admin/editar/:id", (req, res) => {
  pool.getConnection((err, connection) => {
    const query = `SELECT * FROM publicaciones WHERE id = ${connection.escape(
      req.params.id
    )} AND autor_id = ${connection.escape(req.session.usuario.id)}`;
    connection.query(query, (error, rows, fields) => {
      if (rows.length > 0) {
        res.render("pages/admin/editar", {
          publicacion: rows[0],
          mensaje: req.flash("mensaje"),
          usuario: req.session.usuario,
        });
      } else {
        res.flash("mensaje", "Operación no permitida");
        res.redirect("/admin/index");
      }
    });
    connection.release();
  });
});

router.post("/admin/procesar-editar", (req, res) => {
  pool.getConnection((err, connection) => {
    const query = `
        UPDATE publicaciones
        SET
        titulo = ${connection.escape(req.body.titulo)},
        resumen = ${connection.escape(req.body.resumen)},
        contenido = ${connection.escape(req.body.contenido)}
        WHERE
        id = ${connection.escape(req.body.id)}
        AND
        autor_id = ${connection.escape(req.session.usuario.id)}
      `;
    connection.query(query, (err, rows, fields) => {
      if (rows && rows.changedRows > 0) {
        req.flash("mensaje", "Publicación editada");
      } else {
        req.flash("mensaje", "Publicación no editada");
      }
      res.redirect("/admin/index");
    });
    connection.release();
  });
});

router.get("/admin/procesar-eliminar/:id", (req, res) => {
  pool.getConnection((err, connection) => {
    const query = `
        DELETE
        FROM
        publicaciones
        WHERE
        id = ${connection.escape(req.params.id)}
        AND
        autor_id = ${connection.escape(req.session.usuario.id)}
      `;
    connection.query(query, (err, rows, fields) => {
      if (rows && rows.affectedRows > 0) {
        req.flash("mensaje", "Publicación eliminada");
      } else {
        req.flash("mensaje", "Publicación no eliminada");
      }
      res.redirect("/admin/index");
    });
    connection.release();
  });
});

router.get("/admin/perfil", (req, res) => {
  res.render("pages/admin/perfil", {
    mensaje: req.flash("mensaje"),
    usuario: req.session.usuario,
  });
});

router.post("/admin/procesar-editar-usuario", (req, res) => {
  pool.getConnection((err, connection) => {
    const pseudonimo = req.body.pseudonimo.trim();
    const contrasena = req.body.contrasena;

    if (req.session.usuario.pseudonimo != pseudonimo) {
      const queryPseudonimo = `SELECT * FROM autores WHERE pseudonimo = ${connection.escape(
        pseudonimo
      )}`;
      connection.query(queryPseudonimo, (err, rows, fields) => {
        if (rows.length > 0) {
          req.flash("mensaje", "Pseudonimo duplicado");
          res.redirect("/admin/perfil");
        } else {
          const query = `UPDATE autores
                  SET pseudonimo = ${connection.escape(pseudonimo)},
                  contrasena = ${connection.escape(contrasena)}
                  WHERE id = ${connection.escape(req.session.usuario.id)}`;
              connection.query(query, (err, rows, fields) => {
                if (req.files && req.files.avatar) {
                  const archivoAvatar = req.files.avatar;
                  const id = req.session.usuario.id;
                  const nombreArchivo = `${id}${path.extname(
                    archivoAvatar.name
                  )}`;

                  archivoAvatar.mv(
                    `./public/avatars/${nombreArchivo}`,
                    (error) => {
                      const queryAvatar = `UPDATE autores SET avatar = ${connection.escape(
                        nombreArchivo
                      )} WHERE id = ${connection.escape(id)}`;
                      connection.query(queryAvatar, (err, rows, fields) => {
                        req.flash("mensaje", "Autor actualizado con Avatar");
                        res.redirect("/admin/index");
                      });
                    }
                  );
                } else {
                  req.flash("mensaje", "Autor actualizado");
                  res.redirect("/admin/index");
                }
              });
        }
      });
    } else {
      const query = `UPDATE autores
                  SET
                  contrasena = ${connection.escape(contrasena)}
                  WHERE id = ${connection.escape(req.session.usuario.id)}`;
      connection.query(query, (err, rows, fields) => {
        if (req.files && req.files.avatar) {
          const archivoAvatar = req.files.avatar;
          const id = req.session.usuario.id;
          const nombreArchivo = `${id}${path.extname(archivoAvatar.name)}`;

          archivoAvatar.mv(`./public/avatars/${nombreArchivo}`, (error) => {
            const queryAvatar = `UPDATE autores SET avatar = ${connection.escape(
              nombreArchivo
            )} WHERE id = ${connection.escape(id)}`;
            connection.query(queryAvatar, (err, rows, fields) => {
              req.flash("mensaje", "Autor actualizado con Avatar");
              res.redirect("/admin/index");
            });
          });
        } else {
          req.flash("mensaje", "Autor actualizado");
          res.redirect("/admin/index");
        }
      });
    }
    connection.release();
  });
});

router.get("/procesar-cerrar-sesion", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

module.exports = router;
