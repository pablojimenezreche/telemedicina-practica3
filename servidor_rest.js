var path=require("path");
var express=require("express");
require("dotenv").config();
var jwt=require("jsonwebtoken");
var {Pool}=require("pg");

const JWT_SECRET=process.env.JWT_SECRET;

var conexionBD=new Pool({
    connectionString:process.env.DATABASE_URL,
    ssl:{
        rejectUnauthorized:false
    }
});

conexionBD.query("SELECT NOW()",function(error,resultado){
    if(error){
        console.log("ERROR al conectar con PostgreSQL:");
        console.log(error);
    }else{
        console.log("Conexión con PostgreSQL correcta");
    }
});

var app=express();
//PARA RENDER
var PORT=process.env.PORT||3000;

app.listen(PORT,"0.0.0.0",function(){
    console.log("Servidor REST escuchando en puerto "+PORT);
});

app.use("/gestor",express.static(path.join(__dirname,"cliente_rest")));
// app.use("/sanitario",express.static("cliente_rpc"));
app.use(express.json());



// COMPROBAR TOKEN
function comprobarToken(req,res,next){
    var cabecera=req.headers.authorization;
    if(!cabecera){
        return res.status(401).json({
            error:"Token no proporcionado"
        });
    }

    var partes=cabecera.split(" ");

    if(partes.length!=2||partes[0]!="Bearer"){
        return res.status(401).json({
            error:"Formato de token incorrecto"
        });
    }

    var tokenRecibido=partes[1];

    jwt.verify(tokenRecibido,JWT_SECRET,function(error,datos){
        if(error){
            return res.status(403).json({
                error:"Token inválido o caducado"
            });
        }

        req.gestor=datos;
        next();
    });
}


// UBICACIONES
app.get("/api/ubicaciones",comprobarToken,function(req,res){
    conexionBD.query(
        "SELECT * FROM ubicaciones",
        function(error,resultado){
            if(error){
                console.log(error);
                return res.status(500).json(
                    "Error en la base de datos"
                );
            }

            var datos=resultado.rows;
            res.status(200).json(datos);
        }
    );
});


// CATEGORIAS
app.get("/api/categorias",comprobarToken,function(req,res){
    conexionBD.query(
        "SELECT * FROM categorias",
        function(error,resultado){
            if(error){
                console.log(error);
                return res.status(500).json(
                    "Error en la base de datos"
                );
            }

            var datos=resultado.rows;
            res.status(200).json(datos);
        }
    );
});


// MODELOS
app.get("/api/modelos",comprobarToken,function(req,res){
    conexionBD.query(
        "SELECT * FROM modelos",
        function(error,resultado){
            if(error){
                console.log(error);
                return res.status(500).json(
                    "Error en la base de datos"
                );
            }

            var datos=resultado.rows;
            res.status(200).json(datos);
        }
    );
});


// OBTENER GESTOR
app.get("/api/gestores/:id",comprobarToken,function(req,res){
    var id=req.params.id;

    conexionBD.query(
        "SELECT id,nombre,apellidos,usuario FROM gestores WHERE id=$1",
        [id],
        function(error,resultado){
            if(error){
                console.log(error);
                return res.status(500).json(
                    "Error en la base de datos"
                );
            }

            var datos=resultado.rows;

            if(datos.length==0){
                return res.status(404).json(
                    "No encontrado el usuario gestor."
                );
            }

            res.status(200).json(datos[0]);
        }
    );
});


// OBTENER SANITARIO
app.get("/api/sanitarios/:id",function(req,res){
    var id=req.params.id;

    conexionBD.query(
        "SELECT id,nombre,apellidos,usuario FROM sanitarios WHERE id=$1",
        [id],
        function(error,resultado){
            if(error){
                console.log(error);
                return res.status(500).json(
                    "Error en la base de datos"
                );
            }

            var datos=resultado.rows;

            if(datos.length==0){
                return res.status(404).json(
                    "No encontrado el sanitario."
                );
            }

            res.status(200).json(datos[0]);
        }
    );
});


// OBTENER UN RECURSO
app.get("/api/recursos/:id",comprobarToken,function(req,res){
    var id=req.params.id;

    conexionBD.query(
        "SELECT * FROM recursos WHERE id=$1",
        [id],
        function(error,resultado){
            if(error){
                console.log(error);
                return res.status(500).json(
                    "Error en la base de datos"
                );
            }

            var datos=resultado.rows;

            if(datos.length==0){
                return res.status(404).json(
                    "No se ha encontrado el recurso."
                );
            }

            res.status(200).json(datos[0]);
        }
    );
});


