var express=require("express");
require("dotenv").config();
var jwt=require("jsonwebtoken");
const JWT_SECRET=process.env.JWT_SECRET;

var app = express();
app.listen(3000);
var conexionBD = require("./conexion_mysql.js");
app.use("/gestor", express.static("cliente_rest"));
app.use("/sanitario", express.static("cliente_rpc"));
app.use(express.json());
const ID_AREA = 2; // Área asignada por el profesor: Anestesiología

// COMPROBAR TOKEN
function comprobarToken(req, res, next){
    var cabecera = req.headers.authorization;
    // No se ha enviado token
    if(!cabecera){
        return res.status(401).json({
            error: "Token no proporcionado"
        });
    }
    // La cabecera llegará como:
    // Bearer eyJhbGciOiJIUzI1Ni...
    var partes = cabecera.split(" ");
    if(partes.length != 2 || partes[0] != "Bearer"){
        return res.status(401).json({
            error: "Formato de token incorrecto"
        });
    }
    var tokenRecibido = partes[1];
    jwt.verify(tokenRecibido, JWT_SECRET, function(error, datos){
        if(error){
            return res.status(403).json({
                error: "Token inválido o caducado"
            });
        }
        // Guardamos los datos contenidos en el JWT
        req.gestor = datos;
        // Token correcto: ejecutar el endpoint
        next();
    });
}

// UBICACIONES - PROTEGIDO
app.get("/api/ubicaciones", comprobarToken, function(req, res){
    conexionBD.query(
        "SELECT * FROM ubicaciones",
        function(error, datos){
            if(error){
                console.log(error);
                return res.status(500).json(
                    "Error en la base de datos"
                );
            }
            res.status(200).json(datos);
        }
    );
});

// CATEGORIAS - PROTEGIDO
app.get("/api/categorias", comprobarToken, function(req, res){
    conexionBD.query(
        "SELECT * FROM categorias",
        function(error, datos){
            if(error){
                console.log(error);
                return res.status(500).json(
                    "Error en la base de datos"
                );
            }
            res.status(200).json(datos);
        }
    );
});

// MODELOS - PROTEGIDO
app.get("/api/modelos", comprobarToken, function(req, res){
    conexionBD.query(
        "SELECT * FROM modelos",
        function(error, datos){
            if(error){
                console.log(error);
                return res.status(500).json(
                    "Error en la base de datos"
                );
            }
            res.status(200).json(datos);
        }
    );
});

// OBTENER GESTOR - PROTEGIDO
app.get("/api/gestores/:id", comprobarToken, function(req, res){
    var id = req.params.id;
    conexionBD.query(
        "SELECT id, nombre, apellidos, usuario FROM gestores WHERE id = ?",
        [id],
        function(error, datos){
            if(error){
                console.log(error);
                return res.status(500).json(
                    "Error en la base de datos"
                );
            }
            if(datos.length == 0){
                return res.status(404).json(
                    "No encontrado el usuario gestor."
                );
            }
            res.status(200).json(datos[0]);
        }
    );
});

// CAMBIAR SANITARIO POR ID
// NO SE PROTEGE CON JWT DEL GESTOR
app.get("/api/sanitarios/:id", function(req, res){
    var id = req.params.id;
    conexionBD.query(
        "SELECT id, nombre, apellidos, usuario FROM sanitarios WHERE id = ?",
        [id],
        function(error, datos){
            if(error){
                console.log(error);
                return res.status(500).json(
                    "Error en la base de datos"
                );
            }
            if(datos.length == 0){
                return res.status(404).json(
                    "No encontrado el sanitario."
                );
            }
            res.status(200).json(datos[0]);
        }
    );
});

// OBTENER UN RECURSO - PROTEGIDO
app.get("/api/recursos/:id", comprobarToken, function(req, res){
    var id = req.params.id;
    conexionBD.query(
        "SELECT * FROM recursos WHERE id = ?",
        [id],
        function(error, datos){
            if(error){
                console.log(error);
                return res.status(500).json(
                    "Error en la base de datos"
                );
            }
            if(datos.length == 0){
                return res.status(404).json(
                    "No se ha encontrado el recurso."
                );
            }
            res.status(200).json(datos[0]);
        }
    );
});



// OBTENER RESERVAS DE UN RECURSO - PROTEGIDO

