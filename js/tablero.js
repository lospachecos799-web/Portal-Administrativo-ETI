// --- LÓGICA DINÁMICA DEL TABLERO DE MÉTRICAS INSTITUCIONALES (FRONTEND REAL -> SQLITE BACKEND) ---

// (Nota: Las funciones de seguridad, menús superiores flotantes y cierre de sesión fueron removidas de aquí. 
// Ahora son gestionadas y unificadas globalmente por el archivo js/seguridad.js)

// === 📅 2. FUNCIONES TEMPORALES AUXILIARES ===
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

// Declaramos alertasDelDia como propiedad de window para que seguridad.js pueda leerla de forma global
window.alertasDelDia = [];

// === 📊 3. CONSUMO ASÍNCRONO DE APIS Y CÁLCULO DE MÉTRICAS ESCOLARES ===
async function calcularMetricasHoy() {
    const txtPresentes = document.getElementById('dato-presentes');
    const txtAusentes = document.getElementById('dato-ausentes');
    const txtRetrasos = document.getElementById('dato-retrasos');

    if (!txtPresentes || !txtAusentes || !txtRetrasos) return;

    const hoyStr = new Date().toLocaleDateString('es-ES').replace(/-/g, '/');
    window.alertasDelDia = [];

    try {
        // === LLAMADAS EN PARALELO HACIA EL BACKEND REAL ===
        const [respPersonal, respAsistencia] = await Promise.all([
            fetch('http://localhost:3000/api/personal'),
            fetch('http://localhost:3000/api/asistencia')
        ]);

        if (!respPersonal.ok || !respAsistencia.ok) {
            throw new Error('Error al conectar con los servicios del servidor.');
        }

        const jsonPersonal = await respPersonal.json();
        const jsonAsistencia = await respAsistencia.json();

        const listaEmpleados = jsonPersonal.datos || [];
        const registros = jsonAsistencia.auditoria || [];
        
        const nominaTotal = jsonPersonal.total || listaEmpleados.length;

        // Filtrar movimientos de la jornada actual
        const movimientosHoy = registros.filter(r => {
            const rFecha = r.fecha ? r.fecha.replace(/-/g, '/') : '';
            return rFecha === hoyStr;
        });

        const cedulasPresentesHoy = new Set();
        let retrasosHoy = 0;

        movimientosHoy.forEach(mov => {
            if (mov.tipo_movimiento === 'Entrada') {
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

        txtPresentes.textContent = totalPresentesHoy;
        txtAusentes.textContent = totalAusentesHoy;
        txtRetrasos.textContent = retrasosHoy;

        const pAusentes = txtAusentes.parentElement.querySelector('p:last-child');
        if (pAusentes) pAusentes.textContent = `Sin justificar: ${totalAusentesHoy}`;

        const pRetrasos = txtRetrasos.parentElement.querySelector('p:last-child');
        if (pRetrasos) pRetrasos.textContent = retrasosHoy > 0 ? `Promedio: 25 min` : `Promedio: 0 min`;

        // ==========================================
        // RENDERIZADO DE LA GRÁFICA SEMANAL CON DATA REAL
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
                if (reg.tipo_movimiento === 'Entrada') {
                    if (cedulasDia.has(reg.cedula)) return; 
                    cedulasDia.add(reg.cedula);
                    totalEntradasSemana++;

                    const empleado = listaEmpleados.find(e => e.cedula === reg.cedula);
                    const turno = empleado ? empleado.turno : 'Mañana';

                    const partes = reg.hora.split(':');
                    const hora = parseInt(partes[0]);
                    const minutes = parseInt(partes[1].split(' ')[0]);
                    
                    const horaLimpiaReg = reg.hora.toLowerCase().replace(/\s/g, '').replace(/\./g, '');
                    const pm = horaLimpiaReg.includes('pm');

                    let aTiempo = true;

                    if (turno === 'Tarde') {
                        if (pm && hora !== 12 && (hora > 1 || (hora === 1 && minutes > 0))) {
                            aTiempo = false; 
                        }
                    } else {
                        if (pm || (!pm && hora !== 12 && (hora > 7 || (hora === 7 && minutes > 0)))) {
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
                const porcentajeAsistencia = nominaTotal > 0 ? (presentes / nominaTotal) * 100 : 0;
                barrasGrafica[index].style.height = presentes > 0 ? `${porcentajeAsistencia}%` : '4%';
                
                if (tooltipsGrafica[index]) {
                    tooltipsGrafica[index].textContent = presentes;
                }
            }
        });

        const diasConRegistros = asistenciaPorDia.filter(cant => cant > 0).length;
        
        const promedioAsistenciaSemanal = (diasConRegistros > 0 && nominaTotal > 0) 
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

        // Le avisa al guardián unificado de seguridad.js que determine si prender el punto rojo
        if (typeof window.evaluarPuntoRojo === 'function') window.evaluarPuntoRojo();

        // Indicador de Metas Escolares
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
                textoMeta.textContent = `Meta Institucional Alcanzada: ${promedioAsistenciaSemanal}%`;
                textoMeta.className = "text-xs font-bold text-green-700";
            }
        }

    } catch (err) {
        console.error('Error al renderizar el Tablero:', err);
        mostrarToastTablero('Error crítico al sincronizar con el motor de base de datos.', 'error');
    }
}

// --- MÓDULO DE BÚSQUEDA GLOBAL POR INTERFAZ ---
async function ejecutarBusquedaGlobal(valorInput) {
    const cedulaBuscar = valorInput.trim().replace(/[^0-9]/g, '');
    if (!cedulaBuscar) {
        mostrarToastTablero('Ingrese un número de cédula válido.', 'error');
        return;
    }

    try {
        const hoyStr = new Date().toLocaleDateString('es-ES').replace(/-/g, '/');
        const respuesta = await fetch('http://localhost:3000/api/asistencia');
        
        if (!respuesta.ok) throw new Error('No se pudo verificar el historial.');

        const json = await respuesta.json();
        const registros = json.auditoria || [];

        const movimientosPersonaHoy = registros.filter(r => {
            const rFecha = r.fecha ? r.fecha.replace(/-/g, '/') : '';
            return r.cedula === cedulaBuscar && rFecha === hoyStr;
        });

        if (movimientosPersonaHoy.length === 0) {
            mostrarToastTablero(`La C.I. V-${cedulaBuscar} no registra actividad el día de hoy.`, 'error');
            return;
        }

        const ultimoMov = movimientosPersonaHoy[0].tipo_movimiento;

        let estatusTexto = '';
        if (ultimoMov === 'Entrada') estatusTexto = 'Presente en la Institución 🟢';
        else if (ultimoMov === 'Salida Almuerzo') estatusTexto = 'Almuerzo en proceso ⏰';
        else if (ultimoMov === 'Retorno Almuerzo') estatusTexto = 'Retornó de Almuerzo 🏢';
        else if (ultimoMov === 'Salida') estatusTexto = 'Jornada Laboral Finalizada 🔴';

        mostrarToastTablero(`C.I. V-${cedulaBuscar}: Estatus actual -> ${estatusTexto}`, 'exito');

    } catch (err) {
        mostrarToastTablero('Error al consultar el estatus de asistencia.', 'error');
    }
}

// === 🚀 6. ARRANCADOR INICIALIZADOR AL CARGAR LA PÁGINA ===
document.addEventListener('DOMContentLoaded', () => {
    calcularMetricasHoy();

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