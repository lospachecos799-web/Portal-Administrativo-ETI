// --- LÓGICA DE CONTROL DE REPORTES - CONECTIVIDAD RELACIONAL COMPLETA - E.T.I. ---

// GUARDIA DE SEGURIDAD Y PINTADO DINÁMICO INVERTIDO (UI/UX OPTIMIZADO)
function verificarYAsignarSesion() {
    const sesionStr = sessionStorage.getItem('sesion_eti_activa');
    if (!sesionStr) {
        window.location.href = 'index.html';
        return null;
    }
    const datosSesion = JSON.parse(sesionStr);
    const txtUsuarioIzq = document.getElementById('txt-perfil-izq-usuario');
    const txtRolIzq = document.getElementById('txt-perfil-izq-role') || document.getElementById('txt-perfil-izq-rol');
    
    // Ajuste dinámico: Panel izquierdo muestra Nombre y Perfil
    if (txtUsuarioIzq) txtUsuarioIzq.textContent = datosSesion.nombreOperador; 
    if (txtRolIzq) txtRolIzq.textContent = datosSesion.rol;             
    
    return datosSesion;
}

function mostrarToastReportes(mensaje, tipo) {
    const existantToast = document.getElementById('toast-reportes');
    if (existantToast) existantToast.remove();

    const toast = document.createElement('div');
    toast.id = 'toast-reportes';
    const colorIcono = tipo === 'exito' ? 'text-green-400' : 'text-red-500';
    const icono = tipo === 'exito' ? 'check_circle' : 'warning';

    toast.className = 'fixed bottom-8 right-8 bg-gray-900 text-white px-6 py-4 rounded-lg shadow-xl z-[100] transform transition-all duration-300 flex items-center gap-3 border border-gray-700';
    toast.innerHTML = `<span class="material-symbols-outlined ${colorIcono}">${icono}</span> <span class="text-sm font-medium">${mensaje}</span>`;

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function obtenerInicialesNombre(nombre, apellido) {
    const pN = nombre ? nombre[0] : 'E';
    const pA = apellido ? apellido[0] : 'T';
    return (pN + pA).toUpperCase();
}

function ejecutarVerificacionAsistenciaExpress(valorInput) {
    const cedulaBuscar = valorInput.trim().replace(/[^0-9]/g, '');
    if (!cedulaBuscar) {
        mostrarToastReportes('Ingrese un número de cédula válido.', 'error');
        return;
    }

    const hoyStr = new Date().toLocaleDateString('es-ES').replace(/-/g, '/');
    let marcasStr = localStorage.getItem('asistencia_eti');
    let marcas = marcasStr ? JSON.parse(marcasStr) : [];

    const marcasPersonaHoy = marcas.filter(m => {
        const fechaRegStr = m.fecha ? m.fecha.replace(/-/g, '/') : '';
        return m.cedula === cedulaBuscar && fechaRegStr === hoyStr;
    });

    if (marcasPersonaHoy.length === 0) {
        mostrarToastReportes(`C.I. V-${cedulaBuscar}: Ausente - Sin actividad registrada hoy. 🔴`, 'error');
        return;
    }

    marcasPersonaHoy.sort((a, b) => b.timestamp - a.timestamp);
    const ultimoMov = marcasPersonaHoy[0].tipo;

    let estatusTexto = '';
    if (ultimoMov === 'Entrada') estatusTexto = 'Presente en la Institución 🟢';
    else if (ultimoMov === 'Salida Almuerzo') estatusTexto = 'Almuerzo en proceso ⏰';
    else if (ultimoMov === 'Retorno Almuerzo') estatusTexto = 'Retornó de Almuerzo 🏢';
    else if (ultimoMov === 'Salida') estatusTexto = 'Jornada Finalizada 🔴';

    mostrarToastReportes(`C.I. V-${cedulaBuscar}: Estatus actual -> ${estatusTexto}`, 'exito');
}

let filtroActual = 'diario';
let alertasDelDia = [];

function cargarRegistrosYMetricas() {
    const tbody = document.getElementById('tabla-registros');
    const txtTotalPersonal = document.getElementById('card-total-personal');
    const txtTotalAusentes = document.getElementById('card-total-ausentes');
    const txtTotalRetrasos = document.getElementById('card-total-retrasos');

    if (!tbody) return;

    const hoy = new Date();
    const hoyStr = hoy.toLocaleDateString('es-ES').replace(/-/g, '/');
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    let empleadosGuardadosStr = localStorage.getItem('empleados_eti');
    let listaEmpleados = empleadosGuardadosStr ? JSON.parse(empleadosGuardadosStr) : [];
    const nominaTotal = listaEmpleados.length > 0 ? listaEmpleados.length : 10;

    let registrosGuardadosStr = localStorage.getItem('asistencia_eti');
    let registrosLocales = registrosGuardadosStr ? JSON.parse(registrosGuardadosStr) : [];

    // ===============================================
    // CÁLCULO DE LAS MÉTRICAS DEL DÍA (Tarjetas Superiores)
    // ===============================================
    const movimientosHoy = registrosLocales.filter(r => {
        const fReg = r.fecha ? r.fecha.replace(/-/g, '/') : '';
        return fReg === hoyStr;
    });
    
    const cedulasPresentesHoy = new Set();
    let retrasosHoy = 0;

    alertasDelDia = [];

    movimientosHoy.forEach(mov => {
        if (mov.tipo === 'Entrada') {
            cedulasPresentesHoy.add(mov.cedula);

            const empleado = listaEmpleados.find(e => e.cedula === mov.cedula);
            const turno = empleado ? empleado.turno : 'Mañana';

            const partesHora = mov.hora.split(':');
            const horaInt = parseInt(partesHora[0]);
            const minutosInt = parseInt(partesHora[1].split(' ')[0]);
            
            // BLINDAJE DE SEGURIDAD: Limpieza de AM/PM contra espacios o puntos
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

    if (txtTotalPersonal) txtTotalPersonal.textContent = nominaTotal;
    if (txtTotalAusentes) txtTotalAusentes.textContent = totalAusentesHoy;
    if (txtTotalRetrasos) txtTotalRetrasos.textContent = retrasosHoy;

    const notifDot = document.getElementById('notif-dot');
    if (notifDot) {
        const cantidadLeidas = parseInt(sessionStorage.getItem('notifs_count_' + hoyStr) || '0');
        if (alertasDelDia.length > cantidadLeidas) {
            notifDot.classList.remove('hidden');
        } else {
            notifDot.classList.add('hidden');
        }
    }

    // ===============================================
    // LÓGICA DE FILTRADO DE LA TABLA
    // ===============================================
    let registrosFiltrados = registrosLocales.filter(registro => {
        if (!registro.fecha) return false;
        const fechaRegStr = registro.fecha.replace(/-/g, '/');
        if (filtroActual === 'todo') return true;
        if (filtroActual === 'diario') return fechaRegStr === hoyStr;

        const partes = fechaRegStr.split('/');
        const fechaReg = new Date(parseInt(partes[2]), parseInt(partes[1]) - 1, parseInt(partes[0]));

        if (filtroActual === 'mensual') {
            return fechaReg.getMonth() === mesActual && fechaReg.getFullYear() === anioActual;
        } else if (filtroActual === 'trimestral') {
            const limiteTrimestre = new Date();
            limiteTrimestre.setMonth(limiteTrimestre.getMonth() - 3);
            return fechaReg >= limiteTrimestre && fechaReg <= hoy;
        }
        return true;
    });

    // ===============================================
    // CÁLCULO DINÁMICO DEL BADGE (OBJETIVO E.T.I)
    // ===============================================
    const fechasUnicas = new Set();
    const asistenciasUnicas = new Set(); 

    registrosFiltrados.forEach(r => {
        const fechaRegStr = r.fecha.replace(/-/g, '/');
        fechasUnicas.add(fechaRegStr);
        if (r.tipo === 'Entrada') {
            asistenciasUnicas.add(`${r.cedula}-${fechaRegStr}`);
        }
    });

    const diasActivos = fechasUnicas.size;
    let porcentajeAsistencia = 0;
    if (diasActivos > 0) porcentajeAsistencia = Math.round((asistenciasUnicas.size / (diasActivos * nominaTotal)) * 100);
    else if (filtroActual === 'diario' && diasActivos === 0) porcentajeAsistencia = 0;
    else porcentajeAsistencia = 100;

    const badgeMeta = document.getElementById('badge-meta-reporte');
    const indicadorMeta = document.getElementById('indicador-meta-reporte');
    const textoMeta = document.getElementById('texto-meta-reporte');

    if (badgeMeta && indicadorMeta && textoMeta) {
        if (porcentajeAsistencia < 98) {
            badgeMeta.className = "flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-full border border-red-200 transition-colors duration-300";
            indicadorMeta.className = "w-2 h-2 rounded-full bg-red-600 animate-pulse";
            textoMeta.className = "text-xs font-bold text-red-700";
            textoMeta.textContent = `Alerta E.T.I: ${porcentajeAsistencia}% / 98%`;
        } else {
            badgeMeta.className = "flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20 transition-colors duration-300";
            indicadorMeta.className = "w-2 h-2 rounded-full bg-primary animate-pulse";
            textoMeta.className = "text-xs font-bold text-primary";
            textoMeta.textContent = `Objetivo E.T.I: ${porcentajeAsistencia}%`;
        }
    }

    if (registrosFiltrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="px-8 py-8 text-center text-gray-400 font-medium text-xs">No se encontraron movimientos registrados para este rango de tiempo.</td></tr>`;
        return;
    }

    const agrupados = {};
    registrosFiltrados.forEach(registro => {
        const fechaRegStr = registro.fecha.replace(/-/g, '/');
        const claveUnica = `${registro.cedula}-${fechaRegStr}`;
        if (!agrupados[claveUnica]) {
            agrupados[claveUnica] = { cedula: registro.cedula, fecha: fechaRegStr, hora_entrada: '--:--', hora_salida_almuerzo: '--:--', hora_retorno_almuerzo: '--:--', hora_salida: '--:--', timestamp_ultimo: 0, estatus_actual: '' };
        }
        if (registro.tipo === 'Entrada') agrupados[claveUnica].hora_entrada = registro.hora;
        else if (registro.tipo === 'Salida Almuerzo') agrupados[claveUnica].hora_salida_almuerzo = registro.hora;
        else if (registro.tipo === 'Retorno Almuerzo') agrupados[claveUnica].hora_retorno_almuerzo = registro.hora;
        else if (registro.tipo === 'Salida') agrupados[claveUnica].hora_salida = registro.hora;

        if (registro.timestamp > agrupados[claveUnica].timestamp_ultimo) {
            agrupados[claveUnica].timestamp_ultimo = registro.timestamp;
            agrupados[claveUnica].estatus_actual = registro.tipo;
        }
    });

    const registrosConsolidados = Object.values(agrupados).sort((a, b) => b.timestamp_ultimo - a.timestamp_ultimo);

    // =================================================================
    // RENDERIZADO DE TABLA DE AUDITORÍA CON DOSIFICACIÓN DE MÁRGENES
    // =================================================================
    tbody.innerHTML = '';
    registrosConsolidados.forEach(registro => {
        let estatusHtml = '';
        if (registro.estatus_actual === 'Entrada') estatusHtml = `<span class="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-bold w-24 shadow-sm"><span class="material-symbols-outlined text-sm font-bold">check_circle</span> Activo</span>`;
        else if (registro.estatus_actual === 'Salida Almuerzo') estatusHtml = `<span class="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold w-24 shadow-sm"><span class="material-symbols-outlined text-sm">restaurant</span> Almuerzo</span>`;
        else if (registro.estatus_actual === 'Retorno Almuerzo') estatusHtml = `<span class="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold w-24 shadow-sm"><span class="material-symbols-outlined text-sm">restaurant_menu</span> Retorno</span>`;
        else if (registro.estatus_actual === 'Salida') estatusHtml = `<span class="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-bold w-24 shadow-sm"><span class="material-symbols-outlined text-sm font-bold">logout</span> Finalizado</span>`;

        const empleadoEncontrado = listaEmpleados.find(e => e.cedula === registro.cedula);
        const nombreReal = empleadoEncontrado ? empleadoEncontrado.nombre : "Colaborador";
        const apellidoReal = empleadoEncontrado ? empleadoEncontrado.apellido : "Activo";
        const iniciales = obtenerInicialesNombre(nombreReal, apellidoReal);

        // Se usa px-3 en los relojes intermedios para un acople fluido y sin desbordes de scroll
        const badgeEntrada = registro.hora_entrada !== '--:--' ? `<div class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50/50 text-green-700 border border-green-100 rounded-full text-[11px] font-bold shadow-sm whitespace-nowrap"><span class="material-symbols-outlined text-[14px]">login</span> ${registro.hora_entrada}</div>` : `<span class="text-gray-300 font-medium tracking-widest block text-center text-xs">--:--</span>`;
        const badgeAlmuerzo = registro.hora_salida_almuerzo !== '--:--' ? `<div class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50/50 text-amber-700 border border-amber-100 rounded-full text-[11px] font-bold shadow-sm whitespace-nowrap"><span class="material-symbols-outlined text-[14px]">restaurant</span> ${registro.hora_salida_almuerzo}</div>` : `<span class="text-gray-300 font-medium tracking-widest block text-center text-xs">--:--</span>`;
        const badgeRetorno = registro.hora_retorno_almuerzo !== '--:--' ? `<div class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50/50 text-blue-700 border border-blue-100 rounded-full text-[11px] font-bold shadow-sm whitespace-nowrap"><span class="material-symbols-outlined text-[14px]">dinner_dining</span> ${registro.hora_retorno_almuerzo}</div>` : `<span class="text-gray-300 font-medium tracking-widest block text-center text-xs">--:--</span>`;
        const badgeSalida = registro.hora_salida !== '--:--' ? `<div class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50/50 text-red-700 border border-red-100 rounded-full text-[11px] font-bold shadow-sm whitespace-nowrap"><span class="material-symbols-outlined text-[14px]">logout</span> ${registro.hora_salida}</div>` : `<span class="text-gray-300 font-medium tracking-widest block text-center text-xs">--:--</span>`;

        const fila = document.createElement('tr');
        fila.className = 'hover:bg-surface-container/30 transition-colors border-b border-outline-variant/30 align-middle';
        
        fila.innerHTML = `
            <td class="px-6 py-4.5">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">${iniciales}</div>
                    <div>
                        <p class="font-bold text-on-surface text-sm leading-tight whitespace-nowrap">${nombreReal} ${apellidoReal}</p>
                        <p class="text-[11px] text-on-surface-variant font-medium mt-0.5">C.I: V-${registro.cedula}</p>
                    </div>
                </div>
            </td>
            <td class="px-3 py-4.5 font-mono font-bold text-xs text-gray-500 text-center">${registro.fecha}</td>
            <td class="px-3 py-4.5 text-center">${badgeEntrada}</td>
            <td class="px-3 py-4.5 text-center">${badgeAlmuerzo}</td>
            <td class="px-3 py-4.5 text-center">${badgeRetorno}</td>
            <td class="px-3 py-4.5 text-center">${badgeSalida}</td>
            <td class="px-6 py-4.5 text-center">${estatusHtml}</td>
        `;
        tbody.appendChild(fila);
    });
}

function exportarDatosAPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const filas = document.querySelectorAll('#tabla-registros tr');
    if (filas.length === 0 || (filas[0].querySelector('td') && filas[0].querySelector('td').textContent.includes('No se encontraron'))) {
        mostrarToastReportes('No hay datos en pantalla para exportar.', 'error');
        return;
    }
    doc.setFont("Helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(0, 110, 47); doc.text("E.T.I. LEONARDO INFANTE", 14, 15);
    doc.setFontSize(10); doc.setTextColor(20, 27, 64); doc.text("Portal Administrativo - Control de Asistencia y Gestión de Talento Humano", 14, 21);
    doc.setFontSize(13); doc.text(`Reporte Institucional de Asistencia - Balance ${filtroActual.toUpperCase()}`, 14, 32);
    doc.setFont("Helvetica", "normal"); doc.setFontSize(9); doc.text(`Fecha de emisión: ${new Date().toLocaleString('es-ES')}`, 14, 38);

    const matrizCuerpo = [];
    filas.forEach(fila => {
        const pNombre = fila.querySelector('td:nth-child(1) p.font-bold');
        const pCedula = fila.querySelector('td:nth-child(1) p.text-\\[11px\\]');
        const c_colaborador = pNombre ? pNombre.textContent.trim() : 'Desconocido';
        const c_cedula = pCedula ? pCedula.textContent.replace('C.I: ', '').trim() : '---';
        const c_fecha = fila.querySelector('td:nth-child(2)') ? fila.querySelector('td:nth-child(2)').textContent.trim() : '---';
        const c_entrada = fila.querySelector('td:nth-child(3)') ? fila.querySelector('td:nth-child(3)').textContent.replace('login', '').trim() : '--:--';
        const c_almuerzo = fila.querySelector('td:nth-child(4)') ? fila.querySelector('td:nth-child(4)').textContent.replace('restaurant', '').trim() : '--:--';
        const c_retorno = fila.querySelector('td:nth-child(5)') ? fila.querySelector('td:nth-child(5)').textContent.replace('dinner_dining', '').trim() : '--:--';
        const c_salida = fila.querySelector('td:nth-child(6)') ? fila.querySelector('td:nth-child(6)').textContent.replace('logout', '').trim() : '--:--';
        const c_estatus = fila.querySelector('td:nth-child(7)') ? fila.querySelector('td:nth-child(7)').textContent.replace(/check_circle|logout|restaurant_menu|restaurant|cancel/g, '').trim() : '---';
        matrizCuerpo.push([c_colaborador, c_cedula, c_fecha, c_entrada, c_almuerzo, c_retorno, c_salida, c_estatus]);
    });

    doc.autoTable({ startY: 44, head: [['Colaborador Institucional', 'Cédula', 'Fecha', 'Entrada', 'S. Almuerzo', 'R. Almuerzo', 'Salida', 'Estatus']], body: matrizCuerpo, theme: 'striped', headStyles: { fillColor: [0, 110, 47], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 }, styles: { fontSize: 8.5, cellPadding: 3.5, font: "Helvetica" }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 }, 1: { fontStyle: 'bold' } }, gridStyles: { lineColor: [220, 220, 220], lineWidth: 0.2 } });
    doc.save(`reporte_asistencia_eti_${filtroActual}_${new Date().toISOString().slice(0,10)}.pdf`);
    mostrarToastReportes('Matriz de asistencia exportada a documento PDF con éxito.', 'exito');
}

function cambiarFiltroActivo(tipoFiltro) {
    filtroActual = tipoFiltro; cargarRegistrosYMetricas();
    mostrarToastReportes(`Cambiado a vista de balance: ${tipoFiltro.toUpperCase()}`, 'exito');
}

function inicializarMenusSuperiores(datosSesion) {
    const btnNotif = document.querySelector('button span[data-icon="notifications"]')?.parentElement;
    const btnAyuda = document.querySelector('button span[data-icon="help"]')?.parentElement;
    const btnPerfil = document.querySelector('button span[data-icon="account_circle"]')?.parentElement;

    // INTERCAMBIO INTERFAZ: Menú superior flotante renderiza el correo electrónico del operador
    const cuentaMenuSuperior = datosSesion ? datosSesion.usuario : 'admin.name@escuela.edu';

    if (btnNotif) {
        btnNotif.addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('notif-dot')?.classList.add('hidden');
            const hoyStr = new Date().toLocaleDateString('es-ES').replace(/-/g, '/');
            sessionStorage.setItem('notifs_count_' + hoyStr, alertasDelDia.length.toString());

            limpiarMenusFlotantes();
            const menu = document.createElement('div'); menu.id = 'dropdown-flotante';
            menu.className = 'absolute right-[12%] top-16 bg-white border border-gray-200 w-80 rounded-xl shadow-xl z-50 overflow-hidden text-left';
            let listaAlertasHtml = '';
            if (alertasDelDia.length === 0) listaAlertasHtml = `<div class="p-4 text-center text-sm text-gray-500">No hay novedades escolares registradas hoy.</div>`;
            else {
                alertasDelDia.forEach(alerta => {
                    listaAlertasHtml += `<div class="p-3 border-b border-gray-100 hover:bg-gray-50 flex gap-3 items-start transition-colors text-left"><span class="material-symbols-outlined ${alerta.color} text-xl">${alerta.icono}</span><div><p class="text-xs font-bold text-gray-800">${alerta.titulo}</p><p class="text-[11px] text-gray-500 mt-0.5">${alerta.descripcion}</p></div></div>`;
                });
            }
            menu.innerHTML = `<div class="px-4 py-2.5 bg-gray-50 border-b border-gray-200 font-bold text-xs text-gray-700 flex justify-between items-center"><span>Novedades de la Jornada</span><span class="px-1.5 py-0.5 bg-gray-200 rounded-full text-[10px]">${alertasDelDia.length}</span></div><div class="max-h-64 overflow-y-auto custom-scrollbar">${listaAlertasHtml}</div>`;
            btnNotif.parentElement.appendChild(menu);
        });
    }

    if (btnAyuda) {
        btnAyuda.addEventListener('click', (e) => {
            e.stopPropagation(); limpiarMenusFlotantes();
            const menu = document.createElement('div'); menu.id = 'dropdown-flotante';
            menu.className = 'absolute right-[6%] top-16 bg-white border border-gray-200 w-72 rounded-xl shadow-xl z-50 p-4 text-left';
            menu.innerHTML = `<h4 class="text-xs font-bold text-gray-800 mb-2 flex items-center gap-2"><span class="material-symbols-outlined text-sm text-green-600">school</span> Control E.T.I. Infante</h4><p class="text-[11px] text-gray-600 leading-relaxed mb-2">• <b>Horario de Entrada:</b> 07:00 a. m. (Mañana) / 01:00 p. m. (Tarde).</p><p class="text-[11px] text-gray-600 leading-relaxed mb-2">• <b>Personal Institucional:</b> Supervisión global de Personal Docente, Administrativo y Obrero.</p><p class="text-[11px] text-gray-600 leading-relaxed">• <b>Porcentaje de Asistencia:</b> Indicador basado sobre la matrícula activa total de trabajadores.</p>`;
            btnAyuda.parentElement.appendChild(menu);
        });
    }

    if (btnPerfil) {
        btnPerfil.addEventListener('click', (e) => {
            e.stopPropagation(); limpiarMenusFlotantes();
            const menu = document.createElement('div'); menu.id = 'dropdown-flotante';
            menu.className = 'absolute right-[2%] top-16 bg-white border border-gray-200 w-52 rounded-xl shadow-xl z-50 overflow-hidden text-left';
            menu.innerHTML = `
                <div class="p-3 bg-gray-50 border-b border-gray-200"><p class="text-xs font-bold text-gray-800 truncate" title="${cuentaMenuSuperior}">${cuentaMenuSuperior}</p><p class="text-[10px] text-gray-500">E.T.I. Leonardo Infante</p></div>
                <a href="configuracion.html" class="px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2"><span class="material-symbols-outlined text-sm">settings</span> Ajustes del Sistema</a>
                <a href="index.html" onclick="sessionStorage.clear()" class="px-4 py-2 text-xs text-red-600 hover:bg-red-50 border-t border-gray-100 flex items-center gap-2"><span class="material-symbols-outlined text-sm">logout</span> Salir del Portal</a>
            `;
            btnPerfil.parentElement.appendChild(menu);
        });
    }
    document.addEventListener('click', limpiarMenusFlotantes);
}

