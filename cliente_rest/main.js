console.log("main cargado");
// EXAMEN, conectame con la app gestion_Fcrears que esta ejecutándose en el localhost

 //Dame acceso desde el cliente al procedimiento RCP totalPartes


const ubi_select =document.getElementById('ubicacion');
const mod_select = document.getElementById('modelo');
const est_select = document.getElementById('estado');
const cat_select = document.getElementById('categoria');

const ubi_select2 = document.getElementById('ubicacion_rec');
const mod_select2 = document.getElementById('modelo_rec');
const est_select2 = document.getElementById('estado_rec');
const cat_select2 = document.getElementById('categoria_rec');

const renyas_tabla = document.getElementById("lista_resenyas");
const reservas_tabla = document.getElementById("lista_reservas");

var recurso_actual_id = null;
// ws.js - cliente gestor
var conexionWS = null;
var nombre_gestor_ws = null;
var id_gestor_ws = null;
// AÑADIR LOS NOMBRES DE LAS ÁREAS DE SALUD
var areasMedicas = {
    1: "Alergología",
    2: "Anestesiología",
    3: "Cardiología",
    4: "Cirugía General",
    5: "Dermatología",
    6: "Aparato Digestivo",
    7: "Endocrinología",
    8: "Ginecología",
    9: "Hematología",
    10: "Medicina Interna",
    11: "Neumología",
    12: "Neurología",
    13: "Oftalmología",
    14: "Oncología",
    15: "Pediatría",
    16: "Psiquiatría",
    17: "Traumatología",
    18: "Urología"
};

var URL_MINISTERIO="https://undefined.ua.es/telemedicina/api/datos";
var ID_AREA=2;

function conectarWS(id, nombre) {
    id_gestor_ws = id;
    nombre_gestor_ws = nombre;

    conexionWS = new WebSocket("ws://localhost:4444", "avisos");

    conexionWS.addEventListener("open", function() {
        console.log("Ya estoy conectado con el servidor");
        // Identificarse como gestor
        conexionWS.send(JSON.stringify({
            operacion: "identificar",
            tipo: "gestor",
            id: id,
            nombre: nombre
        }));
    });

    conexionWS.addEventListener("message", function(msg) {
        var datos = JSON.parse(msg.data);
        if (datos.operacion === "aviso") {
            anyadirAviso(datos);
        }
    });
}

function desconectarWS() {
    if (conexionWS) {
        conexionWS.close();
        conexionWS = null;
    }
}

function anyadirAviso(datos) {
    var tabla = document.getElementById("lista_avisos");
    var fila = document.createElement("tr");

    if (datos.color === "verde") fila.style.backgroundColor = "#90ee90";
    else if (datos.color === "rojo") fila.style.backgroundColor = "#ff9999";
    else if (datos.color === "azul") fila.style.backgroundColor = "#9999ff";

    var tdFecha = document.createElement("td");
    tdFecha.textContent = datos.fecha;
    var tdOrigen = document.createElement("td");
    tdOrigen.textContent = datos.origen;
    var tdTexto = document.createElement("td");
    tdTexto.textContent = datos.texto;

    fila.appendChild(tdFecha);
    fila.appendChild(tdOrigen);
    fila.appendChild(tdTexto);
    tabla.appendChild(fila);
}

// Para enviar aviso de nuevo recurso (llamado desde main.js)
function wsAvisoNuevoRecurso(nombreCategoria, nombreModelo, codigoRecurso) {
    if (!conexionWS) return;
    conexionWS.send(JSON.stringify({
        operacion: "avisoNuevoRecurso",
        nombreCategoria: nombreCategoria,
        nombreModelo: nombreModelo,
        codigoRecurso: codigoRecurso,
        quien: nombre_gestor_ws
    }));
}
function wsAvisoDevolucion(){
    if(!conexionWS) return;
    conexionWS.send(JSON.stringify({
        operacion: "avisoDevolucion",
        quien: nombre_gestor_ws
    }))
}
document.addEventListener("DOMContentLoaded", function(){

    cargarCategorias();
    cargarModelos();
    cargarUbis();
    cargarEstados();
// para que los modelos se actualicen una vez elijamos categoría.
    cat_select.addEventListener("change", function(){
            actualizarModelos();
        });
    cat_select2.addEventListener("change", function(){
            actualizarModelos();
        });
// cuando se cargue todo el html, ejecutamos las funciones para cargar los selects de inicio.


});