app.get("/api/recursos/:id/reservas",comprobarToken,function(req, res){
        var id = req.params.id;
        var sql = `
            SELECT
                r.id,
                CONCAT(s.nombre, ' ', s.apellidos) AS sanitario,
                r.horas_estimadas,
                r.fecha_peticion,
                r.fecha_inicio,
                r.fecha_fin
            FROM reservas r
            JOIN sanitarios s
                ON r.sanitario = s.id
            WHERE r.recurso = ?
        `;

        conexionBD.query(
            sql,
            [id],
            function(error, datos){
                if(error){
                    console.log(error);
                    return res.status(500).json(
                        "Error en la base de datos"
                    );
                }
                res.status(200).json(datos);
            }
        );
    }
);

// OBTENER RESEÑAS - PROTEGIDO

app.get(
    "/api/recursos/:id/resenyas",
    comprobarToken,
    function(req, res){
        var id = req.params.id;
        var sql = `
            SELECT
                r.fecha,
                CONCAT(s.nombre, ' ', s.apellidos) AS sanitario,
                r.valor,
                r.descripcion
            FROM resenyas r
            JOIN sanitarios s
                ON r.sanitario = s.id
            WHERE r.recurso = ?
        `;

        conexionBD.query(
            sql,
            [id],
            function(error, datos){
                if(error){
                    console.log(error);
                    return res.status(500).json(
                        "Error en la base de datos"
                    );
                }
                res.status(200).json(datos);
            }
        );
    }
);

// FILTRADO DE RECURSOS - PROTEGIDO
app.get("/api/recursos", comprobarToken, function(req, res){

    var categoria = req.query.categoria;
    var modelo = req.query.modelo;
    var ubicacion = req.query.ubicacion;
    var estado = req.query.estado;

    var sql = `
        SELECT r.*
        FROM recursos r
        JOIN modelos m ON r.modelo = m.id
        WHERE 1=1
    `;

    var parametros = [];

    if(ubicacion != "Todos"){

        sql += " AND r.ubicacion = ?";
        parametros.push(ubicacion);

    }

    if(estado != "Todos"){

        sql += " AND r.estado = ?";
        parametros.push(estado);

    }

    if(modelo != "Todos"){

        sql += " AND r.modelo = ?";
        parametros.push(modelo);

    }

    if(categoria != "Todos"){

        sql += " AND m.categoria = ?";
        parametros.push(categoria);

    }

    conexionBD.query(

        sql,

        parametros,

        function(error, datos){

            if(error){

                console.log(error);

                return res.status(500).json(
                    "Error en la base de datos"
                );

            }

            res.status(200).json(datos);

        }
    );

});



// CREAR GESTOR: INSERT
// SE DEJA PÚBLICO PORQUE ES EL REGISTRO ANTES DEL LOGIN

app.post("/api/gestores", function(req, res){

    var sql = `
        INSERT INTO gestores
        (nombre, apellidos, usuario, password)
        VALUES (?, ?, ?, ?)
    `;

    conexionBD.query(

        sql,

        [
            req.body.nombre,
            req.body.apellidos,
            req.body.usuario,
            req.body.password
        ],

        function(error, resultado){

            if(error){

                if(error.code == "ER_DUP_ENTRY"){

                    return res.status(404).json(
                        "Usuario no valido"
                    );

                }

                console.log(error);

                return res.status(500).json(
                    "Error en la base de datos"
                );

            }

            res.status(201).json(
                "Gestor creado"
            );

        }
    );

});

// LOGIN DEL GESTOR
// NO SE PROTEGE: AQUÍ ES DONDE SE OBTIENE EL TOKEN

app.post("/api/gestores/login", function(req, res){
    var usuario = req.body.usuario;
    var password = req.body.password;
    conexionBD.query(
        {
            sql: "SELECT * FROM gestores WHERE usuario = ?",
            timeout: 8000
        },
        [usuario],
        function(error, datos){
            if(error){
                console.log(error);
                return res.status(503).json({
                    error: "No se puede consultar MySQL."
                });
            }
            if(datos.length == 0){
                return res.status(403).json({
                    error: "No existe este usuario."
                });
            }
            var gestor = datos[0];
            if(gestor.password != password){
                return res.status(403).json({
                    error: "Credenciales inválidas"
                });
            }
            // CREAR TOKEN JWT
            var token = jwt.sign(
                { id: gestor.id },
                JWT_SECRET,
                { expiresIn: "2h" }
            );
            // DEVOLVER ID + TOKEN
            return res.status(200).json({
                id: gestor.id,
                token: token
            });
        }
    );
});
// CREAR RECURSO - PROTEGIDO

