# Portal Administrativo E.T.I. - Módulo Backend 🚀

Este repositorio contiene el núcleo (Backend) del sistema de control de asistencia y gestión de personal para la Escuela Técnica Industrial (E.T.I.), desarrollado bajo una arquitectura robusta, segura y escalable utilizando **Node.js**, **Express** y **SQLite**.

---

## 📁 Estructura del Proyecto Actualizada

```text
Portal-Administrativo-ETI/
├── backend/                       # Directorio del Servidor Backend
│   ├── database/                  # Capa de Almacenamiento y Persistencia
│   │   ├── db.js                  # Inicialización de SQLite, Esquemas y Restricciones
│   │   └── eti.db                 # Base de Datos Relacional (Generada en tiempo de ejecución)
│   ├── node_modules/              # Dependencias instaladas de npm
│   ├── package.json               # Configuración del proyecto y scripts (`npm run dev`)
│   ├── package-lock.json          # Registro exacto del árbol de dependencias
│   ├── peticiones_prueba.js       # Repositorio local de payloads JSON para pruebas
│   └── server.js                  # Enrutador principal, Middlewares y Endpoints de la API
├── docs/                          # Documentación e informes del proyecto de tesis
├── js/                            # Scripts de lógica del Frontend (Lado del Cliente)
├── pages/                         # Vistas y pantallas HTML de la interfaz de usuario
├── logo_eti.png                   # Identidad visual de la institución
└── README.md                      # Documentación general del proyecto (Este archivo)