function anyadir(){
    recurso_actual_id = null; // IMPORTANTE
    cambiarSeccion("recurso");

    document.getElementById("num_serie_rec").value = "";
    document.getElementById("modelo_rec").selectedIndex = 0;
    document.getElementById("categoria_rec").selectedIndex = 0;
    document.getElementById("ubicacion_rec").selectedIndex = 0;
    document.getElementById("estado_rec").selectedIndex = 0;
    document.getElementById("lista_reservas").innerHTML = "";
    document.getElementById("lista_resenyas").innerHTML = "";

    inicializarSelectsRecurso();
}


function inicializarSelectsRecurso() {
    // Rellenar categor�as (igual que en el selector principal)
    cat_select2.innerHTML = '<option value="">Seleccione categor�a</option>';
    categorias_lista.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.nombre;
        cat_select2.appendChild(opt);
    });
    
    // Rellenar ubicaciones
    ubi_select2.innerHTML = '<option value="">Seleccione ubicaci�n</option>';
    ubis_lista.forEach(u => {
        const opt = document.createElement("option");
        opt.value = u.id;
        opt.textContent = u.nombre;
        ubi_select2.appendChild(opt);
    });
    
    // Rellenar estados
    const estados = [
        { id: 0, nombre: "Operativo" },
        { id: 1, nombre: "De baja/defectuoso" },
        { id: 2, nombre: "En mantenimiento" },
    ];
    
    est_select2.innerHTML = '<option value="">Seleccione estado</option>';
    estados.forEach(e => {
        const option = document.createElement("option");
        option.value = e.id;
        option.textContent = e.nombre;
        est_select2.appendChild(option);
    });
    
    // Modelos vac�o inicialmente (se llenar� al seleccionar categor�a)
    mod_select2.innerHTML = '<option value="">Primero seleccione categor�a</option>';
}
//Para cargar los selects, el cliente necesita conocer las categorias, modelos, ubis...
function cargarCategorias(){
    rest.get("/api/categorias", function(estado,respuesta){
        if(estado == 200){
            categorias_lista = respuesta; //guardamos las categorías.
            rellenarCategorias();
        }
    });
}

function cargarModelos(){
    rest.get("/api/modelos", function(estado,respuesta){
        if(estado == 200){
            modelos_lista = respuesta; //guardamos los modelos.
        }
    });
}

function cargarUbis(){
    rest.get("/api/ubicaciones", function(estado,respuesta){
        if(estado == 200){
            ubis_lista = respuesta; //guardamos las ubicaciones.
            rellenarUbicaciones();
        }
    });
}
function cargarEstados() {

    const estados = [
        { id: 0, nombre: "Operativo" },
        { id: 1, nombre: "De baja/defectuoso" },
        { id: 2, nombre: "En mantenimiento" },

    ];

    est_select.innerHTML = '<option value="">Seleccione estado</option>';

    estados.forEach(e => {
        const option = document.createElement("option");
        option.value = e.id;
        option.textContent = e.nombre;
        est_select.appendChild(option);

    });
    const todos = document.createElement("option");
    todos.textContent = "Todos";
    todos.value = "Todos";
    est_select.appendChild(todos);
}