app.post("/api/recursos", comprobarToken, function(req, res){
    var estado = parseInt(req.body.estado);
    if(estado != 0 && estado != 1 && estado != 2){
        return res.status(400).json(
            "Estado inválido"
        );
    }
    var sql = `
        INSERT INTO recursos
        (modelo, ubicacion, numero_serie, estado)
        VALUES (?, ?, ?, ?)
    `;
    conexionBD.query(
        sql,
        [
            parseInt(req.body.modelo),
            parseInt(req.body.ubicacion),
            req.body.numero_serie,
            estado
        ],
        function(error, resultado){
            if(error){
                if(error.code == "ER_DUP_ENTRY"){
                    return res.status(400).json(
                        "Número de serie ya existente"
                    );
                }
                console.log(error);
                return res.status(500).json(
                    "Error en la base de datos"
                );
            }
            res.status(201).json(
                "Recurso creado"
            );
        }
    );
});

app.delete("/api/recursos/:id",comprobarToken,function(req, res){
        var id = req.params.id;
        conexionBD.query(
            "DELETE FROM recursos WHERE id = ?",
            [id],
            function(error, resultado){
                if(error){
                    console.log(error);
                    return res.status(500).json(
                        "Error en la base de datos"
                    );
                }
                if(resultado.affectedRows == 0){
                    return res.status(404).json(
                        "No se ha encontrado el recurso con id: " + id
                    );
                }
                res.status(200).json(
                    "El recurso con identificador: " +
                    id +
                    " ha sido eliminado"
                );
            }
        );
    }
);
// ACTUALIZAR GESTOR - PROTEGIDO

app.put("/api/gestores/:id",comprobarToken,function(req, res){
        var id = req.params.id;
        var sql = `
            UPDATE gestores
            SET nombre = ?,
                apellidos = ?,
                usuario = ?,
                password = ?
            WHERE id = ?
        `;
        conexionBD.query(
            sql,
            [
                req.body.nombre,
                req.body.apellidos,
                req.body.usuario,
                req.body.password,
                id
            ],
            function(error, resultado){
                if(error){
                    if(error.code == "ER_DUP_ENTRY"){
                        return res.status(400).json({
                            error: "Usuario ya existe"
                        });
                    }
                    console.log(error);
                    return res.status(500).json(
                        "Error en la base de datos"
                    );
                }
                if(resultado.affectedRows == 0){
                    return res.status(404).json(
                        "No se ha actualizado la información."
                    );
                }
                res.status(201).json(
                    "Se han actualizado los datos."
                );
            }
        );
    }
);
// ACTUALIZAR RECURSO - PROTEGIDO

app.put("/api/recursos/:id",comprobarToken,function(req, res){
        var id = req.params.id;
        var sql = `
            UPDATE recursos
            SET numero_serie = ?,
                modelo = ?,
                ubicacion = ?,
                estado = ?
            WHERE id = ?
        `;
        conexionBD.query(
            sql,
            [
                req.body.numero_serie,
                req.body.modelo,
                req.body.ubicacion,
                req.body.estado,
                id
            ],
            function(error, resultado){

                if(error){
                    if(error.code == "ER_DUP_ENTRY"){
                        return res.status(400).json({
                            error: "Número de serie ya existe."
                        });
                    }
                    console.log(error);
                    return res.status(500).json(
                        "Error en la base de datos"
                    );
                }
                if(resultado.affectedRows == 0){
                    return res.status(404).json(
                        "No se ha encontrado el recurso."
                    );
                }
                res.status(201).json(
                    "Se han actualizado los datos."
                );

            }
        );

    }
);



// CREAR PARTE DE MANTENIMIENTO - PROTEGIDO

app.post("/api/partes_mantenimiento",comprobarToken,function(req, res){
        var descripcion = req.body.descripcion;
        var gestor = req.body.gestor;
        var recurso = req.body.recurso;
        if(!descripcion || !gestor || !recurso){
            return res.status(400).json(
                "Faltan datos para crear el parte"
            );
        }
        var sql =
            "INSERT INTO partes_mantenimiento " +
            "(fecha_creacion, texto_averia, gestor, recurso) " +
            "VALUES (NOW(), ?, ?, ?)";
        conexionBD.query(
            sql,
            [descripcion, gestor, recurso],
            function(error, resultado){
                if(error){
                    console.log(error);
                    return res.status(500).json(
                        "Error al crear el parte"
                    );
                }
                return res.status(201).json(
                    "Parte creado correctamente"
                );
            }
        );
    }
);
// OBTENER PARTES DE UN RECURSO - PROTEGIDO

app.get("/api/recursos/:id/partes_mantenimiento",comprobarToken,function(req, res){
        var idRecurso = req.params.id;
        var sql =
            "SELECT * FROM partes_mantenimiento " +
            "WHERE recurso = ?";
        conexionBD.query(
            sql,
            [idRecurso],
            function(error, datos){
                if(error){
                    return res.status(500).json(
                        "Error en la base de datos"
                    );
                }
                return res.status(200).json(datos);
            }
        );
    }
);



