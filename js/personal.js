// --- LÓGICA DE CONTROL DE PERSONAL - CONEXIÓN CON SQLITE BACKEND - E.T.I. ---

// (Nota: Las funciones de seguridad, menús superiores flotantes y cierre de sesión fueron removidas de aquí. 
// Ahora son gestionadas y unificadas globalmente por el archivo js/seguridad.js)

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
                const minutesInt = parseInt(partesHora[1].split(' ')[0]);
                
                const horaLimpia = mov.hora.toLowerCase().replace(/\s/g, '').replace(/\./g, '');
                const esPM = horaLimpia.includes('pm');

                let llegoTarde = false;
                if (turno === 'Tarde') {
                    if (esPM && horaInt !== 12 && (horaInt > 1 || (horaInt === 1 && minutesInt > 0))) {
                        llegoTarde = true;
                    }
                } else {
                    if (esPM || (!esPM && horaInt !== 12 && (horaInt > 7 || (horaInt === 7 && minutesInt > 0)))) {
                        llegoTarde = true;
                    }
                }

                if (llegoTarde) {
                    window.alertasDelDia.push({
                        titulo: 'Llegada Tardía',
                        descripcion: `${mov.nombre} ${mov.apellido} (C.I. V-${mov.cedula}) ingresó a las ${mov.hora}`,
                        icono: 'warning',
                        color: 'text-amber-500'
                    });
                }
            } else if (mov.tipo_movimiento === 'Salida Almuerzo') {
                window.alertasDelDia.push({
                    titulo: 'Salida a Almuerzo',
                    descripcion: `${mov.nombre} ${mov.apellido} (C.I. V-${mov.cedula}) inició almuerzo a las ${mov.hora}`,
                    icono: 'restaurant',
                    color: 'text-blue-500'
                });
            } else if (mov.tipo_movimiento === 'Retorno Almuerzo') {
                // ✨ NUEVO EVENTO ADICIONADO
                window.alertasDelDia.push({
                    titulo: 'Retorno de Almuerzo',
                    descripcion: `${mov.nombre} ${mov.apellido} (C.I. V-${mov.cedula}) retornó a las ${mov.hora}`,
                    icono: 'restaurant_menu',
                    color: 'text-green-500'
                });
            } else if (mov.tipo_movimiento === 'Salida') {
                // ✨ NUEVO EVENTO ADICIONADO
                window.alertasDelDia.push({
                    titulo: 'Jornada Finalizada',
                    descripcion: `${mov.nombre} ${mov.apellido} (C.I. V-${mov.cedula}) finalizó jornada a las ${mov.hora}`,
                    icono: 'logout',
                    color: 'text-gray-500'
                });
            }
        });

        // Le comunica sincrónicamente al contenedor central que evalúe el estado visual del punto rojo
        if (typeof window.evaluarPuntoRojo === 'function') window.evaluarPuntoRojo();

    } catch (error) {
        console.error("Error al cargar notificaciones:", error);
    }
}

// === 📊 3. RENDERIZAR TABLA DE PERSONAL (GET DESDE SQLITE) ===
async function renderizarTablaEmpleados(filtro = '') {
    await cargarAlertasParaNotificaciones();

    const tbody = document.getElementById('tabla-empleados');
    const txtContador = document.getElementById('texto-contador-empleados');
    if (!tbody) return;

    try {
        const respuesta = await fetch('http://localhost:3000/api/personal');
        if (!respuesta.ok) throw new Error('No se pudo obtener la nómina del servidor.');
        
        const json = await respuesta.json();
        let listaEmpleados = json.datos || [];

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
            
            const estaActivo = emp.estatus === 1 || emp.estatus === true;
            
            const badgeEstatus = estaActivo
                ? `<span class="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-semibold">
                        <span class="material-symbols-outlined text-sm font-bold">check_circle</span> Activo
                   </span>`
                : `<span class="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-semibold">
                        <span class="material-symbols-outlined text-sm font-bold">cancel</span> Inactivo
                   </span>`;

            const cedulaNumericaPura = emp.cedula.toString().replace(/[^0-9]/g, '');

            const fila = document.createElement('tr');
            fila.className = 'hover:bg-surface-container/40 transition-colors border-b border-outline-variant/30';
            
            fila.innerHTML = `
                <td class="px-6 py-4 font-mono font-bold text-sm text-gray-700">V-${cedulaNumericaPura}</td>
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
    } catch (error) {
        console.error(error);
        mostrarToastPersonal('Error al conectar con la base de datos del personal.', 'error');
    }
}

// === 📝 4. MODIFICAR PERSONAL (CARGAR DATOS EN FORMULARIO) ===
window.abrirModalModificar = async function(cedula) {
    try {
        const respuesta = await fetch('http://localhost:3000/api/personal');
        if (!respuesta.ok) return;
        
        const json = await respuesta.json();
        const emp = (json.datos || []).find(e => e.cedula === cedula);
        if (!emp) return;

        const modal = document.getElementById('employeeModal');
        const form = document.getElementById('form-empleado');
        const txtTitulo = document.getElementById('modal-titulo');

        if (!modal || !form) return;

        document.getElementById('form-cedula').value = emp.cedula.toString().replace(/[^0-9]/g, '');
        document.getElementById('form-cedula').disabled = true; 
        document.getElementById('form-nombre').value = emp.nombre;
        document.getElementById('form-apellido').value = emp.apellido || '';
        document.getElementById('form-cargo').value = emp.cargo;
        document.getElementById('form-departamento').value = emp.departamento;
        document.getElementById('form-turno').value = emp.turno || 'Mañana';
        
        const estatusValor = (emp.estatus === 1 || emp.estatus === true) ? 'true' : 'false';
        document.getElementById('form-estatus').value = estatusValor;

        form.dataset.mode = 'edit';
        form.dataset.editCedula = cedula;
        
        if (txtTitulo) txtTitulo.textContent = "Modificar Personal de la E.T.I.";

        modal.classList.remove('hidden');
    } catch (err) {
        mostrarToastPersonal('Error al precargar los datos del trabajador.', 'error');
    }
}

// === ❌ 5. ELIMINAR REGISTRO DE TRABAJADOR (DELETE API) ===
window.eliminarEmpleado = async function(cedula) {
    if (confirm(`¿Está seguro de que desea eliminar permanentemente la C.I. V-${cedula.toString().replace(/[^0-9]/g, '')} del directorio institucional?\n\nNota: Esto puede verse afectado por la integridad referencial si posee registros de asistencia.`)) {
        try {
            const respuesta = await fetch(`http://localhost:3000/api/personal/${cedula}`, {
                method: 'DELETE'
            });

            const resultado = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(resultado.error || 'No se pudo eliminar el registro.');
            }

            mostrarToastPersonal(`Registro removido con éxito de SQLite.`, 'exito');
            renderizarTablaEmpleados(document.getElementById('input-filtrar-tabla')?.value || '');
        } catch (error) {
            mostrarToastPersonal(error.message, 'error');
        }
    }
}

