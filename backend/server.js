const express = require('express');
const cors = require('cors');
const db = require('./database/db');
const bcrypt = require('bcryptjs');

// Inicializar la aplicación Express
const app = express();
const PORT = 3000;

// === Middlewares (Filtros de seguridad y formato) ===
app.use(cors()); // Permite que tu Frontend se comunique con este Backend
app.use(express.json()); // Permite que el servidor entienda datos en formato JSON

// === Rutas (Endpoints) ===
// Ruta de prueba (Health Check) para saber si el servidor está vivo
app.get('/api/status', (req, res) => {
    res.json({
        estado: 'activo',
        mensaje: '🚀 Motor del sistema E.T.I. encendido y funcionando perfectamente.'
    });
});

// Ruta para obtener el personal (Nueva API)
app.get('/api/personal', (req, res) => {
    const instruccionSQL = 'SELECT * FROM personal';
    
    // Consultamos a SQLite
    db.all(instruccionSQL, [], (err, filas) => {
        if (err) {
            console.error('Error al consultar personal:', err.message);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
        // Respondemos con un JSON
        res.json({
            total: filas.length,
            datos: filas
        });
    });
});

// === Endpoint: Registrar nuevo personal (POST) ===
app.post('/api/personal', (req, res) => {
    // Extraemos los datos que enviará el Frontend en el "body" de la petición
    const { cedula, nombre, apellido, cargo, departamento, turno, estatus } = req.body;

    // Validación básica de seguridad (Backend)
    if (!cedula || !nombre || !apellido || !cargo) {
        return res.status(400).json({ error: 'Faltan datos obligatorios para el registro.' });
    }

    // Preparamos la instrucción SQL. Los "?" evitan ataques de Inyección SQL.
    const instruccionSQL = `INSERT INTO personal (cedula, nombre, apellido, cargo, departamento, turno, estatus) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    // Convertimos el estatus booleano (true/false) a número (1/0) para SQLite
    const valorEstatus = estatus === true || estatus === 'true' || estatus === 1 ? 1 : 0;
    const valores = [cedula, nombre, apellido, cargo, departamento, turno || 'Mañana', valorEstatus];

    // Ejecutamos la inserción en la base de datos
    db.run(instruccionSQL, valores, function(err) {
        if (err) {
            console.error('Error al insertar personal:', err.message);
            // Si el error es porque la cédula ya existe (rompe la regla PRIMARY KEY)
            if (err.message.includes('UNIQUE')) {
                return res.status(409).json({ error: 'La cédula ya se encuentra registrada en el sistema.' });
            }
            return res.status(500).json({ error: 'Error interno al guardar en la base de datos.' });
        }
        
        // Si todo sale bien, respondemos con éxito
        res.status(201).json({
            mensaje: 'Personal registrado con éxito.',
            cedula: cedula
        });
    });
});

// === Endpoint: Registrar Asistencia (Reloj) ===
app.post('/api/asistencia', (req, res) => {
    const { cedula, tipo_movimiento } = req.body;

    // 1. Validar que vengan los datos
    if (!cedula || !tipo_movimiento) {
        return res.status(400).json({ error: 'Cédula y tipo de movimiento son obligatorios.' });
    }

    // 2. Validar que el movimiento sea el correcto
    const movimientosValidos = ['Entrada', 'Salida Almuerzo', 'Retorno Almuerzo', 'Salida'];
    if (!movimientosValidos.includes(tipo_movimiento)) {
        return res.status(400).json({ error: 'Tipo de movimiento inválido.' });
    }

    // 3. Generar la Fecha y Hora exactas desde el SERVIDOR (Blindaje de Seguridad)
    const ahora = new Date();
    const fechaFormateada = ahora.toLocaleDateString('es-ES').replace(/-/g, '/');
    const horaFormateada = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
    const timestamp = ahora.getTime();

    // 4. Preparar la inserción en la tabla asistencias
    const instruccionSQL = `INSERT INTO asistencias (cedula, tipo_movimiento, fecha, hora, timestamp) VALUES (?, ?, ?, ?, ?)`;
    const valores = [cedula, tipo_movimiento, fechaFormateada, horaFormateada, timestamp];

    // 5. Ejecutar y verificar Restricción de Clave Foránea (Foreign Key)
    db.run(instruccionSQL, valores, function(err) {
        if (err) {
            console.error('Error al registrar asistencia:', err.message);
            // Si la cédula no existe en la tabla "personal", SQLite bloquea la inserción por la Foreign Key
            if (err.message.includes('FOREIGN KEY')) {
                return res.status(404).json({ error: 'Acceso Denegado: La cédula ingresada no pertenece a la matrícula de la E.T.I.' });
            }
            return res.status(500).json({ error: 'Error interno al registrar la asistencia.' });
        }

        // Si es exitoso, respondemos con los datos del registro
        res.status(201).json({
            mensaje: `Registro exitoso: ${tipo_movimiento}`,
            cedula: cedula,
            hora_registrada: horaFormateada
        });
    });
});

// === Endpoint: Obtener el historial de Asistencias (Reportes) ===
app.get('/api/asistencia', (req, res) => {
    // Usamos SQL JOIN para combinar la tabla "asistencias" (a) con "personal" (p)
    const instruccionSQL = `
        SELECT a.id, a.cedula, p.nombre, p.apellido, p.cargo, a.tipo_movimiento, a.fecha, a.hora 
        FROM asistencias a
        JOIN personal p ON a.cedula = p.cedula
        ORDER BY a.timestamp DESC
    `;
    
    db.all(instruccionSQL, [], (err, filas) => {
        if (err) {
            console.error('Error al consultar asistencias:', err.message);
            return res.status(500).json({ error: 'Error interno del servidor al consultar asistencias.' });
        }
        
        res.json({
            total_registros: filas.length,
            auditoria: filas
        });
    });
});

// === Endpoint: Registrar Nuevo Usuario Administrativo (POST) ===
app.post('/api/usuarios', async (req, res) => {
    const { email, password, nombre, rol_id } = req.body;

    if (!email || !password || !nombre || !rol_id) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const instruccionSQL = `INSERT INTO usuarios (email, password_hash, nombre, rol_id) VALUES (?, ?, ?, ?)`;
        const valores = [email.toLowerCase(), passwordHash, nombre, rol_id];

        db.run(instruccionSQL, valores, function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(409).json({ error: 'El correo electrónico ya está registrado.' });
                }
                if (err.message.includes('FOREIGN KEY')) {
                    return res.status(400).json({ error: 'El rol asignado no existe.' });
                }
                console.error('Error al crear usuario:', err.message);
                return res.status(500).json({ error: 'Error interno del servidor.' });
            }
            
            res.status(201).json({
                mensaje: 'Usuario administrador creado con éxito.',
                usuario_id: this.lastID
            });
        });
    } catch (error) {
        console.error('Error en la encriptación:', error);
        res.status(500).json({ error: 'Error procesando la seguridad de la contraseña.' });
    }
});

// === Endpoint: Iniciar Sesión (Login) ===
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son obligatorios.' });
    }

    // 1. Buscar al usuario por su email y traer también sus permisos de rol (JOIN)
    const instruccionSQL = `
        SELECT u.id, u.email, u.password_hash, u.nombre, 
               r.nombre as rol_nombre, r.permiso_dashboard, r.permiso_personal, r.permiso_reportes, r.permiso_ajustes
        FROM usuarios u
        JOIN roles r ON u.rol_id = r.id
        WHERE u.email = ?
    `;

    // Usamos db.get porque esperamos encontrar a un solo usuario
    db.get(instruccionSQL, [email.toLowerCase()], async (err, usuario) => {
        if (err) {
            console.error('Error al buscar usuario:', err.message);
            return res.status(500).json({ error: 'Error interno del servidor.' });
        }

        // 2. Verificar si el usuario realmente existe en la base de datos
        if (!usuario) {
            return res.status(401).json({ error: 'Credenciales inválidas (Usuario no encontrado).' });
        }

        // 3. Comparar la contraseña ingresada con el Hash guardado (Magia de bcrypt)
        try {
            const esValida = await bcrypt.compare(password, usuario.password_hash);
            
            if (!esValida) {
                return res.status(401).json({ error: 'Credenciales inválidas (Contraseña incorrecta).' });
            }

            // 4. Si todo es correcto, respondemos con los datos (¡SIN la contraseña!)
            res.json({
                mensaje: 'Inicio de sesión exitoso',
                usuario: {
                    id: usuario.id,
                    nombre: usuario.nombre,
                    email: usuario.email,
                    rol: usuario.rol_nombre,
                    permisos: {
                        dashboard: usuario.permiso_dashboard === 1,
                        personal: usuario.permiso_personal === 1,
                        reportes: usuario.permiso_reportes === 1,
                        ajustes: usuario.permiso_ajustes === 1
                    }
                }
            });

        } catch (error) {
            console.error('Error al verificar contraseña:', error);
            return res.status(500).json({ error: 'Error procesando la seguridad.' });
        }
    });
});

// === Encender el Servidor ===
app.listen(PORT, () => {
    console.log(`Servidor backend corriendo exitosamente en http://localhost:${PORT}`);
    console.log(`Esperando peticiones...`);
});