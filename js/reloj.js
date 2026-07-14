// --- LÓGICA DEL RELOJ DIGITAL ---
function updateClock() {
    const clockElement = document.getElementById('clock');
    const dateElement = document.getElementById('date-display');
    const now = new Date();

    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; 
    const hoursStr = String(hours).padStart(2, '0');

    if (clockElement) clockElement.textContent = `${hoursStr}:${minutes}:${seconds} ${ampm}`;

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = now.toLocaleDateString('es-ES', options);
    if (dateElement) dateElement.textContent = dateString.charAt(0).toUpperCase() + dateString.slice(1);
}
setInterval(updateClock, 1000);
updateClock();


// --- LÓGICA DEL TECLADO NUMÉRICO (UX/UI) ---
const cedulaInput = document.getElementById('cedula');

function agregarNumero(num) {
    if (cedulaInput.value.length < 8) {
        cedulaInput.value += num;
    }
}

function borrarNumero() {
    cedulaInput.value = cedulaInput.value.slice(0, -1);
}

function limpiarCedula() {
    cedulaInput.value = '';
}

// Permite también usar el teclado físico de la computadora
document.addEventListener('keydown', (e) => {
    if (e.key >= '0' && e.key <= '9') agregarNumero(e.key);
    if (e.key === 'Backspace') borrarNumero();
    if (e.key === 'Escape' || e.key === 'Delete') limpiarCedula();
    if (e.key === 'Enter') procesarAsistenciaInteligente();
});


// --- FEEDBACK VISUAL MEJORADO ---
let feedbackTimer; 

function mostrarFeedback(mensaje, tipo) {
    const box = document.getElementById('mensaje-feedback');
    if (!box) return;

    clearTimeout(feedbackTimer);

    box.classList.remove('hidden', 'bg-green-100', 'text-green-800', 'bg-red-100', 'text-red-800', 'bg-blue-100', 'text-blue-800');
    
    if (tipo === 'exito') box.classList.add('bg-green-100', 'text-green-800');
    else if (tipo === 'error') box.classList.add('bg-red-100', 'text-red-800');
    else if (tipo === 'info') box.classList.add('bg-blue-100', 'text-blue-800');

    box.innerHTML = mensaje;
    box.classList.remove('hidden');

    feedbackTimer = setTimeout(() => {
        box.classList.add('hidden');
    }, 10000); // 10 segundos de visualización
}

// --- ESCUDO ANTI-RECARGA DE LIVE SERVER ---
// Si la página se recarga, busca si quedó un mensaje pendiente por mostrar
document.addEventListener('DOMContentLoaded', () => {
    const mensajeGuardado = sessionStorage.getItem('notif_tesis_mensaje');
    const tipoGuardado = sessionStorage.getItem('notif_tesis_tipo');
    
    if (mensajeGuardado) {
        mostrarFeedback(mensajeGuardado, tipoGuardado);
        sessionStorage.removeItem('notif_tesis_mensaje');
        sessionStorage.removeItem('notif_tesis_tipo');
    }
});


