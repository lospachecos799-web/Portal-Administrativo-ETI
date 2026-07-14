// --- GUARDIA DE SEGURIDAD CENTRALIZADA Y CONTROL DE INTERFAZ GLOBAL ---

function verificarYAsignarSesion() {
    const sesionStr = localStorage.getItem('usuario_eti');
    if (!sesionStr) {
        window.location.replace('index.html');
        return null;
    }
    const datosSesion = JSON.parse(sesionStr);
    
    // Pintado dinámico del panel izquierdo (Común en todos los módulos)
    const txtUsuarioIzq = document.getElementById('txt-perfil-izq-usuario');
    const txtRolIzq = document.getElementById('txt-perfil-izq-role') || document.getElementById('txt-perfil-izq-rol');
    
    if (txtUsuarioIzq) txtUsuarioIzq.textContent = datosSesion.nombre; 
    if (txtRolIzq) txtRolIzq.textContent = datosSesion.rol;             
    
    // Aplicar el Role-Based Access Control (RBAC) dinámico en el menú
    aplicarRestriccionesInterfaz(datosSesion.rol);

    return datosSesion;
}

function aplicarRestriccionesInterfaz(rol) {
    // Si el rol no es Administrador ni Directivo, ocultamos los módulos protegidos
    if (rol !== 'Administrador' && rol !== 'Directivo') {
        const enlacesOcultar = [
            'href="personal.html"',
            'href="reportes.html"',
            'href="configuracion.html"'
        ];
        
        const elementosMenu = document.querySelectorAll('nav ul li a');
        elementosMenu.forEach(enlace => {
            const htmlEnlace = enlace.outerHTML;
            if (enlacesOcultar.some(item => htmlEnlace.includes(item))) {
                enlace.parentElement.remove(); // Remueve el <li> completo por seguridad visual
            }
        });
    }
}

// === 🔔 EVALUADOR GLOBAL DEL PUNTO ROJO ===
window.evaluarPuntoRojo = function() {
    const hoyStr = new Date().toLocaleDateString('es-ES').replace(/-/g, '/');
    const notifDot = document.getElementById('notif-dot');
    if (!notifDot) return;

    // Lee cuántas notificaciones hemos visto hoy
    const cantidadLeidas = parseInt(sessionStorage.getItem('notifs_count_' + hoyStr) || '0');
    
    // Si hay más notificaciones en el sistema que las que hemos leído, enciende el punto
    if (window.alertasDelDia && window.alertasDelDia.length > cantidadLeidas) {
        notifDot.classList.remove('hidden');
    } else {
        notifDot.classList.add('hidden');
    }
};

