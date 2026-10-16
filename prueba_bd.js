const conexion = require("./conexion_mysql.js");

conexion.query("SHOW TABLES", function (error, filas) {
    if (error) {
        console.error("Error al consultar:", error.message);
        process.exitCode = 1;
    } else {
        console.log("Tablas encontradas:");
        console.table(filas);
    }

    conexion.end();
});