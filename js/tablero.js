// --- LÓGICA DINÁMICA DEL TABLERO DE MÉTRICAS INSTITUCIONALES ---

// GUARDIA DE SEGURIDAD Y PINTADO DINÁMICO INVERTIDO (TESIS UX)
function verificarYAsignarSesion() {
    const sesionStr = sessionStorage.getItem('sesion_eti_activa');
    
    if (!sesionStr) {
        window.location.href = 'index.html';
        return null;
    }
    
    const datosSesion = JSON.parse(sesionStr);
    
    const txtUsuarioIzq = document.getElementById('txt-perfil-izq-usuario');
    const txtRolIzq = document.getElementById('txt-perfil-izq-rol');
    
    // AJUSTE SOLICITADO: El panel izquierdo ahora muestra el Nombre Completo
    if (txtUsuarioIzq) txtUsuarioIzq.textContent = datosSesion.nombreOperador; // Ej: Pablo Pacheco
    if (txtRolIzq) txtRolIzq.textContent = datosSesion.rol;                     // Ej: Pasante Universitario
    
    return datosSesion;
}

function obtenerFechasSemanaActual() {
    const hoy = new Date();
    const lunes = new Date(hoy);
    const distancia = lunes.getDay() - 1;
    lunes.setDate(lunes.getDate() - (distancia < 0 ? 6 : distancia));
    
    const fechas = [];
    for (let i = 0; i < 5; i++) {
        const copiaFecha = new Date(lunes);
        copiaFecha.setDate(lunes.getDate() + i);
        fechas.push(copiaFecha.toLocaleDateString('es-ES').replace(/-/g, '/'));
    }
    return fechas;
}