function rellenarCategorias(){
    // ponemos en el select un option "decorativo"
    cat_select.innerHTML = '<option value="">Seleccione categor�a</option>';
    categorias_lista.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.nombre;
        cat_select.appendChild(opt); //para cada categoria, creamos un option y lo añadimos al select.

    });
    const todos = document.createElement("option");
    todos.textContent = "Todos";
    todos.value = "Todos";
    cat_select.appendChild(todos);
}
//hacemos lo mismo con las ubis.
function rellenarUbicaciones(){
    ubi_select.innerHTML = '<option value="">Seleccione ubicaci�n</option>';
    ubis_lista.forEach(u => {
        const opt = document.createElement("option");
        opt.value = u.id;
        opt.textContent = u.nombre;
        ubi_select.appendChild(opt);


    });
    const todos = document.createElement("option");
    todos.textContent = "Todos";
    todos.value = "Todos";
    ubi_select.appendChild(todos); 
}
function actualizarModelos(){

    var categoriaSeleccionada = document.getElementById("categoria").value;
    var categoriaSeleccionada2 = document.getElementById("categoria_rec").value;
    mod_select.innerHTML = '<option value="">Seleccione modelo</option>';
    mod_select2.innerHTML = '<option value="">Seleccione modelo</option>';
    // ponemos en los selects los option de los modelos que pertenecen a las categorias seleccionadas.
    modelos_lista.forEach(m => {
        if(m.categoria == categoriaSeleccionada){
            var opt = document.createElement("option");
            opt.value = m.id;
            opt.textContent = m.nombre;
            mod_select.appendChild(opt);
        }
    });
    modelos_lista.forEach(m => {
        if(m.categoria == categoriaSeleccionada2){
            var opt = document.createElement("option");
            opt.value = m.id;
            opt.textContent = m.nombre;
            mod_select2.appendChild(opt);
        }
    })
    const todos = document.createElement("option");
    todos.textContent = "Todos";
    todos.value = "Todos";
    mod_select.appendChild(todos);
}

var seccionActual = "login";
var gestor_identificador = "";
var token = "";

    /*function entrar(){
        var usuario = document.getElementById("usuario").value;
    
    cambiarSeccion("menu-principal");
    }*/
    var modelos_lista =  [];
    var ubis_lista = [];
    var categorias_lista = [];
    var recurso = [];


function login() {
    var boton = document.getElementById("btn_entrar");
    var mensaje = document.getElementById("estado_login");
    if (boton.disabled) return;

    var gestor = {
        usuario: document.getElementById("usuario").value.trim(),
        password: document.getElementById("password").value
    };
    if (!gestor.usuario || !gestor.password) {
        mensaje.textContent = "Escribe el usuario y la contraseña.";
        return;
    }

    boton.disabled = true;
    mensaje.textContent = "Entrando…";
    rest.post("/api/gestores/login", gestor, function(estado, respuesta) {
        if (estado !== 200) {
            boton.disabled = false;
            mensaje.textContent = estado === 0
                ? "El servidor no responde. Comprueba que Node y MySQL estén iniciados."
                : (respuesta && respuesta.error) || "No se pudo iniciar sesión. Inténtalo de nuevo.";
            return;
        }

        gestor_identificador = respuesta.id;
        token = respuesta.token;
        rest.get("/api/gestores/" + gestor_identificador, function(estado, respuesta) {
            boton.disabled = false;
            if (estado !== 200) {
                gestor_identificador = "";
                mensaje.textContent = "No se pudieron cargar tus datos. Comprueba MySQL y vuelve a entrar.";
                return;
            }

            var nombreCompleto = respuesta.nombre + " " + (respuesta.apellidos || "");
            window.nombreGestorCompleto = nombreCompleto;
            document.getElementById("nombre_gestor").textContent = nombreCompleto;
            mensaje.textContent = "";
            cambiarSeccion("inicio");
            cargarModelos();
            cargarUbis();
            cargarCategorias();
            cargarEstados();
            conectarWS(gestor_identificador, nombreCompleto);
        });
    });
}
    function registro(){
    var gestor = {
        nombre: document.getElementById("nombre_reg").value,
        apellidos: document.getElementById("apellidos_reg").value,
        usuario: document.getElementById("usuario_reg").value,
        password: document.getElementById("contrasenya_reg").value,
    };

    if(gestor.nombre!="" && gestor.apellidos!="" && gestor.usuario!="" && gestor.password!=""){

    if(gestor_identificador === ""){ //no ha hecho nunca login, si lo hubiera hecho, tendría guardado el id.
        // REGISTRO NUEVO
        rest.post("/api/gestores", gestor, function (estado, respuesta) {
            console.log(respuesta)
            if (estado == 201) {
                cambiarSeccion("login");
            } else {
                alert("Error introduciendo nuevo gestor");
            }
        });
    } else { //si ya ha hecho login, haremos una modificación de datos, no creacion (put)
        // EDICI�N - Primero obtener los datos actuales del gestor. Para luego ver que vista ponemos.
        rest.get("/api/gestores/" + gestor_identificador, function(estado, respuesta) {
            if (estado == 200) {
                var gestorActual = respuesta;
                
                // Comparar usuario y contrase�a actuales con los nuevos
                var usuarioCambiado = (gestorActual.usuario !== gestor.usuario);
                var passwordCambiado = (gestorActual.password !== gestor.password); // Asumiendo que la respuesta incluye la password
                
                // Hacer la petici�n PUT para actualizar
                rest.put("/api/gestores/" + gestor_identificador, gestor, function (estado, respuesta) {
                    if (estado == 201) {
                        // Si cambi� usuario o contrase�a, redirigir a login
                        if (usuarioCambiado || passwordCambiado) {
                            alert("Usuario o contrase�a modificados. Por favor, inicie sesi�n nuevamente.");
                            gestor_identificador = ""; // Limpiar el identificador
                            cambiarSeccion("login");
                        } else {
                            // Si no cambiaron credenciales, volver al inicio
                            cambiarSeccion("inicio");
                        }
                    } else {
                        alert("Error editando gestor");
                    }
                });
            } else {
                alert("Error obteniendo datos del gestor");
            }
        });
    }
}
else{
    alert("Rellene todos los campos.");
    cambiarSeccion("datos_gestor");
}
}

    function cancelar(){
        if(gestor_identificador != ""){
            cambiarSeccion("inicio")
        }else{
            cambiarSeccion("login");
        }
    }
    
    function editar(){
        cambiarSeccion("datos_gestor");
    }