// RESERVAS DE UN RECURSO
app.get("/api/recursos/:id/reservas",comprobarToken,function(req,res){
    var id=req.params.id;

    var sql=`
        SELECT
            r.id,
            CONCAT(s.nombre,' ',s.apellidos) AS sanitario,
            r.horas_estimadas,
            r.fecha_peticion,
            r.fecha_inicio,
            r.fecha_fin
        FROM reservas r
        JOIN sanitarios s ON r.sanitario=s.id
        WHERE r.recurso=$1
    `;

    conexionBD.query(
        sql,
        [id],
        function(error,resultado){
            if(error){
                console.log(error);
                return res.status(500).json(
                    "Error en la base de datos"
                );
            }

            var datos=resultado.rows;
            res.status(200).json(datos);
        }
    );
});


// RESEÑAS
app.get("/api/recursos/:id/resenyas",comprobarToken,function(req,res){
    var id=req.params.id;

    var sql=`
        SELECT
            r.fecha,
            CONCAT(s.nombre,' ',s.apellidos) AS sanitario,
            r.valor,
            r.descripcion
        FROM resenyas r
        JOIN sanitarios s ON r.sanitario=s.id
        WHERE r.recurso=$1
    `;

    conexionBD.query(
        sql,
        [id],
        function(error,resultado){
            if(error){
                console.log(error);
                return res.status(500).json(
                    "Error en la base de datos"
                );
            }

            var datos=resultado.rows;
            res.status(200).json(datos);
        }
    );
});


// FILTRADO DE RECURSOS
app.get("/api/recursos",comprobarToken,function(req,res){
    var categoria=req.query.categoria;
    var modelo=req.query.modelo;
    var ubicacion=req.query.ubicacion;
    var estado=req.query.estado;

    var sql=`
        SELECT r.*
        FROM recursos r
        JOIN modelos m ON r.modelo=m.id
        WHERE 1=1
    `;

    var parametros=[];

    if(ubicacion!="Todos"){
        parametros.push(ubicacion);
        sql+=" AND r.ubicacion=$"+parametros.length;
    }

    if(estado!="Todos"){
        parametros.push(estado);
        sql+=" AND r.estado=$"+parametros.length;
    }

    if(modelo!="Todos"){
        parametros.push(modelo);
        sql+=" AND r.modelo=$"+parametros.length;
    }

    if(categoria!="Todos"){
        parametros.push(categoria);
        sql+=" AND m.categoria=$"+parametros.length;
    }

    conexionBD.query(
        sql,
        parametros,
        function(error,resultado){
            if(error){
                console.log(error);
                return res.status(500).json(
                    "Error en la base de datos"
                );
            }

            var datos=resultado.rows;
            res.status(200).json(datos);
        }
    );
});