// ACTUALIZAR PARTE - PROTEGIDO

app.put( "/api/partes_mantenimiento/:id", comprobarToken,function(req, res){
        var id = req.params.id;
        var descripcion = req.body.descripcion;
        if(!descripcion){
            return res.status(400).json(
                "Falta la descripción"
            );
        }
        var sql =
            "UPDATE partes_mantenimiento " +
            "SET texto_averia = ? " +
            "WHERE id = ?";
        conexionBD.query(
            sql,
            [descripcion, id],

            function(error, resultado){

                if(error){

                    return res.status(500).json(
                        "Error en la base de datos"
                    );

                }
                return res.status(200).json(
                    "Parte actualizado correctamente"
                );
            }
        );

    }
);



// OBTENER LAS RESERVAS PARA ENVIARLAS AL MINISTERIO - PROTEGIDO

app.get("/api/reservas/ministerio",comprobarToken,function(req, res){
        var sql = `
            SELECT
                s.nombre,
                s.apellidos,
                c.nombre AS categoría,
                r.horas_estimadas,
                r.fecha_peticion AS fec_pet,
                r.fecha_inicio AS fec_ini,
                r.fecha_fin
            FROM reservas r
            JOIN sanitarios s ON r.sanitario = s.id
            JOIN recursos rec ON r.recurso = rec.id
            JOIN modelos m ON rec.modelo = m.id
            JOIN categorias c ON m.categoria = c.id
            ORDER BY r.id
        `;
        conexionBD.query(
            sql,
            function(error, datos){

                if(error){

                    console.log(error);

                    return res.status(500).json(
                        "No se pudieron obtener las reservas."
                    );

                }

                res.status(200).json(datos);

            }
        );

    }
);



// CONSULTAR LAS RESERVAS Y ENVIARLAS AL MINISTERIO - PROTEGIDO

app.post("/api/ministerio/enviar",comprobarToken,function(req, res){
        var sql = `
            SELECT
                s.nombre,
                s.apellidos,
                c.nombre AS categoría,
                r.horas_estimadas,
                r.fecha_peticion AS fec_pet,
                r.fecha_inicio AS fec_ini,
                r.fecha_fin
            FROM reservas r
            JOIN sanitarios s ON r.sanitario = s.id
            JOIN recursos rec ON r.recurso = rec.id
            JOIN modelos m ON rec.modelo = m.id
            JOIN categorias c ON m.categoria = c.id
            ORDER BY r.id
        `;
        conexionBD.query(
            sql,
            async function(error, datos){

                if(error){

                    return res.status(500).send(
                        "Error al consultar las reservas."
                    );

                }
                if(datos.length === 0){

                    return res.status(400).send(
                        "No hay reservas."
                    );
                }
                var hoy = new Date();
                var fecha =
                    hoy.getFullYear() +
                    "-" +
                    String(hoy.getMonth() + 1).padStart(2, "0") +
                    "-" +
                    String(hoy.getDate()).padStart(2, "0");
                try {
                    var respuesta = await fetch(
                        "https://undefined.ua.es/telemedicina/api/datos",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                id_area: ID_AREA,
                                fecha: fecha,
                                datos: datos
                            }),
                            signal: AbortSignal.timeout(15000)
                        }
                    );
                    if(!respuesta.ok){
                        return res.status(502).send(
                            "Envío no confirmado: HTTP " +
                            respuesta.status +
                            ". Revisa los datos publicados antes de repetir."
                        );
                    }
                    res.json(
                        "Enviadas " +
                        datos.length +
                        " reservas del área 2."
                    );
                } catch(error){
                    res.status(502).send(
                        "No se pudo confirmar el envío. " +
                        "Revisa los datos publicados antes de repetir."
                    );
                }
            }
        );
    }
);
// PARA HACER EL RANKING
// Consultar los datos publicados en el Ministerio.
// El servidor pide al Ministerio todos los envíos publicados
// y devuelve esa información al navegador.

// PROTEGIDO

app.get("/api/ministerio/datos",comprobarToken,async function(req, res){
        try {
            var respuesta = await fetch(
                "https://undefined.ua.es/telemedicina/api/datos",
                {
                    signal: AbortSignal.timeout(15000)
                }
            );
            if(!respuesta.ok){
                return res.status(502).json(
                    "Error al consultar el Ministerio."
                );
            }
            var datos = await respuesta.json();
            res.json(datos);
        } catch(error){
            console.log("ERROR MINISTERIO:", error);
            res.status(502).json("No se pudo conectar con el Ministerio.");
        }

    }
);
