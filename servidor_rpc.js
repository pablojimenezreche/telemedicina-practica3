var rpc = require("./rpc.js");
var conexionBD = require("./conexion_mysql.js");

var servidor = rpc.server(3501, function() {
    console.log("Servidor RPC escuchando en http://localhost:3501");
});
// El callback es la función que se usa para devolver el resultado cuando
// termina una operación asíncrona (una consulta mysql)


function obtenerCategorias(callback){

    conexionBD.query(
        "SELECT * FROM categorias",
        function(error, datos){

            if(error){
                console.log(error);
                return callback(null);
            }

            return callback(datos);
        }
    );
}


function obtenerModelos(callback){

    conexionBD.query(
        "SELECT * FROM modelos",
        function(error, datos){

            if(error){
                console.log(error);
                return callback(null);
            }

            return callback(datos);
        }
    );
}

function loginSanitario(usuario, password, callback){

    if(!usuario || !password){
        return callback(null);
    }

    conexionBD.query(
        "SELECT id FROM sanitarios WHERE usuario = ? AND password = ?",
        [usuario, password],
        function(error, datos){

            if(error){
                console.log(error);
                return callback(null);
            }

            if(datos.length == 0){
                return callback(null);
            }

            return callback(datos[0].id);
        }
    );
}

// CREAR SANITARIO
function crearSanitario(datosSanitario, callback){

    var nombre = datosSanitario.nombre;
    var apellidos = datosSanitario.apellidos;
    var usuario = datosSanitario.usuario;
    var password = datosSanitario.password;

    if(!nombre || !apellidos || !usuario || !password){
        return callback(null);
    }

    var sql = `
        INSERT INTO sanitarios
        (nombre, apellidos, usuario, password)
        VALUES (?, ?, ?, ?)
    `;

    conexionBD.query(
        sql,
        [nombre, apellidos, usuario, password],
        function(error, datos){

            if(error){

                console.log(error);

                // Por ejemplo usuario repetido
                return callback(null);
            }

            return callback(datos.insertId);
        }
    );
}

function obtenerReservas(idSanitario, callback){
    conexionBD.query(
        "SELECT * FROM reservas WHERE sanitario = ? ORDER BY fecha_peticion",
        [idSanitario],
        function(error, datos){

            if(error){
                console.log(error);
                return callback(null);
            }

            return callback(datos);
        }
    );
}

function obtenerResenyas(idRecurso, callback){

    conexionBD.query(
        "SELECT * FROM resenyas WHERE recurso = ? ORDER BY id",
        [idRecurso],
        function(error, datos){

            if(error){
                console.log(error);
                return callback(null);
            }

            return callback(datos);
        }
    );
}

function crearResenya(idRecurso,idSanitario, valoracion, descripcion,callback){

    if(valoracion < 1 || valoracion > 5){
        return callback(null);
    }

    var sql = `
        INSERT INTO resenyas
        (recurso, sanitario, fecha, valor, descripcion)
        VALUES (?, ?, NOW(), ?, ?)
    `;

    conexionBD.query(
        sql,
        [idRecurso,idSanitario,valoracion,descripcion],
        function(error, datos){

            if(error){
                console.log(error);
                return callback(null);
            }

            return callback(datos.insertId);
        }
    );
}
//FUNCIÓN DEL EXAMEN

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function actualizarSanitario(idSanitario,datosSanitario,callback){

    var sql = `
        UPDATE sanitarios
        SET nombre = ?,
            apellidos = ?,
            usuario = ?,
            password = ?
        WHERE id = ?
    `;

    conexionBD.query(
        sql,
        [
            datosSanitario.nombre,
            datosSanitario.apellidos,
            datosSanitario.usuario,
            datosSanitario.password,
            idSanitario
        ],
        function(error, datos){

            if(error){

                console.log(error);

                if(error.code == "ER_DUP_ENTRY"){ //valor duplicado en una columna que tiene que ser única
                    return callback("Usuario repetido u otro problema" );
                }

                return callback("Usuario repetido u otro problema");
            }

            if(datos.affectedRows == 0){
                return callback("Sanitario no encontrado");
            }

            return callback("Sanitario actualizado");
        }
    );
}


function obtenerSanitario(idSanitario, callback){

    conexionBD.query(
        `
        SELECT id, nombre, apellidos, usuario
        FROM sanitarios
        WHERE id = ?`,
        [idSanitario],
        function(error, datos){

            if(error){
                console.log(error);
                return callback(null);
            }

            if(datos.length == 0){
                return callback(null);
            }

            return callback(datos[0]);
        }
    );
}


function obtenerRecursos(idModelo, callback){
    conexionBD.query(
        `
        SELECT *
        FROM recursos
        WHERE modelo = ?
        AND estado = 0
        `,
        [idModelo],
        function(error, datos){

            if(error){
                console.log(error);
                return callback(null);
            }
            return callback(datos);
        }
    );
}


function cancelarReserva(idReserva, callback){
    conexionBD.query(
        "DELETE FROM reservas WHERE id = ?",
        [idReserva],
        function(error, datos){

            if(error){
                console.log(error);
                return callback(null);
            }

            if(datos.affectedRows == 0){
                return callback(null);
            }
            return callback("Reserva eliminada");
        }
    );
}

function iniciarReserva(idReserva, callback){
    conexionBD.query(
        `
        UPDATE reservas
        SET fecha_inicio = NOW()
        WHERE id = ?
        AND fecha_inicio IS NULL
        `,
        [idReserva],
        function(error, datos){

            if(error){
                console.log(error);
                return callback(null);
            }

            if(datos.affectedRows == 0){
                return callback("Reserva no encontrada.");
            }
            return callback("Reserva iniciada.");
        }
    );
}