// CREAR GESTOR
app.post("/api/gestores",function(req,res){
    var sql=`
        INSERT INTO gestores
        (nombre,apellidos,usuario,password)
        VALUES ($1,$2,$3,$4)
    `;

    conexionBD.query(
        sql,
        [
            req.body.nombre,
            req.body.apellidos,
            req.body.usuario,
            req.body.password
        ],
        function(error,resultado){
            if(error){
                if(error.code=="23505"){
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
app.post("/api/gestores/login",function(req,res){
    var usuario=req.body.usuario;
    var password=req.body.password;

    conexionBD.query(
        "SELECT * FROM gestores WHERE usuario=$1",
        [usuario],
        function(error,resultado){
            if(error){
                console.log(error);

                return res.status(503).json({
                    error:"No se puede consultar PostgreSQL."
                });
            }

            var datos=resultado.rows;

            if(datos.length==0){
                return res.status(403).json({
                    error:"No existe este usuario."
                });
            }

            var gestor=datos[0];

            if(gestor.password!=password){
                return res.status(403).json({
                    error:"Credenciales inválidas"
                });
            }

            var token=jwt.sign(
                {id:gestor.id},
                JWT_SECRET,
                {expiresIn:"2h"}
            );

            return res.status(200).json({
                id:gestor.id,
                token:token
            });
        }
    );
});


// CREAR RECURSO
app.post("/api/recursos",comprobarToken,function(req,res){
    var estado=parseInt(req.body.estado);

    if(estado!=0&&estado!=1&&estado!=2){
        return res.status(400).json(
            "Estado inválido"
        );
    }

    var sql=`
        INSERT INTO recursos
        (modelo,ubicacion,numero_serie,estado)
        VALUES ($1,$2,$3,$4)
    `;

    conexionBD.query(
        sql,
        [
            parseInt(req.body.modelo),
            parseInt(req.body.ubicacion),
            req.body.numero_serie,
            estado
        ],
        function(error,resultado){
            if(error){
                if(error.code=="23505"){
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


// ELIMINAR RECURSO
app.delete("/api/recursos/:id",comprobarToken,function(req,res){
    var id=req.params.id;

    conexionBD.query(
        "DELETE FROM recursos WHERE id=$1",
        [id],
        function(error,resultado){
            if(error){
                console.log(error);

                return res.status(500).json(
                    "Error en la base de datos"
                );
            }

            if(resultado.rowCount==0){
                return res.status(404).json(
                    "No se ha encontrado el recurso con id: "+id
                );
            }

            res.status(200).json(
                "El recurso con identificador: "+
                id+
                " ha sido eliminado"
            );
        }
    );
});


// ACTUALIZAR GESTOR
app.put("/api/gestores/:id",comprobarToken,function(req,res){
    var id=req.params.id;

    var sql=`
        UPDATE gestores
        SET nombre=$1,
            apellidos=$2,
            usuario=$3,
            password=$4
        WHERE id=$5
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
        function(error,resultado){
            if(error){
                if(error.code=="23505"){
                    return res.status(400).json({
                        error:"Usuario ya existe"
                    });
                }

                console.log(error);

                return res.status(500).json(
                    "Error en la base de datos"
                );
            }

            if(resultado.rowCount==0){
                return res.status(404).json(
                    "No se ha actualizado la información."
                );
            }

            res.status(201).json(
                "Se han actualizado los datos."
            );
        }
    );
});


// ACTUALIZAR RECURSO
app.put("/api/recursos/:id",comprobarToken,function(req,res){
    var id=req.params.id;

    var sql=`
        UPDATE recursos
        SET numero_serie=$1,
            modelo=$2,
            ubicacion=$3,
            estado=$4
        WHERE id=$5
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
        function(error,resultado){
            if(error){
                if(error.code=="23505"){
                    return res.status(400).json({
                        error:"Número de serie ya existe."
                    });
                }

                console.log(error);

                return res.status(500).json(
                    "Error en la base de datos"
                );
            }

            if(resultado.rowCount==0){
                return res.status(404).json(
                    "No se ha encontrado el recurso."
                );
            }

            res.status(201).json(
                "Se han actualizado los datos."
            );
        }
    );
});


// CREAR PARTE DE MANTENIMIENTO
app.post("/api/partes_mantenimiento",comprobarToken,function(req,res){
    var descripcion=req.body.descripcion;
    var gestor=req.body.gestor;
    var recurso=req.body.recurso;

    if(!descripcion||!gestor||!recurso){
        return res.status(400).json(
            "Faltan datos para crear el parte"
        );
    }

    var sql=
        "INSERT INTO partes_mantenimiento "+
        "(fecha_creacion,texto_averia,gestor,recurso) "+
        "VALUES (NOW(),$1,$2,$3)";

    conexionBD.query(
        sql,
        [descripcion,gestor,recurso],
        function(error,resultado){
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
});


// OBTENER PARTES
app.get("/api/recursos/:id/partes_mantenimiento",comprobarToken,function(req,res){
    var idRecurso=req.params.id;

    var sql=
        "SELECT * FROM partes_mantenimiento "+
        "WHERE recurso=$1";

    conexionBD.query(
        sql,
        [idRecurso],
        function(error,resultado){
            if(error){
                return res.status(500).json(
                    "Error en la base de datos"
                );
            }

            var datos=resultado.rows;

            return res.status(200).json(datos);
        }
    );
});


// ACTUALIZAR PARTE
app.put("/api/partes_mantenimiento/:id",comprobarToken,function(req,res){
    var id=req.params.id;
    var descripcion=req.body.descripcion;

    if(!descripcion){
        return res.status(400).json(
            "Falta la descripción"
        );
    }

    var sql=
        "UPDATE partes_mantenimiento "+
        "SET texto_averia=$1 "+
        "WHERE id=$2";

    conexionBD.query(
        sql,
        [descripcion,id],
        function(error,resultado){
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
});