//TODO LO QUE DEPENDA DE LA RESPUESTA DEL SERVIDOR: TIENE QUE IR EN EL CALLBACK.
    function buscar(){
        console.log("entro a buscar");
        var num_serie = "";
        var categoria = document.getElementById("categoria").value;
        console.log(categoria);
        var modelo = document.getElementById("modelo").value;
        var ubicacion = document.getElementById("ubicacion").value;
        var estado = document.getElementById("estado").value
        console.log("numero serie")
        console.log("Entro en la función.")
        rest.get("/api/recursos?categoria="+categoria+"&modelo="+modelo+"&ubicacion="+ubicacion+"&estado="+estado,function(estado,respuesta){
        //le pedimos al servidor que nos devuelva la lista de recursos filtrada.
            var recursos_mostrar = respuesta;
            console.log("RECURSOS RECIBIDOS:", recursos_mostrar); // <-- A�ADE ESTO
            console.log("Primer recurso:", recursos_mostrar[0]);
            //tienen que ser iguales que los .query que hay en el servidor
            var lista = document.getElementById("lista_recursos");
            lista.innerHTML=""; // aquí no tiene un value (<tbody>value</tbody>), tiene contenido. 
            // tenemos que utilizar las funciones de carga para tener acceso a todos modelos , categorias y demás.
            for(var i = 0;i < recursos_mostrar.length;i++){
                var tr = document.createElement("tr"); //creamos una fila.
                var td_numserie = document.createElement("td"); //columna.
                td_numserie.textContent = recursos_mostrar[i].numero_serie; // podría poner directamente el que introduce.
                tr.appendChild(td_numserie);
                // MODELO + CATEGORIA
                var td_modelo = document.createElement("td");
                var td_categoria = document.createElement("td");

                var modelo_id = recursos_mostrar[i].modelo;
                var modelo_obj = null;

                // Buscar modelo UNA sola vez
                for(var j = 0; j < modelos_lista.length; j++){
                    if(modelos_lista[j].id == modelo_id){
                        modelo_obj = modelos_lista[j];
                }
            }

            if(modelo_obj != null){

                td_modelo.textContent = modelo_obj.nombre;

                // Buscar categoria
                for(var k = 0; k < categorias_lista.length; k++){
                    if(categorias_lista[k].id == modelo_obj.categoria){
                        td_categoria.textContent = categorias_lista[k].nombre;
                    }
                }
            }

            tr.appendChild(td_categoria);
            tr.appendChild(td_modelo);
                var td_ubi = document.createElement("td");
                var ubi_id = recursos_mostrar[i].ubicacion; // la respuesta nos da los ids, no el nombre.
                for(var j = 0; j < ubis_lista.length;j++){
                    if(ubi_id == ubis_lista[j].id){ //ids únicos.
                        td_ubi.textContent = ubis_lista[j].nombre;
                        console.log("entra en ubi");
                    }
                }
                tr.appendChild(td_ubi);
                var td_estado = document.createElement("td")
                var estado_id = recursos_mostrar[i].estado;
                if(estado_id == 0){
                    td_estado.textContent = "Operativo"
                }else if(estado_id == 1){
                    td_estado.textContent = "De baja/defectuoso."
                }else{
                    td_estado.textContent = "En mantenimiento"
                }
                tr.appendChild(td_estado);
                var boton_abrir = document.createElement("button")
                let identificador_recurso = recursos_mostrar[i].id;
                boton_abrir.addEventListener("click",function(){ //addEventListener se ejecuta con el click, y para ese momento el for ha acabado por tanto se guarda el id.
                    abrir(identificador_recurso);
                })
                boton_abrir.textContent = "Abrir";
                tr.appendChild(boton_abrir);
                var boton_eliminar = document.createElement("button")
                boton_eliminar.textContent = "X"
                boton_eliminar.addEventListener("click",function(){
                    eliminarRecurso(identificador_recurso);
                })
                tr.appendChild(boton_eliminar);


                lista.appendChild(tr);
            }
        })

    }
    function eliminarRecurso(id){
        rest.delete("/api/recursos/"+id,function(estado,respuesta){
            if(estado == 200){
                alert("Recurso eliminado");
                buscar();
            }else{
                console.log("ERrro")
            }

        })

        

    }

    

    function cambiarSeccion(seccion){
    document.getElementById(seccionActual).classList.remove("activa");
    document.getElementById(seccion).classList.add("activa");
    seccionActual=seccion;
    if (seccion === "inicio" && window.nombreGestorCompleto) {
        var nombreElement = document.getElementById("nombre_gestor");
        if (nombreElement) {
            nombreElement.textContent = window.nombreGestorCompleto;
        }
    }
    }
    function iniciar_registro(){ // al darle al botón solo queremos que cambie de vista.
        gestor_identificador = "";
        
        cambiarSeccion("datos_gestor");

        //LIMPIAMOS TODOS LOS CAMPOS
        document.getElementById("nombre_reg").value = "";
        document.getElementById("apellidos_reg").value = "";
        document.getElementById("usuario_reg").value = "";
        document.getElementById("contrasenya_reg").value = "";

    }
    function salir(){
        gestor_identificador = "";
        token = "";
        //LIMPIAMOS LOS CAMPOS
        document.getElementById("usuario").value = "";
        document.getElementById("password").value = "";
        desconectarWS(); // Cuando te salgas habrá que desconectarlo del WS.
        lista_avisos.innerHTML = ""; // Limpiar avisos al salir
        cambiarSeccion("login");
    }
 function abrir(id){
    var id_recurso = id;
    recurso_actual_id = id;
    cambiarSeccion("recurso");
    
    rest.get("/api/recursos/"+id, function(estado, respuesta){
        if(estado == 200){
            console.log(respuesta.numero_serie);
            
            // Limpiar todos los selects
            ubi_select2.innerHTML = "";
            cat_select2.innerHTML = "";
            mod_select2.innerHTML = "";
            est_select2.innerHTML = "";
            
            // Establecer el n�mero de serie
            document.getElementById("num_serie_rec").value = respuesta.numero_serie;
            
            // Encontrar la categor�a del modelo actual
            var categoria_actual = null;
            for(var i = 0; i < modelos_lista.length; i++){
                if(modelos_lista[i].id == respuesta.modelo){
                    categoria_actual = modelos_lista[i].categoria;
                    break;
                }
            }
            
            // 1. RELLENAR CATEGOR�AS (todas)
            for(var i = 0; i < categorias_lista.length; i++){
                var opt = document.createElement("option");
                opt.value = categorias_lista[i].id;
                opt.textContent = categorias_lista[i].nombre;
                
                // Marcar como selected si es la categor�a actual
                if(categorias_lista[i].id == categoria_actual){
                    opt.selected = true;
                }
                
                cat_select2.appendChild(opt);
            }
            
            // 2. RELLENAR MODELOS (todos los de la categor�a actual)
            for(var i = 0; i < modelos_lista.length; i++){
                if(modelos_lista[i].categoria == categoria_actual){
                    var opt = document.createElement("option");
                    opt.value = modelos_lista[i].id;
                    opt.textContent = modelos_lista[i].nombre;
                    
                    // Marcar como selected si es el modelo actual
                    if(modelos_lista[i].id == respuesta.modelo){
                        opt.selected = true;
                    }
                    
                    mod_select2.appendChild(opt);
                }
            }
            
            // 3. RELLENAR UBICACIONES (todas)
            for(var i = 0; i < ubis_lista.length; i++){
                var opt = document.createElement("option");
                opt.value = ubis_lista[i].id;
                opt.textContent = ubis_lista[i].nombre;
                
                // Marcar como selected si es la ubicaci�n actual
                if(ubis_lista[i].id == respuesta.ubicacion){
                    opt.selected = true;
                }
                
                ubi_select2.appendChild(opt);
            }
            
            // 4. RELLENAR ESTADOS (todos)
            var estados_aux = [
                {id: 0, nombre: "Operativo"},
                {id: 1, nombre: "De baja/defectuoso"},
                {id: 2, nombre: "En mantenimiento"}
            ];
            
            for(var i = 0; i < estados_aux.length; i++){
                var opt = document.createElement("option");
                opt.value = estados_aux[i].id;
                opt.textContent = estados_aux[i].nombre;
                
                // Marcar como selected si es el estado actual
                if(estados_aux[i].id == respuesta.estado){
                    opt.selected = true;
                }
                
                est_select2.appendChild(opt);
            }
            
            // Cargar reservas y rese�as
            rellenarReservas(id_recurso);
            rellenarResenyas(id_recurso);
        }
    });
}
    function rellenarReservas(id){  
        var lista_reservas = [];
        //necesitamos conocer las reservas de un recurso.
        rest.get("/api/recursos/"+id+"/reservas",function(estado,respuesta){
            if(estado == 200){
                lista_reservas = respuesta;
                reservas_tabla.innerHTML = "";
                console.log("lista reservas" +lista_reservas);
                for(var i = 0 ; i < lista_reservas.length; i++){ // un mismo recurso, puede tener varias reservas.
                    
                    var fila = document.createElement("tr") // hacemos esto para cada reserva del recurso.
                    var sanitario = document.createElement("td");
                    sanitario.textContent = lista_reservas[i].sanitario;
                    fila.appendChild(sanitario);
                    var horas = document.createElement("td");
                    horas.textContent = lista_reservas[i].horas_estimadas;
                    fila.appendChild(horas);
                    var fecha_pet = document.createElement("td");
                    fecha_pet.textContent = lista_reservas[i].fecha_peticion;
                    fila.appendChild(fecha_pet);
                    var fecha_ini = document.createElement("td");
                    fecha_ini.textContent = lista_reservas[i].fecha_inicio;
                    fila.appendChild(fecha_ini);
                    var fecha_end = document.createElement("td");
                    fecha_end.textContent = lista_reservas[i].fecha_fin;
                    fila.appendChild(fecha_end);

                    //parte nueva examen ej3
                    
                    /////////////////////////////////////////////////////////////////////////////////////////////////////
                    if(lista_reservas[i].fecha_fin == null && lista_reservas[i].fecha_inicio == null){
                        fila.style.backgroundColor = "green";
                    }else if(lista_reservas[i].fecha_fin == null){
                        fila.style.backgroundColor = "blue";
                    }
                    reservas_tabla.appendChild(fila);
                }
            }

        })

    }
    function rellenarResenyas(id){
        var lista_resenyas = []
        rest.get("/api/recursos/"+id+"/resenyas",function(estado,respuesta){
            if(estado == 200){
                lista_resenyas = respuesta;
                renyas_tabla.innerHTML = "";
                console.log("lista resenyas" + lista_resenyas);
                for(var i = 0; i < lista_resenyas.length; i++){ //un mismo recurso puede tener varias resenyas.
                var fila = document.createElement("tr");
                
                var fecha = document.createElement("td");
                fecha.textContent = lista_resenyas[i].fecha;
                fila.appendChild(fecha);
                
                var sanitario = document.createElement("td");
                sanitario.textContent = lista_resenyas[i].sanitario;
                fila.appendChild(sanitario);
                
                var valoracion = document.createElement("td");
                valoracion.textContent = lista_resenyas[i].valor + "/5";
                fila.appendChild(valoracion);
                
                var comentario = document.createElement("td");
                comentario.textContent = lista_resenyas[i].descripcion;
                fila.appendChild(comentario);
                
                
                
                renyas_tabla.appendChild(fila);
            }

            }
    })
}

    function guardar_recurso(){
        var inputNumSerie = document.getElementById("num_serie_rec");
    console.log("INPUT NUMERO SERIE:", inputNumSerie); // ?? �Existe el elemento?
    console.log("VALOR DEL INPUT:", inputNumSerie.value); // ?? �Qu� valo

    var recurso = {
        numero_serie : document.getElementById("num_serie_rec").value,
        modelo : document.getElementById("modelo_rec").value,
        ubicacion : document.getElementById("ubicacion_rec").value,
        estado : document.getElementById("estado_rec").value
    };
    console.log(recurso);
    
    



    if(recurso_actual_id != null){ 
        // EDITAR
        rest.put("/api/recursos/" + recurso_actual_id, recurso, function(estado,respuesta){
            if(estado == 200){
                alert("Recurso actualizado");
            }
        });
    } else {
        // CREAR
        rest.post("/api/recursos", recurso, function(estado,respuesta){
            if(estado == 201){
                alert("Recurso creado");
                var modeloObj = modelos_lista.find(m => m.id == recurso.modelo);
                var categoriaObj = categorias_lista.find(c => c.id == modeloObj.categoria); //Cogemos la categoria y el modelo del recurso y lo mandamos por el WS.
                wsAvisoNuevoRecurso(categoriaObj.nombre, modeloObj.nombre, recurso.numero_serie);
            }
        });
    }
}

