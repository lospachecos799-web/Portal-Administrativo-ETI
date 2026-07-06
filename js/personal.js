// --- LÓGICA DE CONTROL DE PERSONAL - RELACIONAL CON ESTATUS - E.T.I. ---

// GUARDIA DE SEGURIDAD Y PINTADO DINÁMICO INVERTIDO (UI/UX OPTIMIZADO)
function verificarYAsignarSesion() {
    const sesionStr = sessionStorage.getItem('sesion_eti_activa');
    if (!sesionStr) {
        window.location.href = 'index.html';
        return null;
    }
    const datosSesion = JSON.parse(sesionStr);
    const txtUsuarioIzq = document.getElementById('txt-perfil-izq-usuario');
    const txtRolIzq = document.getElementById('txt-perfil-izq-rol');
    
    // Muestra Nombre Completo y Rol en la barra lateral izquierda
    if (txtUsuarioIzq) txtUsuarioIzq.textContent = datosSesion.nombreOperador; 
    if (txtRolIzq) txtRolIzq.textContent = datosSesion.rol;             
    
    return datosSesion;
}

function mostrarToastPersonal(mensaje, tipo) {
    const existantToast = document.getElementById('toast-personal');
    if (existantToast) existantToast.remove();

    const toast = document.createElement('div');
    toast.id = 'toast-personal';
    const colorIcono = tipo === 'exito' ? 'text-green-400' : 'text-red-500';
    const icono = tipo === 'exito' ? 'check_circle' : 'warning';

    toast.className = 'fixed bottom-8 right-8 bg-gray-900 text-white px-6 py-4 rounded-lg shadow-xl z-[100] transform transition-all duration-300 flex items-center gap-3 border border-gray-700';
    toast.innerHTML = `<span class="material-symbols-outlined ${colorIcono}">${icono}</span> <span class="text-sm font-medium">${mensaje}</span>`;

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function verificarYPrecargarNominaPersonal() {
    let empleadosGuardadosStr = localStorage.getItem('empleados_eti');
    if (!empleadosGuardadosStr || JSON.parse(empleadosGuardadosStr).length === 0) {
        const nominaPreviaPrueba = [
            { cedula: "23423424", nombre: "Carlos", apellido: "Mendoza", cargo: "Docente Titular", departamento: "Tecnología", turno: "Mañana", estatus: true },
            { cedula: "9372973", nombre: "Elena", apellido: "Rostro", cargo: "Coordinador Académico", departamento: "Administración", turno: "Mañana", estatus: true },
            { cedula: "12345678", nombre: "Manuel", apellido: "Silva", cargo: "Docente Investigador", departamento: "Ciencias Exactas", turno: "Tarde", estatus: true },
            { cedula: "6507999", nombre: "Dimas", apellido: "Albornoz", cargo: "Docente Titular", departamento: "Tecnología", turno: "Mañana", estatus: true },
            { cedula: "44444444", nombre: "Subdirector", apellido: "Académico", cargo: "Personal Directivo", departamento: "Dirección", turno: "Rotativo", estatus: true },
            { cedula: "55555555", nombre: "Personal", apellido: "De Guardia", cargo: "Auxiliar Administrativo", departamento: "Administración", turno: "Tarde", estatus: true },
            { cedula: "66666666", nombre: "Obrero", apellido: "De Patio", cargo: "Obrero / Mantenimiento", departamento: "Mantenimiento", turno: "Rotativo", estatus: false },
            { cedula: "77777777", nombre: "Docente", apellido: "Técnico", cargo: "Docente Titular", departamento: "Tecnología", turno: "Mañana", estatus: true },
            { cedula: "88888888", nombre: "Asistente", apellido: "De Biblioteca", cargo: "Auxiliar Administrativo", departamento: "Administración", turno: "Mañana", estatus: true },
            { cedula: "11111111", nombre: "Personal", apellido: "De Limpieza", cargo: "Obrero / Mantenimiento", departamento: "Mantenimiento", turno: "Mañana", estatus: false }
        ];
        localStorage.setItem('empleados_eti', JSON.stringify(nominaPreviaPrueba));
    }
}

let alertasDelDia = [];

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
            
            const horaLimpia = mov.hora.toLowerCase().replace(/\s/g, '').replace(/\./g, '');
            const esPM = horaLimpia.includes('pm');

            let llegoTarde = false;
            if (turno === 'Tarde') {
                if (esPM && horaInt !== 12 && (horaInt > 1 || (horaInt === 1 && minutosInt > 0))) {
                    llegoTarde = true;
                }
            } else {
                if (esPM || (!esPM && horaInt !== 12 && (horaInt > 7 || (horaInt === 7 && minutosInt > 0)))) {
                    llegoTarde = true;
                }
            }

            if (llegoTarde) {
                alertasDelDia.push({
                    titulo: 'Lequeda Tardía',
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

    const notifDot = document.getElementById('notif-dot');
    if (notifDot) {
        const cantidadLeidas = parseInt(sessionStorage.getItem('notifs_count_' + hoyStr) || '0');
        if (alertasDelDia.length > cantidadLeidas) {
            notifDot.classList.remove('hidden');
        } else {
            notifDot.classList.add('hidden');
        }
    }
}

function renderizarTablaEmpleados(filtro = '') {
    verificarYPrecargarNominaPersonal();
    cargarAlertasParaNotificaciones();

    const tbody = document.getElementById('tabla-empleados');
    const txtContador = document.getElementById('texto-contador-empleados');
    if (!tbody) return;

    let empleadosGuardadosStr = localStorage.getItem('empleados_eti');
    let listaEmpleados = empleadosGuardadosStr ? JSON.parse(empleadosGuardadosStr) : [];

    if (filtro.trim() !== '') {
        const busqueda = filtro.toLowerCase().trim();
        const busquedaNumerica = busqueda.replace(/v-/g, '').replace(/[\.-]/g, '');

        listaEmpleados = listaEmpleados.filter(emp => 
            emp.nombre.toLowerCase().includes(busqueda) || 
            emp.apellido.toLowerCase().includes(busqueda) || 
            emp.cedula.includes(busquedaNumerica) ||
            emp.cargo.toLowerCase().includes(busqueda) ||
            emp.departamento.toLowerCase().includes(busqueda)
        );
    }

    if (txtContador) {
        txtContador.textContent = `Mostrando ${listaEmpleados.length} miembro(s) del personal institucional`;
    }

    if (listaEmpleados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="px-6 py-8 text-center text-gray-400 font-medium text-sm">
                    No se encontraron registros que coincidan con los criterios de búsqueda.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';

    listaEmpleados.forEach(emp => {
        const primerNombreLetter = emp.nombre ? emp.nombre[0] : 'E';
        const primerApellidoLetter = emp.apellido ? emp.apellido[0] : 'T';
        const iniciales = (primerNombreLetter + primerApellidoLetter).toUpperCase();
        
        const badgeEstatus = emp.estatus
            ? `<span class="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-semibold">
                    <span class="material-symbols-outlined text-sm font-bold">check_circle</span> Activo
               </span>`
            : `<span class="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-semibold">
                    <span class="material-symbols-outlined text-sm font-bold">cancel</span> Inactivo
               </span>`;

        const fila = document.createElement('tr');
        fila.className = 'hover:bg-surface-container/40 transition-colors border-b border-outline-variant/30';
        
        fila.innerHTML = `
            <td class="px-6 py-4 font-mono font-bold text-sm text-gray-700">V-${emp.cedula}</td>
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
                        ${iniciales}
                    </div>
                    <span class="font-bold text-on-surface text-sm">${emp.nombre}</span>
                </div>
            </td>
            <td class="px-6 py-4 text-sm font-bold text-on-surface">${emp.apellido}</td>
            <td class="px-6 py-4 text-xs font-bold text-on-surface-variant">${emp.cargo}</td>
            <td class="px-6 py-4 text-xs font-medium">
                <span class="px-2.5 py-1 bg-surface-container-high rounded-md text-on-surface border border-outline-variant/50">${emp.departamento}</span>
            </td>
            <td class="px-6 py-4 text-xs font-bold text-on-surface-variant">${emp.turno || 'Mañana'}</td>
            <td class="px-6 py-4 text-xs">${badgeEstatus}</td>
            <td class="px-6 py-4 text-center flex items-center justify-center gap-1">
                <button onclick="abrirModalModificar('${emp.cedula}')" class="p-2 text-secondary hover:bg-secondary/10 rounded-xl transition-all inline-flex items-center justify-center active:scale-90" title="Modificar Perfil">
                    <span class="material-symbols-outlined text-lg">edit</span>
                </button>
                <button onclick="eliminarEmpleado('${emp.cedula}')" class="p-2 text-error hover:bg-error/10 rounded-xl transition-all inline-flex items-center justify-center active:scale-90" title="Eliminar Registro">
                    <span class="material-symbols-outlined text-lg">delete</span>
                </button>
            </td>
        `;
        tbody.appendChild(fila);
    });
}

window.abrirModalModificar = function(cedula) {
    let empleadosGuardadosStr = localStorage.getItem('empleados_eti');
    let listaEmpleados = empleadosGuardadosStr ? JSON.parse(empleadosGuardadosStr) : [];
    
    const emp = listaEmpleados.find(e => e.cedula === cedula);
    if (!emp) return;

    const modal = document.getElementById('employeeModal');
    const form = document.getElementById('form-empleado');
    const txtTitulo = document.getElementById('modal-titulo');

    if (!modal || !form) return;

    document.getElementById('form-cedula').value = emp.cedula;
    document.getElementById('form-cedula').disabled = true; 
    document.getElementById('form-nombre').value = emp.nombre;
    document.getElementById('form-apellido').value = emp.apellido || '';
    document.getElementById('form-cargo').value = emp.cargo;
    document.getElementById('form-departamento').value = emp.departamento;
    document.getElementById('form-turno').value = emp.turno || 'Mañana';
    document.getElementById('form-estatus').value = emp.estatus !== undefined ? emp.estatus.toString() : 'true';

    form.dataset.mode = 'edit';
    form.dataset.editCedula = cedula;
    
    if (txtTitulo) txtTitulo.textContent = "Modificar Personal de la E.T.I.";

    modal.classList.remove('hidden');
}

window.eliminarEmpleado = function(cedula) {
    if (confirm(`¿Está seguro de que desea eliminar permanentemente la C.I. V-${cedula} del directorio institucional?`)) {
        let empleadosGuardadosStr = localStorage.getItem('empleados_eti');
        let listaEmpleados = empleadosGuardadosStr ? JSON.parse(empleadosGuardadosStr) : [];

        listaEmpleados = listaEmpleados.filter(emp => emp.cedula !== cedula);
        localStorage.setItem('empleados_eti', JSON.stringify(listaEmpleados));
        
        mostrarToastPersonal(`Registro C.I. V-${cedula} removido con éxito.`, 'exito');
        renderizarTablaEmpleados(document.getElementById('input-filtrar-tabla')?.value || '');
    }
}

function ejecutarVerificacionAsistenciaExpress(valorInput) {
    const cedulaBuscar = valorInput.trim().replace(/[^0-9]/g, '');
    if (!cedulaBuscar) {
        mostrarToastPersonal('Ingrese un número de cédula válido.', 'error');
        return;
    }

    const hoyStr = new Date().toLocaleDateString('es-ES').replace(/-/g, '/');
    let marcasStr = localStorage.getItem('asistencia_eti');
    let marcas = marcasStr ? JSON.parse(marcasStr) : [];

    const marcasPersonaHoy = marcas.filter(m => {
        const fReg = m.fecha ? m.fecha.replace(/-/g, '/') : '';
        return m.cedula === cedulaBuscar && fReg === hoyStr;
    });

    if (marcasPersonaHoy.length === 0) {
        mostrarToastPersonal(`C.I. V-${cedulaBuscar}: Ausente - Sin actividad registrada hoy. 🔴`, 'error');
        return;
    }

    marcasPersonaHoy.sort((a, b) => b.timestamp - a.timestamp);
    const ultimoMov = marcasPersonaHoy[0].tipo;

    let estatusTexto = '';
    if (ultimoMov === 'Entrada') estatusTexto = 'Presente en la Institución 🟢';
    else if (ultimoMov === 'Salida Almuerzo') estatusTexto = 'Almuerzo en proceso ⏰';
    else if (ultimoMov === 'Retorno Almuerzo') estatusTexto = 'Retornó de Almuerzo 🏢';
    else if (ultimoMov === 'Salida') estatusTexto = 'Jornada Finalizada 🔴';

    mostrarToastPersonal(`C.I. V-${cedulaBuscar}: Estatus actual -> ${estatusTexto}`, 'exito');
}

function inicializarMenusSuperiores(datosSesion) {
    const btnNotif = document.querySelector('button span[data-icon="notifications"]')?.parentElement;
    const btnAyuda = document.querySelector('button span[data-icon="help"]')?.parentElement;
    const btnPerfil = document.querySelector('button span[data-icon="account_circle"]')?.parentElement;

    // INTERCAMBIO INTERFAZ: El menú superior ahora muestra el Correo Electrónico
    const cuentaMenuSuperior = datosSesion ? datosSesion.usuario : 'admin.name@escuela.edu';

    if (btnNotif) {
        btnNotif.addEventListener('click', (e) => {
            e.stopPropagation();

            document.getElementById('notif-dot')?.classList.add('hidden');
            const hoyStr = new Date().toLocaleDateString('es-ES').replace(/-/g, '/');
            sessionStorage.setItem('notifs_count_' + hoyStr, alertasDelDia.length.toString());

            limpiarMenusFlotantes();
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
            limpiarMenusFlotantes();
            const menu = document.createElement('div');
            menu.id = 'dropdown-flotante';
            menu.className = 'absolute right-[6%] top-16 bg-white border border-gray-200 w-72 rounded-xl shadow-xl z-50 p-4 text-left';
            menu.innerHTML = `
                <h4 class="text-xs font-bold text-gray-800 mb-2 flex items-center gap-2"><span class="material-symbols-outlined text-sm text-green-600">school</span> Control E.T.I. Infante</h4>
                <p class="text-[11px] text-gray-600 leading-relaxed mb-2">• <b>Horario de Entrada:</b> 07:00 a. m. (Mañana) / 01:00 p. m. (Tarde).</p>
                <p class="text-[11px] text-gray-600 leading-relaxed mb-2">• <b>Personal Institucional:</b> Supervisión global de Personal Docente, Administrativo y Obrero.</p>
                <p class="text-[11px] text-gray-600 leading-relaxed">• <b>Porcentaje de Asistencia:</b> Indicador basado sobre la matrícula activa total de trabajadores.</p>
            `;
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
                <div class="p-3 bg-gray-50 border-b border-gray-200">
                    <p class="text-xs font-bold text-gray-800 truncate" title="${cuentaMenuSuperior}">${cuentaMenuSuperior}</p>
                    <p class="text-[10px] text-gray-500">E.T.I. Leonardo Infante</p>
                </div>
                <a href="configuracion.html" class="px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2"><span class="material-symbols-outlined text-sm">settings</span> Ajustes del Sistema</a>
                <a href="index.html" onclick="sessionStorage.clear()" class="px-4 py-2 text-xs text-red-600 hover:bg-red-50 border-t border-gray-100 flex items-center gap-2"><span class="material-symbols-outlined text-sm">logout</span> Salir del Portal</a>
            `;
            btnPerfil.parentElement.appendChild(menu);
        });
    }

    document.addEventListener('click', limpiarMenusFlotantes);
}

function limpiarMenusFlotantes() {
    document.getElementById('dropdown-flotante')?.remove();
}

document.addEventListener('DOMContentLoaded', () => {
    // DISPARAR GUARDIA AL ENTRAR AL MÓDULO DE PERSONAL
    const datosSesion = verificarYAsignarSesion();

    let baseVieja = localStorage.getItem('empleados_eti');
    if (baseVieja) {
        let parseada = JSON.parse(baseVieja);
        if (parseada.length > 0 && !parseada[0].hasOwnProperty('apellido')) {
            localStorage.removeItem('empleados_eti');
        }
    }

    renderizarTablaEmpleados();
    inicializarMenusSuperiores(datosSesion);

    const inputFiltro = document.getElementById('input-filtrar-tabla');
    const inputBuscarGlobal = document.getElementById('input-buscar-global');
    const form = document.getElementById('form-empleado');
    const btnAbrir = document.getElementById('btn-abrir-modal');
    const btnCerrar = document.getElementById('btn-cerrar-modal');
    const btnCancelar = document.getElementById('btn-cancelar-form');

    if (btnAbrir) {
        btnAbrir.addEventListener('click', () => {
            const txtTitulo = document.getElementById('modal-titulo');
            if (txtTitulo) txtTitulo.textContent = "Registrar Personal de la E.T.I.";
            if (form) delete form.dataset.mode;
            const inputCed = document.getElementById('form-cedula');
            if (inputCed) {
                inputCed.value = '';
                inputCed.disabled = false;
            }
            document.getElementById('employeeModal').classList.remove('hidden');
        });
    }

    const cerrarYLimpiarModal = () => {
        const modal = document.getElementById('employeeModal');
        if (modal) modal.classList.add('hidden');
        if (form) {
            form.reset();
            delete form.dataset.mode;
            delete form.dataset.editCedula;
        }
        const inputCed = document.getElementById('form-cedula');
        if (inputCed) inputCed.disabled = false;
    };

    if (btnCerrar) btnCerrar.addEventListener('click', cerrarYLimpiarModal);
    if (btnCancelar) btnCancelar.addEventListener('click', cerrarYLimpiarModal);

    if (inputFiltro) {
        inputFiltro.addEventListener('input', function() {
            renderizarTablaEmpleados(this.value);
        });
    }

    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            const cedula = document.getElementById('form-cedula').value.trim().replace(/[^0-9]/g, '');
            const nombre = document.getElementById('form-nombre').value.trim();
            const apellido = document.getElementById('form-apellido').value.trim();
            const cargo = document.getElementById('form-cargo').value;
            const departamento = document.getElementById('form-departamento').value;
            const turno = document.getElementById('form-turno').value;
            const estatus = document.getElementById('form-estatus').value === 'true';

            let empleadosGuardadosStr = localStorage.getItem('empleados_eti');
            let listaEmpleados = empleadosGuardadosStr ? JSON.parse(empleadosGuardadosStr) : [];

            if (form.dataset.mode === 'edit') {
                const editCedula = form.dataset.editCedula;
                const index = listaEmpleados.findIndex(emp => emp.cedula === editCedula);
                if (index !== -1) {
                    listaEmpleados[index] = { cedula: editCedula, nombre, apellido, cargo, departamento, turno, estatus };
                    mostrarToastPersonal(`Datos de ${nombre} ${apellido} actualizados con éxito.`, 'exito');
                }
            } else {
                if (listaEmpleados.some(emp => emp.cedula === cedula)) {
                    mostrarToastPersonal(`La C.I. V-${cedula} ya se encuentra registrada.`, 'error');
                    return;
                }
                listaEmpleados.push({ cedula, nombre, apellido, cargo, departamento, turno, estatus });
                mostrarToastPersonal(`${nombre} ${apellido} ha sido añadido al control escolar.`, 'exito');
            }

            localStorage.setItem('empleados_eti', JSON.stringify(listaEmpleados));
            cerrarYLimpiarModal(); 
            renderizarTablaEmpleados(inputFiltro?.value || '');
        });
    }

    if (inputBuscarGlobal) {
        const iconoLupa = inputBuscarGlobal.parentElement.querySelector('.material-symbols-outlined');
        if (iconoLupa) {
            iconoLupa.style.cursor = 'pointer';
            iconoLupa.style.pointerEvents = 'auto';
            iconoLupa.addEventListener('click', () => {
                ejecutarVerificacionAsistenciaExpress(inputBuscarGlobal.value);
                inputBuscarGlobal.value = '';
            });
        }

        inputBuscarGlobal.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                ejecutarVerificacionAsistenciaExpress(this.value);
                this.value = '';
            }
        });
    }
});