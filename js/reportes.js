// --- LÓGICA DE CONTROL DE REPORTES - CONEXIÓN CON SQLITE BACKEND - E.T.I. ---

// (Nota: Las funciones de seguridad, menús superiores flotantes y cierre de sesión fueron removidas de aquí. 
// Ahora son gestionadas y unificadas globalmente por el archivo js/seguridad.js)

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

// === 🔍 2. VERIFICACIÓN DE ASISTENCIA RÁPIDA (LUPA) ===
async function ejecutarVerificacionAsistenciaExpress(valorInput) {
    const cedulaBuscar = valorInput.trim().replace(/[^0-9]/g, '');
    if (!cedulaBuscar) {
        mostrarToastReportes('Ingrese un número de cédula válido.', 'error');
        return;
    }

    try {
        const hoyStr = new Date().toLocaleDateString('es-ES').replace(/-/g, '/');
        const respuesta = await fetch('http://localhost:3000/api/asistencia');
        if (!respuesta.ok) return;

        const json = await respuesta.json();
        const marcas = json.auditoria || [];

        const marcasPersonaHoy = marcas.filter(m => {
            const fechaRegStr = m.fecha ? m.fecha.replace(/-/g, '/') : '';
            return m.cedula.toString().replace(/[^0-9]/g, '') === cedulaBuscar && fechaRegStr === hoyStr;
        });

        if (marcasPersonaHoy.length === 0) {
            mostrarToastReportes(`C.I. V-${cedulaBuscar}: Ausente - Sin actividad registrada hoy. 🔴`, 'error');
            return;
        }

        marcasPersonaHoy.sort((a, b) => b.timestamp - a.timestamp);
        const ultimoMov = marcasPersonaHoy[0].tipo_movimiento;

        let estatusTexto = '';
        if (ultimoMov === 'Entrada') estatusTexto = 'Presente en la Institución 🟢';
        else if (ultimoMov === 'Salida Almuerzo') estatusTexto = 'Almuerzo en proceso ⏰';
        else if (ultimoMov === 'Retorno Almuerzo') estatusTexto = 'Retornó de Almuerzo 🏢';
        else if (ultimoMov === 'Salida') estatusTexto = 'Jornada Finalizada 🔴';

        mostrarToastReportes(`C.I. V-${cedulaBuscar}: Estatus actual -> ${estatusTexto}`, 'exito');
    } catch (error) {
        mostrarToastReportes('Error al consultar el estatus rápido.', 'error');
    }
}

let filtroActual = 'diario';
window.alertasDelDia = [];
let empleadosGlobalesCache = [];