// === 👤 GESTIÓN CENTRALIZADA DE MENÚS FLOTANTES SUPERIORES Y CIERRE DE SESIÓN ===
function inicializarMenusSuperioresGlobales(datosSesion) {
    const btnNotif = document.querySelector('button span[data-icon="notifications"]')?.parentElement;
    const btnAyuda = document.querySelector('button span[data-icon="help"]')?.parentElement;
    const btnPerfil = document.querySelector('button span[data-icon="account_circle"]')?.parentElement;

    const cuentaMenuSuperior = datosSesion ? datosSesion.email : 'admin@escuela.edu';
    const hoyStr = new Date().toLocaleDateString('es-ES').replace(/-/g, '/');

    const limpiarMenusFlotantes = () => { document.getElementById('dropdown-flotante')?.remove(); };

    if (btnNotif) {
        btnNotif.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // MAGIA: Guardamos la cantidad exacta de alertas que existían en el momento del clic
            const conteoAlertas = window.alertasDelDia ? window.alertasDelDia.length : 0;
            sessionStorage.setItem('notifs_count_' + hoyStr, conteoAlertas.toString());
            window.evaluarPuntoRojo(); // Apaga el punto al instante
            
            limpiarMenusFlotantes();
            
            const menu = document.createElement('div'); 
            menu.id = 'dropdown-flotante';
            menu.className = 'absolute right-[12%] top-16 bg-white border border-gray-200 w-80 rounded-xl shadow-xl z-50 overflow-hidden text-left';
            
            let listaAlertasHtml = `<div class="p-4 text-center text-sm text-gray-500">No hay novedades escolares registradas hoy.</div>`;
            if (window.alertasDelDia && window.alertasDelDia.length > 0) {
                listaAlertasHtml = '';
                // Invertimos el arreglo visualmente para que las más recientes salgan arriba
                [...window.alertasDelDia].reverse().forEach(alerta => {
                    listaAlertasHtml += `<div class="p-3 border-b border-gray-100 hover:bg-gray-50 flex gap-3 items-start transition-colors text-left"><span class="material-symbols-outlined ${alerta.color} text-xl">${alerta.icono}</span><div><p class="text-xs font-bold text-gray-800">${alerta.titulo}</p><p class="text-[11px] text-gray-500 mt-0.5">${alerta.descripcion}</p></div></div>`;
                });
            }
            
            menu.innerHTML = `<div class="px-4 py-2.5 bg-gray-50 border-b border-gray-200 font-bold text-xs text-gray-700 flex justify-between items-center"><span>Novedades de la Jornada</span><span class="px-1.5 py-0.5 bg-gray-200 rounded-full text-[10px]">${conteoAlertas}</span></div><div class="max-h-64 overflow-y-auto custom-scrollbar">${listaAlertasHtml}</div>`;
            btnNotif.parentElement.appendChild(menu);
        });
    }

    if (btnAyuda) {
        btnAyuda.addEventListener('click', (e) => {
            e.stopPropagation(); 
            limpiarMenusFlotantes();
            const menu = document.createElement('div'); 
            menu.id = 'dropdown-flotante';
            menu.className = 'absolute right-[6%] top-16 bg-white border border-gray-200 w-72 rounded-xl shadow-xl z-50 p-4 text-left';
            menu.innerHTML = `<h4 class="text-xs font-bold text-gray-800 mb-2 flex items-center gap-2"><span class="material-symbols-outlined text-sm text-green-600">school</span> Control E.T.I. Infante</h4><p class="text-[11px] text-gray-600 leading-relaxed mb-2">• <b>Horario de Entrada:</b> 07:00 a. m. (Mañana) / 01:00 p. m. (Tarde).</p><p class="text-[11px] text-gray-600 leading-relaxed mb-2">• <b>Personal Institucional:</b> Control global de Personal Docente, Administrativo y Obrero.</p><p class="text-[11px] text-gray-600 leading-relaxed">• <b>Seguridad RBAC:</b> Los módulos se habilitan dinámicamente según su nivel de autorización.</p>`;
            btnAyuda.parentElement.appendChild(menu);
        });
    }

    if (btnPerfil) {
        btnPerfil.addEventListener('click', (e) => {
            e.stopPropagation(); 
            limpiarMenusFlotantes();
            const menu = document.createElement('div'); 
            menu.id = 'dropdown-flotante';
            menu.className = 'absolute right-[2%] top-16 bg-white border border-gray-200 w-52 rounded-xl shadow-xl z-50 overflow-hidden text-left';
            menu.innerHTML = `
                <div class="p-3 bg-gray-50 border-b border-gray-200"><p class="text-xs font-bold text-gray-800 truncate" title="${cuentaMenuSuperior}">${cuentaMenuSuperior}</p><p class="text-[10px] text-gray-500">E.T.I. Leonardo Infante</p></div>
                <a href="#" id="btn-logout-portal" class="px-4 py-2 text-xs text-red-600 hover:bg-red-50 border-t border-gray-100 flex items-center gap-2 mt-1 mb-1"><span class="material-symbols-outlined text-sm">logout</span> Salir del Portal</a>
            `;
            btnPerfil.parentElement.appendChild(menu);

            document.getElementById('btn-logout-portal')?.addEventListener('click', (evento) => {
                evento.preventDefault();
                localStorage.removeItem('usuario_eti'); 
                window.location.replace('index.html'); 
            });
        });
    }
    document.addEventListener('click', limpiarMenusFlotantes);
}

// =========================================================================
// 🏛️ NUEVO: CONTROL CENTRALIZADO DE PESTAÑAS (TÍTULOS Y FAVICON)
// =========================================================================
function inicializarIdentidadInstitucional() {
    // 1. Aislar el nombre del documento HTML actual desde la URL
    const rutaLimpia = window.location.pathname.split("/").pop();
    
    // 2. Diccionario formal incluyendo el Index / Login
    const mapasModulos = {
        "index.html": "Inicio de Sesión", // ✨ Añadido para el Login
        "tablero.html": "Tablero Principal",
        "personal.html": "Gestión de Personal",
        "reportes.html": "Auditoría de Reportes",
        "configuracion.html": "Configuración del Sistema",
        "reloj.html": "Terminal Biométrico"
    };

    // 3. Evaluar el módulo (Usa Portal Administrativo por defecto)
    const moduloActual = mapasModulos[rutaLimpia] || "Portal Administrativo";
    
    // 4. Inyectar dinámicamente el título formateado de la pestaña
    document.title = `${moduloActual} | E.T.I. Leonardo Infante`;

    // 5. Fabricar e inyectar dinámicamente el Favicon Oficial en el <head>
    let favicon = document.querySelector("link[rel*='icon']");
    if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        favicon.type = 'image/png';
        document.head.appendChild(favicon);
    }
    // Sube un nivel desde la carpeta /pages para capturar el logo en la raíz del proyecto
    favicon.href = "../logo_eti.png?v=" + new Date().getTime();
}

// Inicialización automática condicional del guardián
document.addEventListener('DOMContentLoaded', () => {
    const rutaLimpia = window.location.pathname.split("/").pop();
    
    // Si estamos en el index, SOLO cargamos la identidad visual (título e icono)
    if (rutaLimpia === 'index.html' || rutaLimpia === '') {
        inicializarIdentidadInstitucional();
    } else {
        // En cualquier otra página sí se ejecuta el flujo completo de seguridad
        const datosSesion = verificarYAsignarSesion();
        inicializarMenusSuperioresGlobales(datosSesion);
        inicializarIdentidadInstitucional();
    }
});