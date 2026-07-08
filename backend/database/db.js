const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'eti.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error al conectar con la base de datos SQLite:', err.message);
    } else {
        console.log('📦 Conectado a la base de datos SQLite (eti.db).');
        
        // === ¡EL BLINDAJE DE SEGURIDAD! ===
        // Le ordenamos a SQLite que respete las Claves Foráneas (Foreign Keys)
        db.run('PRAGMA foreign_keys = ON;', (errPragma) => {
            if (errPragma) {
                console.error('Error al activar Foreign Keys:', errPragma.message);
            } else {
                console.log('🔒 Restricciones de Claves Foráneas ACTIVADAS.');
            }
        });
    }
});

db.serialize(() => {
    
    // NUEVA TABLA: Roles y Permisos (Basado en tu diseño UI)
    // Usamos INTEGER (0 o 1) para representar los interruptores de permisos (falso/verdadero)
    db.run(`CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE NOT NULL,
        descripcion TEXT,
        permiso_dashboard INTEGER DEFAULT 0,
        permiso_personal INTEGER DEFAULT 0,
        permiso_reportes INTEGER DEFAULT 0,
        permiso_ajustes INTEGER DEFAULT 0,
        inmodificable INTEGER DEFAULT 0 
    )`);

    // TABLA MODIFICADA: Usuarios
    // Ahora en lugar de guardar un texto, guardamos el ID del rol (Clave Foránea)
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        nombre TEXT NOT NULL,
        rol_id INTEGER NOT NULL,
        FOREIGN KEY (rol_id) REFERENCES roles (id)
    )`);

    // TABLA: Personal 
    db.run(`CREATE TABLE IF NOT EXISTS personal (
        cedula TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        apellido TEXT NOT NULL,
        cargo TEXT NOT NULL,
        departamento TEXT NOT NULL,
        turno TEXT NOT NULL,
        estatus INTEGER DEFAULT 1
    )`);

    // TABLA: Asistencias
    db.run(`CREATE TABLE IF NOT EXISTS asistencias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cedula TEXT NOT NULL,
        tipo_movimiento TEXT NOT NULL,
        fecha TEXT NOT NULL,
        hora TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (cedula) REFERENCES personal (cedula)
    )`);
     // === SEMILLA DE DATOS (SEEDER) ===
     // Insertamos el rol de Administrador por defecto si no existe
    db.run(`INSERT OR IGNORE INTO roles (id, nombre, descripcion, permiso_dashboard, permiso_personal, permiso_reportes, permiso_ajustes, inmodificable) 
         VALUES (1, 'Administrador', 'Acceso total al sistema', 1, 1, 1, 1, 1)`);

    console.log('✅ Estructura relacional de tablas verificada y creada con éxito.');
});



module.exports = db;