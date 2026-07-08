============================================================
PETICIONES DE PRUEBA - PORTAL ADMINISTRATIVO ETI
============================================================

1. INICIAR SESIÓN (POST a http://localhost:3000/api/login)
------------------------------------------------------------
{
  "email": "director@escuela.edu",
  "password": "clave_segura_123"
}

2. REGISTRAR ASISTENCIA (POST a http://localhost:3000/api/asistencia)
------------------------------------------------------------
{
  "cedula": "12345678",
  "tipo_movimiento": "Entrada"
}

3. REGISTRAR NUEVO PERSONAL (POST a http://localhost:3000/api/personal)
------------------------------------------------------------
{
  "cedula": "12345678",
  "nombre": "Ana",
  "apellido": "Pérez",
  "cargo": "Docente Titular",
  "departamento": "Ciencias Exactas",
  "turno": "Mañana",
  "estatus": true
}

4. REGISTRAR USUARIO ADMINISTRATIVO (POST a http://localhost:3000/api/usuarios)
------------------------------------------------------------
{
  "email": "director@escuela.edu",
  "password": "clave_segura_123",
  "nombre": "Director Principal",
  "rol_id": 1
}

5. VER HISTORIAL ASISTENCIAS (GET a http://localhost:3000/api/asistencia)
6. VER LISTA DE PERSONAL (GET a http://localhost:3000/api/personal)