// --- MOTOR INTELIGENTE DE ASISTENCIA (CONEXIÓN SQLITE) ---
async function procesarAsistenciaInteligente() {
    const cedula = cedulaInput.value.trim();

    if (cedula.length < 7 || cedula.length > 8) {
        mostrarFeedback('<span class="material-symbols-outlined align-middle mr-1">warning</span> Cédula inválida. Ingrese 7 u 8 dígitos.', 'error');
        limpiarCedula();
        return;
    }

    const btnMarcar = document.getElementById('btn-marcar');
    btnMarcar.disabled = true;
    btnMarcar.innerHTML = `<span class="material-symbols-outlined animate-spin">refresh</span> PROCESANDO...`;

    try {
        const respPersonal = await fetch('http://localhost:3000/api/personal');
        if (!respPersonal.ok) throw new Error('Error al conectar con la base de datos.');
        
        const dataPersonal = await respPersonal.json();
        const empleado = (dataPersonal.datos || []).find(e => e.cedula === cedula);

        if (!empleado) {
            mostrarFeedback(`<span class="material-symbols-outlined align-middle mr-1">person_off</span> La Cédula V-${cedula} no está registrada en la Institución. Consulte con RRHH.`, 'error');
            limpiarCedula();
            restaurarBoton(btnMarcar);
            return;
        }

        const respAsistencia = await fetch('http://localhost:3000/api/asistencia');
        if (!respAsistencia.ok) throw new Error('Error al conectar con el motor de asistencia.');
        
        const dataAsistencia = await respAsistencia.json();
        const hoyStr = new Date().toLocaleDateString('es-ES').replace(/-/g, '/');
        
        const movimientosHoy = (dataAsistencia.auditoria || []).filter(m => {
            const fReg = m.fecha ? m.fecha.replace(/-/g, '/') : '';
            return m.cedula === cedula && fReg === hoyStr;
        });

        let proximoMovimiento = 'Entrada';
        if (movimientosHoy.length === 1) proximoMovimiento = 'Salida Almuerzo';
        else if (movimientosHoy.length === 2) proximoMovimiento = 'Retorno Almuerzo';
        else if (movimientosHoy.length === 3) proximoMovimiento = 'Salida';
        else if (movimientosHoy.length >= 4) {
            const msjInfo = `<span class="material-symbols-outlined align-middle mr-1">done_all</span> V-${cedula}: Jornada laboral completada por hoy. ¡Buen descanso!`;
            sessionStorage.setItem('notif_tesis_mensaje', msjInfo);
            sessionStorage.setItem('notif_tesis_tipo', 'info');
            mostrarFeedback(msjInfo, 'info');
            limpiarCedula();
            restaurarBoton(btnMarcar);
            return;
        }

        const now = new Date();
        const horaStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });

        const payload = {
            cedula: empleado.cedula,
            nombre: empleado.nombre,
            apellido: empleado.apellido,
            tipo_movimiento: proximoMovimiento,
            fecha: hoyStr,
            hora: horaStr,
            timestamp: now.getTime()
        };

        const postResp = await fetch('http://localhost:3000/api/asistencia', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!postResp.ok) throw new Error('No se pudo guardar la marca en SQLite.');

        let iconoFeed = 'how_to_reg';
        let saludoFeed = 'Bienvenido/a';
        
        if (proximoMovimiento === 'Salida Almuerzo') {
            iconoFeed = 'restaurant';
            saludoFeed = '¡Buen provecho!';
        } else if (proximoMovimiento === 'Retorno Almuerzo') {
            iconoFeed = 'restaurant_menu';
            saludoFeed = 'De vuelta a la jornada,';
        } else if (proximoMovimiento === 'Salida') {
            iconoFeed = 'logout';
            saludoFeed = 'Jornada finalizada. ¡Hasta luego,';
        }

        const msjExito = `
            <span class="material-symbols-outlined align-middle text-2xl mr-2">${iconoFeed}</span>
            ${saludoFeed} <b>${empleado.nombre} ${empleado.apellido}</b><br>
            <span class="text-sm font-medium mt-1 inline-block">Marca exitosa: <b class="uppercase">${proximoMovimiento}</b> a las ${horaStr}</span>
        `;

        // Aquí está la magia: Guardamos el mensaje antes de que Live Server recargue
        sessionStorage.setItem('notif_tesis_mensaje', msjExito);
        sessionStorage.setItem('notif_tesis_tipo', 'exito');
        
        mostrarFeedback(msjExito, 'exito');
        limpiarCedula();

    } catch (err) {
        console.error(err);
        mostrarFeedback('<span class="material-symbols-outlined align-middle mr-1">wifi_off</span> Sin conexión al Servidor Central.', 'error');
    } finally {
        restaurarBoton(btnMarcar);
    }
}

function restaurarBoton(btn) {
    btn.disabled = false;
    btn.innerHTML = `<span class="material-symbols-outlined text-4xl">touch_app</span> MARCAR ASISTENCIA`;
}

document.getElementById('btn-marcar').addEventListener('click', procesarAsistenciaInteligente);