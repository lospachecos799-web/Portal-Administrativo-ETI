// --- LÓGICA DE CONTROL DE SEGURIDAD, ROLES DINÁMICOS Y RBAC - E.T.I. ---

let alertasDelDia = [];

// NUEVO: Guardia de seguridad y pintado dinámico invertido (UI/UX Optimizado)
function verificarYAsignarSesion() {
    const sesionStr = sessionStorage.getItem('sesion_eti_activa');
    
    // Si no hay sesión activa, rebotar al usuario al Login por seguridad
    if (!sesionStr) {
        window.location.href = 'index.html';
        return null;
    }
    
    const datosSesion = JSON.parse(sesionStr);
    
    const txtUsuarioIzq = document.getElementById('txt-perfil-izq-usuario');
    const txtRolIzq = document.getElementById('txt-perfil-izq-rol');
    
    // El panel izquierdo ahora muestra el Nombre Completo y el Rol de la sesión
    if (txtUsuarioIzq) {
        txtUsuarioIzq.textContent = datosSesion.nombreOperador;
    }
    if (txtRolIzq) {
        txtRolIzq.textContent = datosSesion.rol;
    }
    
    return datosSesion;
}

// Función para cargar alertas en la campanita
function cargarAlertasParaNotificaciones() {
    const hoyStr = new Date().toLocaleDateString('es-ES').replace(/-/g, '/');
    let marcasStr = localStorage.getItem('asistencia_eti');
    let marcas = marcasStr ? JSON.parse(marcasStr) : [];
    
    let empleadosGuardadosStr = localStorage.getItem('empleados_eti');
    let listaEmpleados = empleadosGuardadosStr ? JSON.parse(empleadosGuardadosStr) : [];
    
    alertasDelDia = [];
    
    const movimientosHoy = marcas.filter(m => {
        const fReg = m.fecha ? m.fecha.replace(/-/g, '/') : '';
        return fReg === hoyStr;
    });

    movimientosHoy.forEach(mov => {
        if (mov.tipo === 'Entrada') {
            const empleado = listaEmpleados.find(e => e.cedula === mov.cedula);
            const turno = empleado ? empleado.turno : 'Mañana';
            const partesHora = mov.hora.split(':');
            const horaInt = parseInt(partesHora[0]);
            const minutosInt = parseInt(partesHora[1].split(' ')[0]);
            const esPM = mov.hora.toLowerCase().includes('pm') || mov.hora.toLowerCase().includes('p.m.');

            let llegoTarde = false;
            if (turno === 'Tarde') {
                if (esPM && horaInt !== 12 && (horaInt > 1 || (horaInt === 1 && minutosInt > 0))) {
                    let nombColab = empleado ? `${empleado.nombre}` : mov.cedula;
                    llegoTarde = true;
                }
            } else {
                if (esPM || (!esPM && horaInt !== 12 && (horaInt > 7 || (horaInt === 7 && minutosInt > 0)))) {
                    llegoTarde = true;
                }
            }

            if (llegoTarde) {
                alertasDelDia.push({
                    titulo: 'Llegada Tardía',
                    descripcion: `C.I. V-${mov.cedula} ingresó a las ${mov.hora} (${turno})`,
                    icono: 'warning',
                    color: 'text-amber-500'
                });
            }
        } else if (mov.tipo === 'Salida Almuerzo') {
            alertasDelDia.push({
                titulo: 'Salida a Almuerzo',
                descripcion: `C.I. V-${mov.cedula} inició almuerzo a las ${mov.hora}`,
                icono: 'restaurant',
                color: 'text-blue-500'
            });
        }
    });

    // AJUSTE: Ocultar el punto rojo si ya se leyeron las notificaciones en esta sesión
    const notifDot = document.getElementById('notif-dot');
    if (notifDot) {
        const yaLeidas = sessionStorage.getItem('notifs_read_' + hoyStr);
        if (alertasDelDia.length > 0 && !yaLeidas) {
            notifDot.classList.remove('hidden');
        } else {
            notifDot.classList.add('hidden');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {

    // EJECUTAR GUARDIA DE SEGURIDAD AL INICIAR EL MÓDULO
    const datosSesion = verificarYAsignarSesion();

    // 1. Base de datos por defecto
    const rolesPorDefecto = {
        administrador: { 
            id: 'administrador', nombre: 'Administrador', desc: 'Acceso total (Inmodificable)', 
            icon: 'admin_panel_settings', colorClass: 'text-primary bg-primary/10 border-primary/20', 
            permisos: { dashboard: true, personal: true, reportes: true, ajustes: true }, locked: true 
        },
        directivo: { 
            id: 'directivo', nombre: 'Directivo', desc: 'Supervisión y visualización estratégica', 
            icon: 'manage_accounts', colorClass: 'text-secondary bg-secondary/10 border-secondary/20', 
            permisos: { dashboard: true, personal: false, reportes: true, ajustes: false }, locked: false 
        },
        rrhh: { 
            id: 'rrhh', nombre: 'Recursos Humanos', desc: 'Gestión operativa del personal', 
            icon: 'badge', colorClass: 'text-tertiary bg-tertiary/10 border-tertiary/20', 
            permisos: { dashboard: true, personal: true, reportes: true, ajustes: false }, locked: false 
        }
    };

    // 2. Inicialización de Datos
    let rolesData = JSON.parse(localStorage.getItem('roles_eti')) || rolesPorDefecto;
    const tablaRoles = document.getElementById('tabla-roles');
    const textoBitacora = document.getElementById('texto-bitacora-cambios');

    function guardarRoles() {
        localStorage.setItem('roles_eti', JSON.stringify(rolesData));
    }

    function mostrarToastConfig(mensaje, tipo) {
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-8 right-8 bg-gray-900 text-white px-6 py-4 rounded-lg shadow-xl z-[100] transform transition-all duration-300 translate-y-20 opacity-0 flex items-center gap-3 border border-gray-700';
        
        const colorIcono = tipo === 'exito' ? 'text-green-400' : 'text-red-500';
        const icono = tipo === 'exito' ? 'check_circle' : 'warning';
        
        toast.innerHTML = `<span class="material-symbols-outlined ${colorIcono}">${icono}</span> <span class="text-sm font-medium">${mensaje}</span>`;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.remove('translate-y-20', 'opacity-0'), 100);
        setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // 3. Función principal para dibujar la tabla de permisos
    function renderRoles() {
        if (!tablaRoles) return;
        tablaRoles.innerHTML = ''; 
        
        Object.values(rolesData).forEach(rol => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-surface-container/30 transition-colors duration-150 group/row border-b border-outline-variant/30 align-middle';
            tr.dataset.role = rol.id;

            const switchClass = rol.locked ? 'cursor-not-allowed' : 'cursor-pointer';
            const inputDisabled = rol.locked ? 'disabled' : '';

            const crearSwitch = (modulo) => `
                <label class="relative inline-flex items-center ${switchClass} group">
                    <input type="checkbox" ${rol.permisos[modulo] ? 'checked' : ''} ${inputDisabled} class="sr-only peer permission-switch" data-module="${modulo}"/>
                    <div class="w-12 h-6 bg-outline/30 rounded-full transition-colors switch-bg relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all switch-knob peer-checked:after:translate-x-full"></div>
                </label>
            `;

            const accionesHtml = `
                <div class="flex items-center gap-1 ml-3 opacity-30 group-hover/row:opacity-100 transition-opacity">
                    <button class="text-secondary hover:bg-secondary/10 rounded p-1 inline-flex transition-colors btn-editar-rol" data-id="${rol.id}" title="Modificar Rol">
                        <span class="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button class="text-error hover:bg-error/10 rounded p-1 inline-flex transition-colors btn-eliminar-rol" data-id="${rol.id}" title="Eliminar Rol">
                        <span class="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                </div>
            `;

            tr.innerHTML = `
                <td class="p-6">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl flex items-center justify-center border flex-shrink-0 ${rol.colorClass || 'text-gray-600 bg-gray-100 border-gray-200'}">
                            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">${rol.icon || 'supervised_user_circle'}</span>
                        </div>
                        <div>
                            <div class="font-bold text-sm text-on-surface flex items-center">${rol.nombre} ${accionesHtml}</div>
                            <div class="text-[11px] text-on-surface-variant mt-0.5">${rol.desc}</div>
                        </div>
                    </div>
                </td>
                <td class="p-6 text-center">${crearSwitch('dashboard')}</td>
                <td class="p-6 text-center">${crearSwitch('personal')}</td>
                <td class="p-6 text-center">${crearSwitch('reportes')}</td>
                <td class="p-6 text-center">${crearSwitch('ajustes')}</td>
            `;
            tablaRoles.appendChild(tr);
        });

        document.querySelectorAll('.permission-switch').forEach(sw => {
            if (!sw.disabled) {
                sw.addEventListener('change', handleSwitchChange);
            }
        });

        document.querySelectorAll('.btn-editar-rol').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const rol = rolesData[id];

                document.getElementById('form-rol-nombre').value = rol.nombre;
                document.getElementById('form-rol-desc').value = rol.desc;
                document.getElementById('modal-titulo-rol').textContent = 'Modificar Perfil de Acceso';
                
                formRol.dataset.mode = 'edit';
                formRol.dataset.editId = id;
                
                modalRol.classList.remove('hidden');
            });
        });

        document.querySelectorAll('.btn-eliminar-rol').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const nombreRol = rolesData[id].nombre;
                
                if (id === 'administrador') {
                    mostrarToastConfig('Acción denegada: El rol Administrador principal no puede ser eliminado por seguridad.', 'error');
                    return;
                }

                if (confirm(`¿Está seguro de eliminar permanentemente el perfil "${nombreRol}"?`)) {
                    delete rolesData[id]; 
                    guardarRoles(); 
                    renderRoles(); 
                    mostrarToastConfig(`El perfil "${nombreRol}" ha sido eliminado.`, 'exito');
                    
                    const horaActual = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                    if (textoBitacora) {
                        textoBitacora.innerHTML = `Admin <span class="text-red-600 font-bold">eliminó</span> el rol "${nombreRol}" a las ${horaActual}.`;
                    }
                }
            });
        });
    }

    // 4. Lógica de cambios de Permiso
    function handleSwitchChange(e) {
        const row = e.target.closest('tr');
        const roleId = row.dataset.role;
        const moduleName = e.target.dataset.module;
        const isChecked = e.target.checked;

        rolesData[roleId].permisos[moduleName] = isChecked;
        guardarRoles();

        const roleLabel = rolesData[roleId].nombre;
        const mapModules = { dashboard: 'Ver Dashboard', personal: 'Gestionar Personal', reportes: 'Generar Reportes', ajustes: 'Ajustes del Sistema' };
        const moduleLabel = mapModules[moduleName];

        const accionTexto = isChecked ? 'Otorgado' : 'Revocado';
        mostrarToastConfig(`Permiso ${accionTexto}: ${roleLabel} > ${moduleLabel}`, 'exito');

        const horaActual = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        if (textoBitacora) {
            textoBitacora.innerHTML = `Admin <span class="${isChecked ? 'text-green-600' : 'text-red-600'} font-bold">${accionTexto.toLowerCase()}</span> acceso a "${moduleLabel}" para el rol "${roleLabel}" a las ${horaActual}.`;
        }
    }

    // 5. Lógica del Formulario Modal
    const modalRol = document.getElementById('modal-nuevo-rol');
    const formRol = document.getElementById('form-nuevo-rol');
    const btnAbrirModal = document.getElementById('btn-abrir-modal-rol');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal-rol');
    const btnCancelarRol = document.getElementById('btn-cancelar-rol');

    const cerrarYLimpiarModal = () => {
        if (modalRol) {
            modalRol.classList.add('hidden');
        }
        if (formRol) {
            formRol.reset();
            delete formRol.dataset.mode;
            delete formRol.dataset.editId;
        }
        document.getElementById('modal-titulo-rol').textContent = 'Crear Nuevo Perfil de Acceso';
    };

    btnAbrirModal?.addEventListener('click', () => modalRol?.classList.remove('hidden'));
    btnCerrarModal?.addEventListener('click', cerrarYLimpiarModal);
    btnCancelarRol?.addEventListener('click', cerrarYLimpiarModal);

    formRol?.addEventListener('submit', (e) => {
        e.preventDefault();
        const nombre = document.getElementById('form-rol-nombre').value.trim();
        const desc = document.getElementById('form-rol-desc').value.trim();
        const horaActual = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        if (formRol.dataset.mode === 'edit') {
            const id = formRol.dataset.editId;
            rolesData[id].nombre = nombre;
            rolesData[id].desc = desc;
            
            mostrarToastConfig(`Rol "${nombre}" actualizado correctamente.`, 'exito');
            if (textoBitacora) {
                textoBitacora.innerHTML = `Admin <span class="text-blue-600 font-bold">modificó</span> el rol "${nombre}" a las ${horaActual}.`;
            }
        } else {
            const id = 'rol_' + Date.now(); 
            rolesData[id] = {
                id: id,
                nombre: nombre,
                desc: desc,
                icon: 'supervised_user_circle', 
                colorClass: 'text-gray-600 bg-gray-100 border-gray-200', 
                permisos: { dashboard: false, personal: false, reportes: false, ajustes: false }, 
                locked: false
            };
            
            mostrarToastConfig(`Nuevo rol "${nombre}" creado correctamente.`, 'exito');
            if (textoBitacora) {
                textoBitacora.innerHTML = `Admin <span class="text-green-600 font-bold">creó</span> el nuevo rol "${nombre}" a las ${horaActual}.`;
            }
        }

        guardarRoles();
        renderRoles();
        cerrarYLimpiarModal();
    });

    // 6. Menús contextuales superiores integrados
    function inicializarMenusSuperiores(datosSesion) {
        const btnNotif = document.querySelector('button span[data-icon="notifications"]')?.parentElement;
        const btnAyuda = document.querySelector('button span[data-icon="help"]')?.parentElement;
        const btnPerfil = document.querySelector('button span[data-icon="account_circle"]')?.parentElement;

        // PERFILES CONECTADOS: El menú superior flotante renderiza la cuenta de correo real
        const cuentaMenuSuperior = datosSesion ? datosSesion.usuario : 'admin.name@escuela.edu';

        if (btnNotif) {
            btnNotif.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Desaparecer el punto rojo y guardar el estado de "Leído"
                document.getElementById('notif-dot')?.classList.add('hidden');
                const hoyStr = new Date().toLocaleDateString('es-ES').replace(/-/g, '/');
                sessionStorage.setItem('notifs_count_' + hoyStr, alertasDelDia.length.toString());

                document.getElementById('dropdown-flotante')?.remove();
                const menu = document.createElement('div');
                menu.id = 'dropdown-flotante';
                menu.className = 'absolute right-[12%] top-16 bg-white border border-gray-200 w-80 rounded-xl shadow-xl z-50 overflow-hidden text-left';
                
                let listaAlertasHtml = '';
                if (alertasDelDia.length === 0) {
                    listaAlertasHtml = `<div class="p-4 text-center text-sm text-gray-500">No hay novedades escolares registradas hoy.</div>`;
                } else {
                    alertasDelDia.forEach(alerta => {
                        listaAlertasHtml += `
                            <div class="p-3 border-b border-gray-100 hover:bg-gray-50 flex gap-3 items-start transition-colors text-left">
                                <span class="material-symbols-outlined ${alerta.color} text-xl">${alerta.icono}</span>
                                <div>
                                    <p class="text-xs font-bold text-gray-800">${alerta.titulo}</p>
                                    <p class="text-[11px] text-gray-500 mt-0.5">${alerta.descripcion}</p>
                                </div>
                            </div>`;
                    });
                }
                menu.innerHTML = `
                    <div class="px-4 py-2.5 bg-gray-50 border-b border-gray-200 font-bold text-xs text-gray-700 flex justify-between items-center">
                        <span>Novedades de la Jornada</span>
                        <span class="px-1.5 py-0.5 bg-gray-200 rounded-full text-[10px]">${alertasDelDia.length}</span>
                    </div>
                    <div class="max-h-64 overflow-y-auto custom-scrollbar">${listaAlertasHtml}</div>`;
                btnNotif.parentElement.appendChild(menu);
            });
        }

        if (btnAyuda) {
            btnAyuda.addEventListener('click', (e) => {
                e.stopPropagation();
                document.getElementById('dropdown-flotante')?.remove();
                const menu = document.createElement('div');
                menu.id = 'dropdown-flotante';
                menu.className = 'absolute right-[6%] top-16 bg-white border border-gray-200 w-72 rounded-xl shadow-xl z-50 p-4 text-left';
                menu.innerHTML = `
                    <h4 class="text-xs font-bold text-gray-800 mb-2 flex items-center gap-2"><span class="material-symbols-outlined text-sm text-green-600">security</span> Seguridad E.T.I.</h4>
                    <p class="text-[11px] text-gray-600 leading-relaxed mb-2">• Los permisos asignados aquí son guardados de forma persistente en su navegador (LocalStorage).</p>
                    <p class="text-[11px] text-gray-600 leading-relaxed">• En la versión final con Backend, estos switches controlarán las rutas de la API (Middleware).</p>
                `;
                btnAyuda.parentElement.appendChild(menu);
            });
        }

        if (btnPerfil) {
            btnPerfil.addEventListener('click', (e) => {
                e.stopPropagation();
                document.getElementById('dropdown-flotante')?.remove();
                const menu = document.createElement('div');
                menu.id = 'dropdown-flotante';
                menu.className = 'absolute right-[2%] top-16 bg-white border border-gray-200 w-52 rounded-xl shadow-xl z-50 overflow-hidden text-left';
                menu.innerHTML = `
                    <div class="p-3 bg-gray-50 border-b border-gray-200">
                        <p class="text-xs font-bold text-gray-800 truncate" title="${cuentaMenuSuperior}">${cuentaMenuSuperior}</p>
                        <p class="text-[10px] text-gray-500">E.T.I. Leonardo Infante</p>
                    </div>
                    <a href="index.html" onclick="sessionStorage.clear()" class="px-4 py-2 text-xs text-red-600 hover:bg-red-50 border-t border-gray-100 flex items-center gap-2 mt-1 mb-1"><span class="material-symbols-outlined text-sm">logout</span> Salir del Portal</a>
                `;
                btnPerfil.parentElement.appendChild(menu);
            });
        }

        document.addEventListener('click', () => document.getElementById('dropdown-flotante')?.remove());
    }

    // Ejecutar inicializaciones
    cargarAlertasParaNotificaciones();
    inicializarMenusSuperiores(datosSesion);
    renderRoles();
});