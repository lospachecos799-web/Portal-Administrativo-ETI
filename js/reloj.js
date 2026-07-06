// --- LÓGICA DEL RELOJ ---
function updateClock() {
    const clockElement = document.getElementById('clock');
    const dateElement = document.getElementById('date-display');
    const now = new Date();

    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    // Determinar AM o PM
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    // Convertir formato 24h a 12h
    hours = hours % 12;
    hours = hours ? hours : 12; // la hora '0' debe ser '12'
    const hoursStr = String(hours).padStart(2, '0');

    // Mostrar en el reloj visual
    clockElement.textContent = `${hoursStr}:${minutes}:${seconds} ${ampm}`;

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = now.toLocaleDateString('es-ES', options);
    dateElement.textContent = dateString.charAt(0).toUpperCase() + dateString.slice(1);
}
setInterval(updateClock, 1000);
updateClock();

// --- LÓGICA DE VALIDACIÓN Y REGISTRO ---
const cedulaInput = document.getElementById('cedula');

// 1. Validación en tiempo real (Solo números, máximo 8 dígitos)
if(cedulaInput){
    cedulaInput.addEventListener('input', function(e) {
        let valor = this.value.replace(/[^0-9]/g, ''); 
        if (valor.length > 8) {
            valor = valor.substring(0, 8); 
        }
        this.value = valor;
    });
}

// 2. Función para mostrar notificaciones (Toasts)
function mostrarToast(mensaje, tipo) {
    const toast = document.createElement('div');
    const colorIcono = tipo === 'exito' ? 'text-primary-fixed-dim' : 'text-error';
    const icono = tipo === 'exito' ? 'check_circle' : 'warning';

    toast.className = 'fixed bottom-8 right-8 bg-inverse-surface text-surface px-6 py-4 rounded-lg shadow-xl z-[100] transform transition-all duration-300 translate-y-20 opacity-0 flex items-center gap-3 border border-outline';
    toast.innerHTML = `<span class="material-symbols-outlined ${colorIcono}">${icono}</span> ${mensaje}`;

    document.body.appendChild(toast);

    setTimeout(() => toast.classList.remove('translate-y-20', 'opacity-0'), 100);

    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 3. Función principal para guardar el registro
function procesarRegistro(tipoMovimiento) {
    if(!cedulaInput) return;
    const cedula = cedulaInput.value;

    if (cedula.length < 7 || cedula.length > 8) {
        mostrarToast('Cédula inválida. Debe tener 7 u 8 dígitos.', 'error');
        cedulaInput.classList.add('border-error', 'ring-error');
        setTimeout(() => cedulaInput.classList.remove('border-error', 'ring-error'), 1000);
        return;
    }

    const now = new Date();
    const nuevoRegistro = {
        id: Date.now(), 
        cedula: cedula,
        tipo: tipoMovimiento,
        fecha: now.toLocaleDateString('es-ES').replace(/-/g, '/'), // Blindaje de fecha añadido
        hora: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true }),
        timestamp: now.getTime()
    };

    let registrosGuardadosStr = localStorage.getItem('asistencia_eti');
    let registrosGuardados = [];

    if (registrosGuardadosStr) {
         try {
            registrosGuardados = JSON.parse(registrosGuardadosStr);
            if (!Array.isArray(registrosGuardados)) {
                registrosGuardados = [];
            }
         } catch (e) {
             console.error("Error parsing localStorage data", e);
             registrosGuardados = []; 
         }
    }

    registrosGuardados.push(nuevoRegistro);

    try {
       localStorage.setItem('asistencia_eti', JSON.stringify(registrosGuardados));
       cedulaInput.value = '';
       mostrarToast(`¡${tipoMovimiento} registrada con éxito! C.I: V-${cedula}`, 'exito');
    } catch (e) {
       console.error("Error saving to localStorage", e);
       mostrarToast("Error al guardar el registro", "error");
    }
}

// 4. Asignar los eventos a los botones
const btnEntrada = document.getElementById('btn-entrada');
const btnSalida = document.getElementById('btn-salida');
const btnAlmuerzoSalida = document.getElementById('btn-almuerzo-salida');
const btnAlmuerzoRetorno = document.getElementById('btn-almuerzo-retorno');

if(btnEntrada){
    btnEntrada.addEventListener('click', () => procesarRegistro('Entrada'));
}
if(btnSalida){
    btnSalida.addEventListener('click', () => procesarRegistro('Salida'));
}
if(btnAlmuerzoSalida){
    btnAlmuerzoSalida.addEventListener('click', () => procesarRegistro('Salida Almuerzo'));
}
if(btnAlmuerzoRetorno){
    btnAlmuerzoRetorno.addEventListener('click', () => procesarRegistro('Retorno Almuerzo'));
}

if(cedulaInput){
    cedulaInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            procesarRegistro('Entrada');
        }
    });
}