// === 🔍 6. VERIFICACIÓN DE ASISTENCIA RÁPIDA (LUPA) ===
async function ejecutarVerificacionAsistenciaExpress(valorInput) {
    const cedulaBuscar = valorInput.trim().replace(/[^0-9]/g, '');
    if (!cedulaBuscar) {
        mostrarToastPersonal('Ingrese un número de cédula válido.', 'error');
        return;
    }

    try {
        const hoyStr = new Date().toLocaleDateString('es-ES').replace(/-/g, '/');
        const respuesta = await fetch('http://localhost:3000/api/asistencia');
        if (!respuesta.ok) return;

        const json = await respuesta.json();
        const marcas = json.auditoria || [];

        const marcasPersonaHoy = marcas.filter(m => {
            const fReg = m.fecha ? m.fecha.replace(/-/g, '/') : '';
            return m.cedula.toString().replace(/[^0-9]/g, '') === cedulaBuscar && fReg === hoyStr;
        });

        if (marcasPersonaHoy.length === 0) {
            mostrarToastPersonal(`C.I. V-${cedulaBuscar}: Ausente - Sin actividad hoy. 🔴`, 'error');
            return;
        }

        marcasPersonaHoy.sort((a, b) => b.timestamp - a.timestamp);
        const ultimoMov = marcasPersonaHoy[0].tipo_movimiento;

        let estatusTexto = '';
        if (ultimoMov === 'Entrada') estatusTexto = 'Presente en la Institución 🟢';
        else if (ultimoMov === 'Salida Almuerzo') estatusTexto = 'Almuerzo en proceso ⏰';
        else if (ultimoMov === 'Retorno Almuerzo') estatusTexto = 'Retornó de Almuerzo 🏢';
        else if (ultimoMov === 'Salida') estatusTexto = 'Jornada Finalizada 🔴';

        mostrarToastPersonal(`C.I. V-${cedulaBuscar}: Estatus actual -> ${estatusTexto}`, 'exito');
    } catch (error) {
        mostrarToastPersonal('Error al consultar el estatus rápido.', 'error');
    }
}

// === 🚀 8. INICIALIZADOR COMPLETO DEL DOM ===
document.addEventListener('DOMContentLoaded', () => {
    renderizarTablaEmpleados();

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

    // === 🔥 GUARDAR / MODIFICAR TRABAJADORES (POST / PUT API) ===
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            const cedula = document.getElementById('form-cedula').value.trim().replace(/[^0-9]/g, '');
            const nombre = document.getElementById('form-nombre').value.trim();
            const apellido = document.getElementById('form-apellido').value.trim();
            const cargo = document.getElementById('form-cargo').value;
            const departamento = document.getElementById('form-departamento').value;
            const turno = document.getElementById('form-turno').value;
            
            const estatus = document.getElementById('form-estatus').value === 'true';

            if (form.dataset.mode !== 'edit') {
                const filasTabla = document.querySelectorAll('#tabla-empleados tr');
                let cedulaDuplicadaUI = false;

                filasTabla.forEach(fila => {
                    if (fila.textContent.includes(`V-${cedula}`)) {
                        cedulaDuplicadaUI = true;
                    }
                });

                if (cedulaDuplicadaUI) {
                    mostrarToastPersonal(`Operación Abortada: La C.I. V-${cedula} ya se encuentra registrada en el directorio.`, 'error');
                    return; 
                }
            }

            const payload = { cedula, nombre, apellido, cargo, departamento, turno, estatus };

            try {
                let url = 'http://localhost:3000/api/personal';
                let metodo = 'POST';

                if (form.dataset.mode === 'edit') {
                    const editCedula = form.dataset.editCedula.toString().replace(/[^0-9]/g, '');
                    url = `http://localhost:3000/api/personal/${editCedula}`;
                    metodo = 'PUT';
                }

                const respuesta = await fetch(url, {
                    method: metodo,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const resultado = await respuesta.json();

                if (!respuesta.ok) {
                    throw new Error(resultado.error || 'Ocurrió un error en la transacción.');
                }

                if (form.dataset.mode === 'edit') {
                    mostrarToastPersonal(`Datos actualizados con éxito en SQLite.`, 'exito');
                } else {
                    mostrarToastPersonal(`${nombre} ha sido añadido a la base de datos.`, 'exito');
                }

                cerrarYLimpiarModal(); 
                renderizarTablaEmpleados(inputFiltro?.value || '');

            } catch (error) {
                mostrarToastPersonal(error.message, 'error');
            }
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