// === 📊 3. PROCESAMIENTO MATRICIAL Y MÉTRICAS ===
async function cargarRegistrosYMetricas() {
    const tbody = document.getElementById('tabla-registros');
    const txtTotalPersonal = document.getElementById('card-total-personal');
    const txtTotalAusentes = document.getElementById('card-total-ausentes');
    const txtTotalRetrasos = document.getElementById('card-total-retrasos');

    if (!tbody) return;

    const hoy = new Date();
    const hoyStr = hoy.toLocaleDateString('es-ES').replace(/-/g, '/');
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    try {
        const [respPersonal, respAsistencia] = await Promise.all([
            fetch('http://localhost:3000/api/personal'),
            fetch('http://localhost:3000/api/asistencia')
        ]);

        if (!respPersonal.ok || !respAsistencia.ok) throw new Error('Error al sincronizar con el backend.');

        const jsonPersonal = await respPersonal.json();
        const jsonAsistencia = await respAsistencia.json();

        const listaEmpleados = jsonPersonal.datos || [];
        empleadosGlobalesCache = listaEmpleados; 
        
        const registrosLocales = jsonAsistencia.auditoria || [];
        const nominaTotal = jsonPersonal.total || listaEmpleados.length || 10;

        // CÁLCULO DE LAS MÉTRICAS DEL DÍA
        const movimientosHoy = registrosLocales.filter(r => {
            const fReg = r.fecha ? r.fecha.replace(/-/g, '/') : '';
            return fReg === hoyStr;
        });
        
        const cedulasPresentesHoy = new Set();
        let retrasosHoy = 0;
        window.alertasDelDia = [];

        movimientosHoy.forEach(mov => {
            if (mov.tipo_movimiento === 'Entrada') {
                cedulasPresentesHoy.add(mov.cedula);

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
                    retrasosHoy++;
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
                window.alertasDelDia.push({
                    titulo: 'Retorno de Almuerzo',
                    descripcion: `${mov.nombre} ${mov.apellido} (C.I. V-${mov.cedula}) retornó a las ${mov.hora}`,
                    icono: 'restaurant_menu',
                    color: 'text-green-500'
                });
            } else if (mov.tipo_movimiento === 'Salida') {
                window.alertasDelDia.push({
                    titulo: 'Jornada Finalizada',
                    descripcion: `${mov.nombre} ${mov.apellido} (C.I. V-${mov.cedula}) finalizó jornada a las ${mov.hora}`,
                    icono: 'logout',
                    color: 'text-gray-500'
                });
            }
        });

        const totalPresentesHoy = cedulasPresentesHoy.size;
        const totalAusentesHoy = Math.max(0, nominaTotal - totalPresentesHoy);

        if (txtTotalPersonal) txtTotalPersonal.textContent = nominaTotal;
        if (txtTotalAusentes) txtTotalAusentes.textContent = totalAusentesHoy;
        if (txtTotalRetrasos) txtTotalRetrasos.textContent = retrasosHoy;

        if (typeof window.evaluarPuntoRojo === 'function') window.evaluarPuntoRojo();

        // LÓGICA DE FILTRADO DE LA TABLA
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

        // CÁLCULO DINÁMICO DEL BADGE (OBJETIVO E.T.I)
        const fechasUnicas = new Set();
        const asistenciasUnicas = new Set(); 

        registrosFiltrados.forEach(r => {
            const fechaRegStr = r.fecha.replace(/-/g, '/');
            fechasUnicas.add(fechaRegStr);
            if (r.tipo_movimiento === 'Entrada') {
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
            tbody.innerHTML = `<tr><td colspan="4" class="px-8 py-8 text-center text-gray-400 font-medium text-xs">No se encontraron movimientos registrados para este rango de tiempo.</td></tr>`;
            return;
        }

        // CONSOLIDACIÓN FILA POR DÍA POR EMPLEADO
        const agrupados = {};
        registrosFiltrados.forEach(reg => {
            const fechaRegStr = reg.fecha.replace(/-/g, '/');
            const claveUnica = `${reg.cedula}-${fechaRegStr}`;
            if (!agrupados[claveUnica]) {
                agrupados[claveUnica] = { cedula: reg.cedula, nombre: reg.nombre, apellido: reg.apellido, fecha: fechaRegStr, hora_entrada: '--:--', hora_salida_almuerzo: '--:--', hora_retorno_almuerzo: '--:--', hora_salida: '--:--', estatus_actual: '' };
            }
            if (reg.tipo_movimiento === 'Entrada') {
                agrupados[claveUnica].hora_entrada = reg.hora;
            } else if (reg.tipo_movimiento === 'Salida Almuerzo') {
                agrupados[claveUnica].hora_salida_almuerzo = reg.hora;
            } else if (reg.tipo_movimiento === 'Retorno Almuerzo') {
                agrupados[claveUnica].hora_retorno_almuerzo = reg.hora;
            } else if (reg.tipo_movimiento === 'Salida') {
                agrupados[claveUnica].hora_salida = reg.hora;
            }
        });

        const registrosConsolidados = Object.values(agrupados);

        tbody.innerHTML = '';
        registrosConsolidados.forEach(registro => {
            let estatusHtml = '';
            
            // ✨ ESTRATEGIA DEDUCTIVA CRONOLÓGICA (INMUNE A FALLAS DE TIMESTAMP DE BASE DE DATOS)
            if (registro.hora_salida !== '--:--') {
                estatusHtml = `<span class="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-bold w-28 shadow-sm"><span class="material-symbols-outlined text-sm font-bold">logout</span> Finalizado</span>`;
            } else if (registro.hora_retorno_almuerzo !== '--:--') {
                estatusHtml = `<span class="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold w-28 shadow-sm"><span class="material-symbols-outlined text-sm">restaurant_menu</span> Retorno</span>`;
            } else if (registro.hora_salida_almuerzo !== '--:--') {
                estatusHtml = `<span class="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold w-28 shadow-sm"><span class="material-symbols-outlined text-sm">restaurant</span> Almuerzo</span>`;
            } else if (registro.hora_entrada !== '--:--') {
                estatusHtml = `<span class="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-bold w-28 shadow-sm"><span class="material-symbols-outlined text-sm font-bold">check_circle</span> Activo</span>`;
            } else {
                estatusHtml = `<span class="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-500 border border-gray-200 rounded-full text-xs font-bold w-28 shadow-sm"><span class="material-symbols-outlined text-sm">info</span> Pendiente</span>`;
            }

            const nombreReal = registro.nombre || "Colaborador";
            const apellidoReal = registro.apellido || "Activo";
            const iniciales = obtenerInicialesNombre(nombreReal, apellidoReal);
            const cedulaNumericaPura = registro.cedula.toString().replace(/[^0-9]/g, '');

            // CONSTRUCCIÓN DEL TIMELINE FLOW INTEGRADO
            const timelineHtml = `
                <div class="flex items-center justify-between w-full max-w-lg mx-auto px-6 py-2 bg-gray-50/70 border border-gray-100 rounded-2xl relative">
                    <div class="absolute top-1/2 left-10 right-10 h-[2px] bg-gray-200 -translate-y-1/2 z-0"></div>
                    
                    <div class="flex flex-col items-center z-10">
                        <div class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[9px] transition-all duration-300 ${registro.hora_entrada !== '--:--' ? 'bg-green-600 text-white shadow-md shadow-green-100' : 'bg-gray-200 text-gray-400'}">IN</div>
                        <span class="text-[10px] font-bold mt-1 ${registro.hora_entrada !== '--:--' ? 'text-green-700' : 'text-gray-400'}">${registro.hora_entrada}</span>
                    </div>

                    <div class="flex flex-col items-center z-10">
                        <div class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[9px] transition-all duration-300 ${registro.hora_salida_almuerzo !== '--:--' ? 'bg-amber-500 text-white shadow-md shadow-amber-100' : 'bg-gray-200 text-gray-400'}">ALM</div>
                        <span class="text-[10px] font-bold mt-1 ${registro.hora_salida_almuerzo !== '--:--' ? 'text-amber-700' : 'text-gray-400'}">${registro.hora_salida_almuerzo}</span>
                    </div>

                    <div class="flex flex-col items-center z-10">
                        <div class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[9px] transition-all duration-300 ${registro.hora_retorno_almuerzo !== '--:--' ? 'bg-blue-500 text-white shadow-md shadow-blue-100' : 'bg-gray-200 text-gray-400'}">RET</div>
                        <span class="text-[10px] font-bold mt-1 ${registro.hora_retorno_almuerzo !== '--:--' ? 'text-blue-700' : 'text-gray-400'}">${registro.hora_retorno_almuerzo}</span>
                    </div>

                    <div class="flex flex-col items-center z-10">
                        <div class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[9px] transition-all duration-300 ${registro.hora_salida !== '--:--' ? 'bg-red-500 text-white shadow-md shadow-red-100' : 'bg-gray-200 text-gray-400'}">OUT</div>
                        <span class="text-[10px] font-bold mt-1 ${registro.hora_salida !== '--:--' ? 'text-red-700' : 'text-gray-400'}">${registro.hora_salida}</span>
                    </div>
                </div>
            `;

            const fila = document.createElement('tr');
            fila.className = 'hover:bg-surface-container/30 transition-colors border-b border-outline-variant/30 align-middle';
            
            fila.innerHTML = `
                <td class="px-6 py-4.5">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">${iniciales}</div>
                        <div>
                            <p class="font-bold text-on-surface text-sm leading-tight whitespace-nowrap">${nombreReal} ${apellidoReal}</p>
                            <p class="text-[11px] text-on-surface-variant font-medium mt-0.5">C.I: V-${cedulaNumericaPura}</p>
                        </div>
                    </div>
                </td>
                <td class="px-3 py-4.5 font-mono font-bold text-xs text-gray-500 text-center">${registro.fecha}</td>
                <td class="px-6 py-4.5 text-center">${timelineHtml}</td>
                <td class="px-6 py-4.5 text-center">${estatusHtml}</td>
            `;
            tbody.appendChild(fila);
        });

    } catch (err) {
        console.error(err);
        mostrarToastReportes('Error de conectividad al compilar el historial.', 'error');
    }
}

// === 🖨️ 4. MOTOR DE EXPORTACIÓN DIGITAL PDF (jsPDF + autoTable) ===
// === 🖨️ 4. MOTOR DE EXPORTACIÓN DIGITAL PDF (jsPDF + autoTable con Logotipo) ===
function exportarDatosAPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const filas = document.querySelectorAll('#tabla-registros tr');
    
    if (filas.length === 0 || (filas[0].querySelector('td') && filas[0].querySelector('td').textContent.includes('No se encontraron'))) {
        mostrarToastReportes('No hay datos en pantalla para exportar.', 'error');
        return;
    }
    
    // 🛠️ Crear el objeto de imagen en memoria para el logo de pruebas (futuro logo formal)
    const imgLogo = new Image();
    imgLogo.src = "../logo_eti.png"; 

    // El PDF se genera estrictamente cuando la imagen ha sido cargada en memoria por el navegador
    imgLogo.onload = function() {
        // 1. Dibujar el logotipo (Imagen, Tipo, X, Y, Ancho, Alto) en milímetros
        doc.addImage(imgLogo, 'PNG', 14, 10, 24, 24);

        // 2. Encabezados institucionales con desplazamiento horizontal (X = 42) para respetar el logo
        doc.setFont("Helvetica", "bold"); 
        doc.setFontSize(16); 
        doc.setTextColor(0, 110, 47); // Verde principal de la E.T.I.
        doc.text("E.T.I. LEONARDO INFANTE", 42, 16);
        
        doc.setFontSize(10); 
        doc.setTextColor(20, 27, 64); 
        doc.text("Portal Administrativo - Control de Asistencia y Gestión de Talento Humano", 42, 22);
        
        doc.setFontSize(13); 
        doc.text(`Reporte Institucional de Asistencia - Balance ${filtroActual.toUpperCase()}`, 42, 31);
        
        doc.setFont("Helvetica", "normal"); 
        doc.setFontSize(9); 
        doc.text(`Fecha de emisión: ${new Date().toLocaleString('es-ES')}`, 42, 37);

        // 3. Compilación de la matriz del cuerpo de la tabla
        const matrizCuerpo = [];
        filas.forEach(fila => {
            const pNombre = fila.querySelector('td:nth-child(1) p.font-bold');
            const pCedula = fila.querySelector('td:nth-child(1) p.text-\\[11px\\]');
            const c_colaborador = pNombre ? pNombre.textContent.trim() : 'Desconocido';
            
            let c_cedula = pCedula ? pCedula.textContent.replace('C.I: ', '').trim() : '---';
            c_cedula = c_cedula.replace(/[^0-9]/g, '');

            const c_fecha = fila.querySelector('td:nth-child(2)') ? fila.querySelector('td:nth-child(2)').textContent.trim() : '---';
            
            const nodosText = fila.querySelectorAll('td:nth-child(3) span');
            const c_entrada = nodosText[0] ? nodosText[0].textContent.trim() : '--:--';
            const c_almuerzo = nodosText[1] ? nodosText[1].textContent.trim() : '--:--';
            const c_retorno = nodosText[2] ? nodosText[2].textContent.trim() : '--:--';
            const c_salida = nodosText[3] ? nodosText[3].textContent.trim() : '--:--';
            
            const c_estatus = fila.querySelector('td:nth-child(4)') ? fila.querySelector('td:nth-child(4)').textContent.replace(/check_circle|logout|restaurant_menu|restaurant|cancel/g, '').trim() : '---';
            
            matrizCuerpo.push([c_colaborador, `V-${c_cedula}`, c_fecha, c_entrada, c_almuerzo, c_retorno, c_salida, c_estatus]);
        });

        // 4. Acoplar la AutoTable (Comenzando en Y = 44 para dar espacio al membrete)
        doc.autoTable({ 
            startY: 44, 
            head: [['Colaborador Institucional', 'Cédula', 'Fecha', 'Entrada', 'S. Almuerzo', 'R. Almuerzo', 'Salida', 'Estatus']], 
            body: matrizCuerpo, 
            theme: 'striped', 
            headStyles: { fillColor: [0, 110, 47], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 }, 
            styles: { fontSize: 8.5, cellPadding: 3.5, font: "Helvetica" }, 
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 }, 1: { fontStyle: 'bold' } }, 
            gridStyles: { lineColor: [220, 220, 220], lineWidth: 0.2 } 
        });
        
        // 5. Descargar archivo final
        doc.save(`reporte_asistencia_eti_${filtroActual}_${new Date().toISOString().slice(0,10)}.pdf`);
        mostrarToastReportes('Matriz de asistencia exportada a documento PDF con éxito.', 'exito');
    };

    // Callback de contingencia si el archivo gráfico no responde
    imgLogo.onerror = function() {
        mostrarToastReportes('Error de comunicación al integrar el logotipo al PDF.', 'error');
    };
}

function cambiarFiltroActivo(tipoFiltro) {
    filtroActual = tipoFiltro; 
    cargarRegistrosYMetricas();
    mostrarToastReportes(`Cambiado a vista de balance: ${tipoFiltro.toUpperCase()}`, 'exito');
}

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

// === 🚀 6. INICIALIZADOR COMPLETO DEL DOM ===
document.addEventListener('DOMContentLoaded', () => {
    cargarRegistrosYMetricas();
    inicializarManejadoresMódulo();

    document.getElementById('btn-filtro-diario')?.addEventListener('click', () => cambiarFiltroActivo('diario'));
    document.getElementById('btn-filtro-mensual')?.addEventListener('click', () => cambiarFiltroActivo('mensual'));
    document.getElementById('btn-filtro-trimestral')?.addEventListener('click', () => cambiarFiltroActivo('trimestral'));
    document.getElementById('btn-filtro-todo')?.addEventListener('click', () => cambiarFiltroActivo('todo'));
    document.getElementById('btn-exportar-pdf')?.addEventListener('click', exportarDatosAPDF);
});