function volver(){
    cambiarSeccion("inicio");
    //Indicamos que los selects marquen la opción por defecto. 
    document.getElementById("categoria").value = "";
    document.getElementById("modelo").value = "";
    document.getElementById("ubicacion").value = "";
    document.getElementById("estado").value = "";
    //los option se mantienen cargados.
    buscar();
}

//ENVIAR RESERVAS AL MINISTERIO
function enviarReservasMinisterio(){
    var boton=document.getElementById("btn_enviar_ministerio");
    var estado=document.getElementById("estado_ministerio");

    if(boton.disabled) return;

    boton.disabled=true;
    estado.textContent="Obteniendo reservas...";

    // 1. Obtener categorías de nuestro servidor
    rest.get("/api/categorias",function(codigoCategorias,categorias){
        if(codigoCategorias!=200){
            boton.disabled=false;
            estado.textContent="Error al obtener las categorías.";
            return;
        }

        // 2. Obtener modelos de nuestro servidor
        rest.get("/api/modelos",function(codigoModelos,modelos){
            if(codigoModelos!=200){
                boton.disabled=false;
                estado.textContent="Error al obtener los modelos.";
                return;
            }

            // 3. Obtener TODOS los recursos de nuestro servidor
            rest.get(
                "/api/recursos?categoria=Todos&modelo=Todos&ubicacion=Todos&estado=Todos",
                function(codigoRecursos,recursos){

                    if(codigoRecursos!=200){
                        boton.disabled=false;
                        estado.textContent="Error al obtener los recursos.";
                        return;
                    }

                    if(recursos.length==0){
                        boton.disabled=false;
                        estado.textContent="No hay recursos.";
                        return;
                    }

                    var datos=[];
                    var pendientes=recursos.length;
                    var errorReservas=false;

                    // 4. Obtener las reservas de cada recurso
                    for(let i=0;i<recursos.length;i++){

                        let recurso=recursos[i];

                        rest.get(
                            "/api/recursos/"+recurso.id+"/reservas",
                            function(codigoReservas,reservas){

                                if(codigoReservas!=200){
                                    errorReservas=true;
                                }else{

                                    // Averiguar categoría del recurso
                                    var modeloObj=modelos.find(function(m){
                                        return m.id==recurso.modelo;
                                    });

                                    var categoriaObj=null;

                                    if(modeloObj){
                                        categoriaObj=categorias.find(function(c){
                                            return c.id==modeloObj.categoria;
                                        });
                                    }

                                    // Añadir cada reserva al array datos
                                    for(var j=0;j<reservas.length;j++){

                                        var partesSanitario=
                                            reservas[j].sanitario.trim().split(/\s+/);

                                        var nombre=partesSanitario.shift();
                                        var apellidos=partesSanitario.join(" ");

                                        datos.push({
                                            nombre:nombre,
                                            apellidos:apellidos,
                                            "categoría":categoriaObj ?
                                                categoriaObj.nombre : "",
                                            horas_estimadas:
                                                reservas[j].horas_estimadas,
                                            fec_pet:
                                                reservas[j].fecha_peticion,
                                            fec_ini:
                                                reservas[j].fecha_inicio,
                                            fecha_fin:
                                                reservas[j].fecha_fin
                                        });
                                    }
                                }

                                pendientes--;

                                // Cuando hayan terminado TODOS los GET
                                if(pendientes==0){

                                    if(errorReservas){
                                        boton.disabled=false;
                                        estado.textContent=
                                            "Error al obtener alguna reserva.";
                                        return;
                                    }

                                    if(datos.length==0){
                                        boton.disabled=false;
                                        estado.textContent=
                                            "No hay reservas para enviar.";
                                        return;
                                    }
                                    enviarDatosMinisterio(datos);
                                }
                            }
                        );
                    }
                }
            );
        });
    });
}