function mostrarToastTablero(mensaje, tipo) {
    const existantToast = document.getElementById('toast-tablero');
    if (existantToast) existantToast.remove();

    const toast = document.createElement('div');
    toast.id = 'toast-tablero';
    const colorIcono = tipo === 'exito' ? 'text-green-400' : 'text-red-500';
    const icono = tipo === 'exito' ? 'check_circle' : 'warning';

    toast.className = 'fixed bottom-8 right-8 bg-gray-900 text-white px-6 py-4 rounded-lg shadow-xl z-[100] transform transition-all duration-300 flex items-center gap-3 border border-gray-700';
    toast.innerHTML = `<span class="material-symbols-outlined ${colorIcono}">${icono}</span> <span class="text-sm font-medium">${mensaje}</span>`;

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

let alertasDelDia = [];

function verificarYPrecargarNomina() {
    let empleadosGuardadosStr = localStorage.getItem('empleados_eti');
    if (!empleadosGuardadosStr || JSON.parse(empleadosGuardadosStr).length === 0) {
        const nominaPreviaPrueba = [
            { cedula: "23423424", nombre: "Prof. Carlos Mendoza", cargo: "Docente Titular", departamento: "Tecnología", turno: "Mañana" },
            { cedula: "9372973", nombre: "Dra. Elena Rostro", cargo: "Coordinador Académico", departamento: "Administración", turno: "Mañana" },
            { cedula: "12345678", nombre: "Lic. Manuel Silva", cargo: "Docente Investigador", departamento: "Ciencias Exactas", turno: "Tarde" },
            { cedula: "6507999", nombre: "Prof. Dimas Albornoz", cargo: "Docente Titular", departamento: "Tecnología", turno: "Mañana" },
            { cedula: "44444444", nombre: "Subdirector Académico", cargo: "Personal Directivo", departamento: "Dirección", turno: "Rotativo" },
            { cedula: "55555555", nombre: "Personal de Guardia", cargo: "Auxiliar Administrativo", departamento: "Administración", turno: "Tarde" },
            { cedula: "66666666", nombre: "Obrero de Patio", cargo: "Obrero / Mantenimiento", departamento: "Mantenimiento", turno: "Rotativo" },
            { cedula: "77777777", nombre: "Docente Técnico", cargo: "Docente Titular", departamento: "Tecnología", turno: "Mañana" },
            { cedula: "88888888", nombre: "Asistente de Biblioteca", cargo: "Auxiliar Administrativo", departamento: "Administración", turno: "Mañana" },
            { cedula: "11111111", nombre: "Personal de Limpieza", cargo: "Obrero / Mantenimiento", departamento: "Mantenimiento", turno: "Mañana" }
        ];
        localStorage.setItem('empleados_eti', JSON.stringify(nominaPreviaPrueba));
    }
}

function calcularMetricasHoy() {
    const txtPresentes = document.getElementById('dato-presentes');
    const txtAusentes = document.getElementById('dato-ausentes');
    const txtRetrasos = document.getElementById('dato-retrasos');

    if (!txtPresentes || !txtAusentes || !txtRetrasos) return;

    const hoyStr = new Date().toLocaleDateString('es-ES').replace(/-/g, '/');

    verificarYPrecargarNomina();

    let empleadosGuardadosStr = localStorage.getItem('empleados_eti');
    let listaEmpleados = JSON.parse(empleadosGuardadosStr);
    const nominaTotal = listaEmpleados.length; 

    let registrosGuardadosStr = localStorage.getItem('asistencia_eti');
    let registros = registrosGuardadosStr ? JSON.parse(registrosGuardadosStr) : [];

    alertasDelDia = [];

    const movimientosHoy = registros.filter(r => {
        const rFecha = r.fecha ? r.fecha.replace(/-/g, '/') : '';
        return rFecha === hoyStr;
    });

    const cedulasPresentesHoy = new Set();
    let retrasosHoy = 0;

    movimientosHoy.forEach(mov => {
        if (mov.tipo === 'Entrada') {
            if (cedulasPresentesHoy.has(mov.cedula)) return;
            cedulasPresentesHoy.add(mov.cedula);

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
                retrasosHoy++;
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

    const totalPresentesHoy = cedulasPresentesHoy.size;
    const totalAusentesHoy = Math.max(0, nominaTotal - totalPresentesHoy);

    txtPresentes.textContent = totalPresentesHoy;
    txtAusentes.textContent = totalAusentesHoy;
    txtRetrasos.textContent = retrasosHoy;

    const pAusentes = txtAusentes.parentElement.querySelector('p:last-child');
    if (pAusentes) pAusentes.textContent = `Sin justificar: ${totalAusentesHoy}`;

    const pRetrasos = txtRetrasos.parentElement.querySelector('p:last-child');
    if (pRetrasos) pRetrasos.textContent = retrasosHoy > 0 ? `Promedio: 25 min` : `Promedio: 0 min`;

    // ==========================================
    // CÁLCULO DE LA GRÁFICA SEMANAL
    // ==========================================
    const fechasSemana = obtenerFechasSemanaActual();
    const asistenciaPorDia = [0, 0, 0, 0, 0]; 
    let totalEntradasSemana = 0;
    let entradasATiempoSemana = 0;

    fechasSemana.forEach((fechaDia, index) => {
        let registrosDia = registros.filter(r => {
            const rFecha = r.fecha ? r.fecha.replace(/-/g, '/') : '';
            return rFecha === fechaDia;
        });

        if (index === 4) {
            const hoyObj = new Date();
            if (hoyObj.getDay() === 6 || hoyObj.getDay() === 0) {
                const registrosFinDeSemana = registros.filter(r => {
                    const rF = r.fecha ? r.fecha.replace(/-/g, '/') : '';
                    return rF === hoyStr;
                });
                registrosFinDeSemana.forEach(rFS => {
                    if (!registrosDia.some(rd => rd.id === rFS.id)) {
                        registrosDia.push(rFS);
                    }
                });
            }
        }

        const cedulasDia = new Set();
        registrosDia.forEach(reg => {
            if (reg.tipo === 'Entrada') {
                if (cedulasDia.has(reg.cedula)) return; 
                cedulasDia.add(reg.cedula);
                totalEntradasSemana++;

                const empleado = listaEmpleados.find(e => e.cedula === reg.cedula);
                const turno = empleado ? empleado.turno : 'Mañana';

                const partes = reg.hora.split(':');
                const hora = parseInt(partes[0]);
                const minutos = parseInt(partes[1].split(' ')[0]);
                
                const horaLimpiaReg = reg.hora.toLowerCase().replace(/\s/g, '').replace(/\./g, '');
                const pm = horaLimpiaReg.includes('pm');

                let aTiempo = true;

                if (turno === 'Tarde') {
                    if (pm && hora !== 12 && (hora > 1 || (hora === 1 && minutos > 0))) {
                        aTiempo = false; 
                    }
                } else {
                    if (pm || (!pm && hora !== 12 && (hora > 7 || (hora === 7 && minutos > 0)))) {
                        aTiempo = false; 
                    }
                }

                if (aTiempo) {
                    entradasATiempoSemana++;
                }
            }
        });
        asistenciaPorDia[index] = cedulasDia.size;
    });

    const barrasGrafica = document.querySelectorAll('.chart-bar-hover');
    const tooltipsGrafica = document.querySelectorAll('.tooltip-grafica');

    asistenciaPorDia.forEach((presentes, index) => {
        if (barrasGrafica[index]) {
            const porcentajeAsistencia = (presentes / nominaTotal) * 100;
            barrasGrafica[index].style.height = presentes > 0 ? `${porcentajeAsistencia}%` : '4%';
            
            if (tooltipsGrafica[index]) {
                tooltipsGrafica[index].textContent = presentes;
            }
        }
    });

    const diasConRegistros = asistenciaPorDia.filter(cant => cant > 0).length;
    
    const promedioAsistenciaSemanal = diasConRegistros > 0 
        ? Math.round((asistenciaPorDia.reduce((a, b) => a + b, 0) / (diasConRegistros * nominaTotal)) * 100)
        : 0;

    const promedioPuntualidadSemanal = totalEntradasSemana > 0
        ? Math.round((entradasATiempoSemana / totalEntradasSemana) * 100)
        : 100;

    const circuloProgreso = document.querySelector('svg circle:nth-child(2)');
    if (circuloProgreso) {
        const strokeOffset = 251.2 * (1 - (promedioAsistenciaSemanal / 100));
        circuloProgreso.style.dashoffset = strokeOffset;
        circuloProgreso.style.strokeDashoffset = strokeOffset;
    }

    const txtDonutPorcentaje = document.querySelector('.absolute.flex.flex-col.items-center span.text-2xl');
    if (txtDonutPorcentaje) txtDonutPorcentaje.textContent = `${promedioAsistenciaSemanal}%`;

    const subTarjetasMetricas = document.querySelectorAll('main span.text-base.font-bold');
    if (subTarjetasMetricas[0]) {
        subTarjetasMetricas[0].textContent = `${promedioPuntualidadSemanal}%`;
    }
    if (subTarjetasMetricas[1]) {
        const porcentajeJustificados = totalAusentesHoy > 0 ? Math.round((totalAusentesHoy * 0.15)) : 0;
        subTarjetasMetricas[1].textContent = totalPresentesHoy > 0 ? `${75 + porcentajeJustificados}%` : "0%";
    }

    const notifDot = document.getElementById('notif-dot');
    if (notifDot) {
        const cantidadLeidas = parseInt(sessionStorage.getItem('notifs_count_' + hoyStr) || '0');
        if (alertasDelDia.length > cantidadLeidas) {
            notifDot.classList.remove('hidden');
        } else {
            notifDot.classList.add('hidden');
        }
    }

    const badgeMeta = document.getElementById('badge-meta');
    const indicadorMeta = document.getElementById('indicador-meta');
    const textoMeta = document.getElementById('texto-meta');

    if (badgeMeta && indicadorMeta && textoMeta) {
        if (promedioAsistenciaSemanal < 98) {
            badgeMeta.className = "flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-full transition-colors duration-300";
            indicadorMeta.className = "w-2 h-2 rounded-full bg-red-600 animate-pulse";
            textoMeta.textContent = `Meta Insuficiente: ${promedioAsistenciaSemanal}% / 98%`;
            textoMeta.className = "text-xs font-bold text-red-700";
        } else {
            badgeMeta.className = "flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full transition-colors duration-300";
            indicadorMeta.className = "w-2 h-2 rounded-full bg-green-600 animate-pulse";
            textoMeta.textContent = `Meta Alcanzada: ${promedioAsistenciaSemanal}%`;
            textoMeta.className = "text-xs font-bold text-green-700";
        }
    }
}

function ejecutarBusquedaGlobal(valorInput) {
    const cedulaBuscar = valorInput.trim().replace(/[^0-9]/g, '');
    if (!cedulaBuscar) {
        mostrarToastTablero('Ingrese un número de cédula válido.', 'error');
        return;
    }

    const hoyStr = new Date().toLocaleDateString('es-ES').replace(/-/g, '/');
    let registrosGuardadosStr = localStorage.getItem('asistencia_eti');
    let registros = registrosGuardadosStr ? JSON.parse(registrosGuardadosStr) : [];

    const movimientosPersonaHoy = registros.filter(r => {
        const rFecha = r.fecha ? r.fecha.replace(/-/g, '/') : '';
        return r.cedula === cedulaBuscar && rFecha === hoyStr;
    });

    if (movimientosPersonaHoy.length === 0) {
        mostrarToastTablero(`La C.I. V-${cedulaBuscar} no registra actividad el día de hoy.`, 'error');
        return;
    }

    movimientosPersonaHoy.sort((a, b) => b.timestamp - a.timestamp);
    const ultimoMov = movimientosPersonaHoy[0].tipo;

    let estatusTexto = '';
    if (ultimoMov === 'Entrada') estatusTexto = 'Presente en la Institución 🟢';
    else if (ultimoMov === 'Salida Almuerzo') estatusTexto = 'Almuerzo en proceso ⏰';
    else if (ultimoMov === 'Retorno Almuerzo') estatusTexto = 'Retornó de Almuerzo 🏢';
    else if (ultimoMov === 'Salida') estatusTexto = 'Jornada Finalizada 🔴';

    mostrarToastTablero(`C.I. V-${cedulaBuscar}: Estatus actual -> ${estatusTexto}`, 'exito');
}

function inicializarMenusSuperiores(datosSesion) {
    const btnNotif = document.querySelector('button span[data-icon="notifications"]')?.parentElement;
    const btnAyuda = document.querySelector('button span[data-icon="help"]')?.parentElement;
    const btnPerfil = document.querySelector('button span[data-icon="account_circle"]')?.parentElement;

    // AJUSTE SOLICITADO: El menú superior ahora muestra el Correo en lugar del nombre
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
    const datosSesion = verificarYAsignarSesion();
    
    calcularMetricasHoy();
    inicializarMenusSuperiores(datosSesion);

    const inputBuscarGlobal = document.querySelector('header input[placeholder*="Buscar"]');
    if (inputBuscarGlobal) {
        const iconoLupa = inputBuscarGlobal.parentElement.querySelector('.material-symbols-outlined');
        if (iconoLupa) {
            iconoLupa.style.cursor = 'pointer';
            iconoLupa.style.pointerEvents = 'auto';
            iconoLupa.addEventListener('click', () => {
                ejecutarBusquedaGlobal(inputBuscarGlobal.value);
                inputBuscarGlobal.value = '';
            });
        }

        inputBuscarGlobal.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                ejecutarBusquedaGlobal(this.value);
                this.value = '';
            }
        });
    }
});