function limpiarMenusFlotantes() { document.getElementById('dropdown-flotante')?.remove(); }

function inicializarManejadoresMódulo() {
    const inputBuscarGlobal = document.getElementById('input-buscar-global');
    if (inputBuscarGlobal) {
        const iconoLupa = inputBuscarGlobal.parentElement.querySelector('.material-symbols-outlined');
        if (iconoLupa) {
            iconoLupa.style.cursor = 'pointer'; iconoLupa.style.pointerEvents = 'auto';
            iconoLupa.addEventListener('click', () => { ejecutarVerificacionAsistenciaExpress(inputBuscarGlobal.value); inputBuscarGlobal.value = ''; });
        }
        inputBuscarGlobal.addEventListener('keypress', function(e) { if (e.key === 'Enter') { ejecutarVerificacionAsistenciaExpress(this.value); this.value = ''; } });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // DISPARAR GUARDIA
    const datosSesion = verificarYAsignarSesion();
    
    cargarRegistrosYMetricas();
    inicializarMenusSuperiores(datosSesion);
    inicializarManejadoresMódulo();

    document.getElementById('btn-filtro-diario')?.addEventListener('click', () => cambiarFiltroActivo('diario'));
    document.getElementById('btn-filtro-mensual')?.addEventListener('click', () => cambiarFiltroActivo('mensual'));
    document.getElementById('btn-filtro-trimestral')?.addEventListener('click', () => cambiarFiltroActivo('trimestral'));
    document.getElementById('btn-filtro-todo')?.addEventListener('click', () => cambiarFiltroActivo('todo'));
    document.getElementById('btn-exportar-pdf')?.addEventListener('click', exportarDatosAPDF);
});