function enviarDatosMinisterio(datos){

    var boton=document.getElementById("btn_enviar_ministerio");
    var estado=document.getElementById("estado_ministerio");

    var hoy=new Date();

    var fecha=
        hoy.getFullYear()+"-"+
        String(hoy.getMonth()+1).padStart(2,"0")+"-"+
        String(hoy.getDate()).padStart(2,"0");

    var envio={
        id_area:ID_AREA,
        fecha:fecha,
        datos:datos
    };

    estado.textContent="Enviando reservas al Ministerio...";

    // UN ÚNICO POST DIRECTAMENTE AL MINISTERIO
    rest.post(
        URL_MINISTERIO,
        envio,
        function(codigo,respuesta){

            boton.disabled=false;

            if(codigo>=200 && codigo<300){
                estado.textContent=
                    "Enviadas "+datos.length+" reservas al Ministerio.";
            }else{
                estado.textContent=
                    "Error al enviar las reservas al Ministerio.";
            }
        }
    );
}

//RANKING
function cargarRanking(){

    rest.get(URL_MINISTERIO,function(estado,datos){

        if(estado != 200){
            alert("Error al obtener los datos del Ministerio");
            return;
        }

        var totales = {};


        // Crear las 18 áreas inicialmente con 0 reservas
        for(var idArea in areasMedicas){

            totales[idArea] = 0;

        }


        // Contar las reservas de cada área
        for(var i = 0; i < datos.length; i++){

            var idArea = datos[i].id_area;

            if(areasMedicas[idArea] != undefined){

                totales[idArea] += datos[i].datos.length;

            }else{

                console.log("Área desconocida:", idArea);

            }
        }


        // Crear el ranking
        var ranking = [];

        for(var idArea in totales){

            ranking.push({
                id_area: idArea,
                total: totales[idArea]
            });

        }


        // Ordenar de mayor a menor
        ranking.sort(function(a, b){

            return b.total - a.total;

        });


        // Mostrar ranking
        var tabla = document.getElementById("tabla_ranking");

        tabla.innerHTML = "";


        for(var i = 0; i < ranking.length; i++){

            var fila = document.createElement("tr");

            var posicion = document.createElement("td");
            posicion.textContent = i + 1;

            var area = document.createElement("td");
            area.textContent = areasMedicas[ranking[i].id_area];

            var total = document.createElement("td");
            total.textContent = ranking[i].total;

            fila.appendChild(posicion);
            fila.appendChild(area);
            fila.appendChild(total);

            tabla.appendChild(fila);
        }

    });
}









    


