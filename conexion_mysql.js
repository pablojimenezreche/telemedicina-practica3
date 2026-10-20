var mysql = require("mysql");

// El pool permite volver a conectar si MySQL se reinicia.
var conexionBD = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "telemedicina2026",
    connectionLimit: 5,
    connectTimeout: 8000,
    acquireTimeout: 8000
});

conexionBD.getConnection(function(error, conexion) {

    if (error) {
        console.log("ERROR al conectar con MySQL:");
        console.log(error);
    }
    else {
        conexion.release();
        console.log("Conexión con MySQL correcta");
    }

});

module.exports = conexionBD;