function finalizarReserva(idReserva, callback){
    conexionBD.query(
        "SELECT * FROM reservas WHERE id = ?",
        [idReserva],
        function(error, datos){

            if(error){
                console.log(error);
                return callback(null);
            }

            if(datos.length == 0){
                return callback(
                    "No se ha encontrado la reserva."
                );
            }

            var reserva = datos[0];

            if(reserva.fecha_fin != null){
                return callback(
                    "La reserva ya está finalizada"
                );
            }

            conexionBD.query(
                `
                UPDATE reservas
                SET fecha_fin = NOW()
                WHERE id = ?
                `,
                [idReserva],
                function(error){

                    if(error){
                        console.log(error);
                        return callback(null);
                    }

                    return callback(
                        "Se ha finalizado la reserva con id: " +
                        idReserva
                    );
                }
            );
        }
    );
}

function reservarRecurso(idRecurso,idSanitario,horas,callback){

    var sql = `
        SELECT
            r.id,
            r.estado,
            m.horas_maximas
        FROM recursos r
        JOIN modelos m
            ON r.modelo = m.id
        WHERE r.id = ?
    `;

    conexionBD.query(
        sql,
        [idRecurso],
        function(error, datos){

            if(error){
                console.log(error);
                return callback(null);
            }

            if(datos.length == 0){
                return callback("Recurso no encontrado.");
            }

            var recurso = datos[0];

            if(horas > recurso.horas_maximas){
                return callback(
                    "Has sobrepasado las horas máximas del modelo."
                );
            }

            if(recurso.estado != 0){
                return callback(null);
            }

            var sqlReserva = `
                INSERT INTO reservas
                (
                    recurso,
                    sanitario,
                    horas_estimadas,
                    fecha_peticion,
                    fecha_inicio,
                    fecha_fin
                )
                VALUES (?, ?, ?, NOW(), NULL, NULL)
            `;

            conexionBD.query(
                sqlReserva,
                [
                    idRecurso,
                    idSanitario,
                    horas
                ],
                function(error, resultado){

                    if(error){
                        console.log(error);
                        return callback(null);
                    }

                    return callback(resultado.insertId);
                }
            );
        }
    );
}


function tiempoPendiente(idRecurso,idReserva,callback){
    conexionBD.query(
        `SELECT * FROM reservas WHERE recurso = ?
        ORDER BY fecha_peticion ASC
        `,
        [idRecurso],
        function(error, reservasRecurso){

            if(error){
                console.log(error);
                return callback(null);
            }

            if(reservasRecurso.length == 0){
                return callback(0);
            }

            var ahora = new Date();
            var tiempoAcumulado = 0;

            for(var i = 0; i < reservasRecurso.length; i++){
                var reserva = reservasRecurso[i];
                /*
                 Si hemos llegado a la reserva que
                 queremos estudiar, devolvemos lo
                 acumulado anteriormente.
                */
                if(reserva.id == idReserva){

                    return callback(
                        Math.round(tiempoAcumulado * 100) / 100);
                }
                /*
                 Reserva actualmente en curso
                */
                if(reserva.fecha_inicio != null && reserva.fecha_fin == null){
                    var horasTranscurridas = (ahora - new Date(reserva.fecha_inicio) ) / (1000 * 60 * 60);
                    var tiempoRestante = reserva.horas_estimadas - horasTranscurridas;
                    if(tiempoRestante > 0){
                        tiempoAcumulado += tiempoRestante;
                    }
                }
                /*
                 Reserva todavía pendiente
                */
                else if(reserva.fecha_inicio == null){
                    tiempoAcumulado += reserva.horas_estimadas;
                }
            }

            return callback(
                Math.round(tiempoAcumulado * 100) / 100
            );
        }
    );
}

function obtenerRecurso(idRecurso, callback){

    conexionBD.query(
        "SELECT * FROM recursos WHERE id = ?",
        [idRecurso],
        function(error, datos){

            if(error){
                console.log(error);
                return callback(null);
            }

            if(datos.length == 0){
                return callback(null);
            }

            return callback(datos[0]);
        }
    );
}

function obtenerUbicaciones(callback){
    conexionBD.query(
        "SELECT * FROM ubicaciones",
        function(error, datos){

            if(error){
                console.log(error);
                return callback(null);
            }

            return callback(datos);
        }
    );
}


var app = servidor.createApp("gestion_sanitarios"); // crear aplicación de RPC. Le pone un nombre. 

//Registramos los procedimientos. Este es el segundo paso.

app.registerAsync(cancelarReserva);
app.registerAsync(obtenerCategorias);
app.registerAsync(obtenerModelos);
app.registerAsync(loginSanitario);
app.registerAsync(crearSanitario);
app.registerAsync(obtenerReservas);
app.registerAsync(obtenerResenyas);
app.registerAsync(crearResenya);
app.registerAsync(actualizarSanitario);
app.registerAsync(obtenerSanitario);
app.registerAsync(obtenerRecursos);
app.registerAsync(finalizarReserva);
app.registerAsync(iniciarReserva);
app.registerAsync(reservarRecurso);
app.registerAsync(tiempoPendiente);
app.registerAsync(obtenerRecurso);
app.registerAsync(obtenerUbicaciones);

//GESTIONAR RECURSO NFC
