# Portal de Gestión de Asistencia Administrativa - E.T.I. Leonardo Infante

Sistema web interactivo y dinámico diseñado para el control de jornada diaria y la administración de accesos del personal institucional de la Escuela Técnica Industrial Leonardo Infante.

---

## 🚀 Estructura de la Aplicación

El sistema está dividido de forma lógica en dos entornos clave para garantizar la seguridad y usabilidad:

### 1. Entorno Público (Kiosco Digital)
* **`reloj.html` (o `index.html`)**: Pantalla pública donde los empleados ingresan su número de cédula para registrar en tiempo real sus marcas de **Entrada** o **Salida**. Cuenta con un reloj digital sincronizado y un log básico de estado.

### 2. Entorno Administrativo (Privado)
* **`login.html`**: Formulario de autenticación con validación de credenciales del sistema para restringir el acceso a usuarios no autorizados.
* **`tablero.html` (Inicio)**: Panel principal unificado que muestra las métricas estadísticas clave del cumplimiento de asistencia semanal, porcentaje de puntualidad global y un gráfico de barras interactivo con animaciones nativas.
* **`personal.html`**: Directorio completo de colaboradores que permite listar al personal, filtrar por número de cédula/nombre y abrir un modal dinámico para el registro de nuevos empleados.
* **`reportes.html`**: Panel consolidado de métricas avanzadas y bitácoras de los últimos movimientos y registros biometrónicos detallados por colaborador, hora y estatus (A tiempo, Retraso, Almuerzo).
* **`configuracion.html`**: Matriz de seguridad y gestión de roles. Permite activar o desactivar permisos específicos por módulo a través de interruptores (*switches*) interactivos que disparan notificaciones flotantes (*toasts*).

---

## 🛠️ Tecnologías Utilizadas

* **HTML5**: Estructuración semántica y limpia de cada una de las interfaces de usuario.
* **Tailwind CSS**: Diseño moderno, responsivo y adaptado a una paleta de colores corporativa institucional mediante configuraciones personalizadas.
* **JavaScript (Vanilla)**: Motores dinámicos internos encargados de la simulación de datos, inyección de logs en tiempo real, manipulación de estados en componentes (modales, switches) y lógica de relojes digitales.
* **Google Fonts & Material Symbols**: Tipografía Atkinson Hyperlegible Next e iconografía vectorial unificada para una estética limpia.

---

## 🔧 Instalación y Uso Local

1. Clona este repositorio en tu máquina local:
   ```bash
   git clone [https://github.com/lospachecos799-web/Portal-Administrativo-ETI.git](https://github.com/lospachecos799-web/Portal-Administrativo-ETI.git)