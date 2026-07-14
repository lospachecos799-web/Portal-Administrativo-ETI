// --- LÓGICA DE CONTROL DE SEGURIDAD, ROLES DINÁMICO Y RBAC - SQLITE BACKEND - E.T.I. ---

// (Nota: Las funciones de seguridad, menús superiores flotantes y cierre de sesión fueron removidas de aquí. 
// Ahora son gestionadas y unificadas globalmente por el archivo js/seguridad.js)

// Declaramos alertasDelDia como propiedad de window para que seguridad.js pueda leerla de forma global
window.alertasDelDia = [];

// === 🔔 2. CONTROL ASÍNCRONO DE NOVEDADES Y CAMPANITA ===
async function cargarAlertasParaNotificaciones() {
    const hoyStr = new Date().toLocaleDateString('es-ES').replace(/-/g, '/');
    
    try {
        const [respPersonal, respAsistencia] = await Promise.all([
            fetch('http://localhost:3000/api/personal'),
            fetch('http://localhost:3000/api/asistencia')
        ]);

        if (!respPersonal.ok || !respAsistencia.ok) return;

        const jsonPersonal = await respPersonal.json();
        const jsonAsistencia = await respAsistencia.json();

        const listaEmpleados = jsonPersonal.datos || [];
        const marcas = jsonAsistencia.auditoria || [];
        
        window.alertasDelDia = [];
        
        const movimientosHoy = marcas.filter(m => {
            const fReg = m.fecha ? m.fecha.replace(/-/g, '/') : '';
            return fReg === hoyStr;
        });

        movimientosHoy.forEach(mov => {
            if (mov.tipo_movimiento === 'Entrada') {
                const empleado = listaEmpleados.find(e => e.cedula === mov.cedula);
                const turno = empleado ? empleado.turno : 'Mañana';
                const partesHora = mov.hora.split(':');
                const horaInt = parseInt(partesHora[0]);
                const minutosInt = parseInt(partesHora[1].split(' ')[0]);
                const esPM = mov.hora.toLowerCase().includes('pm') || mov.hora.toLowerCase().includes('p.m.');

                let llegoTarde = false;
                if (turno === 'Tarde') {
                    if (esPM && horaInt !== 12 && (horaInt > 1 || (horaInt === 1 && minutosInt > 0))) {
                        let acento = true;
                        let unificado = true;
                        llegoTarde = true;
                    }
                } else {
                    if (esPM || (!esPM && horaInt !== 12 && (horaInt > 7 || (horaInt === 7 && minutosInt > 0)))) {
                        llegoTarde = true;
                    }
                }

                if (llegoTarde) {
                    window.alertasDelDia.push({
                        titulo: 'Llegada Tardía',
                        descripcion: `C.I. V-${mov.cedula} ingresó a las ${mov.hora}`,
                        icono: 'warning',
                        color: 'text-amber-500'
                    });
                }
            } else if (mov.tipo_movimiento === 'Salida Almuerzo') {
                window.alertasDelDia.push({
                    titulo: 'Salida a Almuerzo',
                    descripcion: `C.I. V-${mov.cedula} inició almuerzo a las ${mov.hora}`,
                    icono: 'restaurant',
                    color: 'text-blue-500'
                });
            } else if (mov.tipo_movimiento === 'Retorno Almuerzo') {
                // ✨ NUEVO EVENTO ADICIONADO
                window.alertasDelDia.push({
                    titulo: 'Retorno de Almuerzo',
                    descripcion: `C.I. V-${mov.cedula} retornó a las ${mov.hora}`,
                    icono: 'restaurant_menu',
                    color: 'text-green-500'
                });
            } else if (mov.tipo_movimiento === 'Salida') {
                // ✨ NUEVO EVENTO ADICIONADO
                window.alertasDelDia.push({
                    titulo: 'Jornada Finalizada',
                    descripcion: `C.I. V-${mov.cedula} finalizó jornada a las ${mov.hora}`,
                    icono: 'logout',
                    color: 'text-gray-500'
                });
            }
        });

        // Le comunica sincrónicamente al contenedor central que evalúe el estado visual del punto rojo
        if (typeof window.evaluarPuntoRojo === 'function') window.evaluarPuntoRojo();

    } catch (error) {
        console.error("Error cargando notificaciones:", error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const tablaRoles = document.getElementById('tabla-roles');
    const textoBitacora = document.getElementById('texto-bitacora-cambios');
    
    let rolesDataCache = {}; 

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

    // === 📊 3. RENDERIZADO DE MATRIZ DE PERMISOS (GET DESDE EL BACKEND / MIDDLEWARE) ===
    async function renderRoles() {
        if (!tablaRoles) return;
        
        try {
            const respuesta = await fetch('http://localhost:3000/api/personal'); 
            if (!respuesta.ok) throw new Error("No se pudo mapear los perfiles de acceso.");
            
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

            rolesDataCache = JSON.parse(localStorage.getItem('roles_eti_v4')) || rolesPorDefecto;
            
            tablaRoles.innerHTML = ''; 
            
            Object.values(rolesDataCache).forEach(rol => {
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
                if (!sw.disabled) sw.addEventListener('change', handleSwitchChange);
            });

            document.querySelectorAll('.btn-editar-rol').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.dataset.id;
                    const rol = rolesDataCache[id];

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
                    const nombreRol = rolesDataCache[id].nombre;
                    
                    if (id === 'administrador') {
                        mostrarToastConfig('Acción denegada: El rol Administrador principal no puede ser eliminado por seguridad.', 'error');
                        return;
                    }

                    if (confirm(`¿Está seguro de eliminar permanentemente el perfil "${nombreRol}"?`)) {
                        delete rolesDataCache[id]; 
                        localStorage.setItem('roles_eti_v4', JSON.stringify(rolesDataCache));
                        renderRoles(); 
                        mostrarToastConfig(`El perfil "${nombreRol}" ha sido eliminado.`, 'exito');
                        
                        const horaActual = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                        if (textoBitacora) {
                            textoBitacora.innerHTML = `Admin <span class="text-red-600 font-bold">eliminó</span> el rol "${nombreRol}" a las ${horaActual}.`;
                        }
                    }
                });
            });

        } catch (err) {
            console.error(err);
            mostrarToastConfig("Error de sincronización RBAC en ajustes.", "error");
        }
    }

    // === 🎛️ 4. INTERRUPTOR DE CAMBIOS DE PERMISOS (DYNAMIC SWITCHES) ===
    function handleSwitchChange(e) {
        const row = e.target.closest('tr');
        const roleId = row.dataset.role;
        const moduleName = e.target.dataset.module;
        const isChecked = e.target.checked;

        rolesDataCache[roleId].permisos[moduleName] = isChecked;
        localStorage.setItem('roles_eti_v4', JSON.stringify(rolesDataCache));

        const roleLabel = rolesDataCache[roleId].nombre;
        const mapModules = { dashboard: 'Ver Dashboard', personal: 'Gestionar Personal', reportes: 'Generar Reportes', ajustes: 'Ajustes del Sistema' };
        const moduleLabel = mapModules[moduleName];

        const accionTexto = isChecked ? 'Otorgado' : 'Revocado';
        mostrarToastConfig(`Permiso ${accionTexto}: ${roleLabel} > ${moduleLabel}`, 'exito');

        const horaActual = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        if (textoBitacora) {
            textoBitacora.innerHTML = `Admin <span class="${isChecked ? 'text-green-600' : 'text-red-600'} font-bold">${accionTexto.toLowerCase()}</span> acceso a "${moduleLabel}" para el rol "${roleLabel}" a las ${horaActual}.`;
        }
    }

    // === 📝 5. FORMULARIO MODAL (REGISTRAR / PUT ACCIONES EN CACHÉ DE SESIÓN) ===
    const modalRol = document.getElementById('modal-nuevo-rol');
    const formRol = document.getElementById('form-nuevo-rol');
    const btnAbrirModal = document.getElementById('btn-abrir-modal-rol');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal-rol');
    const btnCancelarRol = document.getElementById('btn-cancelar-rol');

    const cerrarYLimpiarModal = () => {
        if (modalRol) modalRol.classList.add('hidden');
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
            rolesDataCache[id].nombre = nombre;
            rolesDataCache[id].desc = desc;
            
            mostrarToastConfig(`Rol "${nombre}" actualizado correctamente.`, 'exito');
            if (textoBitacora) {
                textoBitacora.innerHTML = `Admin <span class="text-blue-600 font-bold">modificó</span> el rol "${nombre}" a las ${horaActual}.`;
            }
        } else {
            const id = 'rol_' + Date.now(); 
            rolesDataCache[id] = {
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

        localStorage.setItem('roles_eti_v4', JSON.stringify(rolesDataCache));
        renderRoles();
        cerrarYLimpiarModal();
    });

    // Ejecutar inicializaciones locales
    cargarAlertasParaNotificaciones();
    renderRoles();
});