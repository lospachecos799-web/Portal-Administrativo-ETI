// --- MOTOR DE SEGURIDAD, CUENTAS DINÁMICAS Y CONTROL DE ACCESO (RBAC) - E.T.I. ---

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. CONFIGURACIÓN DE BASES DE DATO LOCALES (FALLBACKS) ---
    const rolesPorDefecto = {
        administrador: { id: 'administrador', nombre: 'Administrador', permisos: {}, locked: true },
        directivo: { id: 'directivo', nombre: 'Directivo', permisos: {}, locked: false },
        rrhh: { id: 'rrhh', nombre: 'Recursos Humanos', permisos: {}, locked: false }
    };

    const cuentasPorDefecto = [
        { 
            email: 'admin@escuela.edu', 
            password: 'admin123', 
            nombre: 'Dirección / Subdirección', 
            rolId: 'administrador', 
            rolLabel: 'Dirección' 
        }
    ];

    // Cargar datos maestros de Roles y Cuentas
    let rolesSistema = JSON.parse(localStorage.getItem('roles_eti')) || rolesPorDefecto;
    let cuentasSistema = JSON.parse(localStorage.getItem('usuarios_cuentas_eti')) || cuentasPorDefecto;

    // Persistir si es la primera vez que se ejecuta
    if (!localStorage.getItem('usuarios_cuentas_eti')) {
        localStorage.setItem('usuarios_cuentas_eti', JSON.stringify(cuentasSistema));
    }

    // --- 2. CAPTURA DE ELEMENTOS DEL DOM ---
    // Elementos del Login Principal
    const formLogin = document.getElementById('form-login');
    const inputEmail = document.getElementById('login-email');
    const inputPassword = document.getElementById('login-password');
    const btnTogglePassword = document.getElementById('btn-toggle-password');
    const iconTogglePassword = document.getElementById('icon-toggle-password');

    // Elementos de Modales y Enlaces
    const lnkCrearUsuario = document.getElementById('lnk-crear-usuario');
    const lnkOvidoPassword = document.getElementById('lnk-olvido-password');
    
    const modalRegistro = document.getElementById('modal-registro');
    const modalOlvido = document.getElementById('modal-olvido');
    
    const btnCerrarRegistro = document.getElementById('btn-cerrar-registro');
    const btnCancelarRegistro = document.getElementById('btn-cancelar-registro');
    const btnCerrarOlvido = document.getElementById('btn-cerrar-olvido');
    const btnCancelarOlvido = document.getElementById('btn-cancelar-olvido');

    // Formularios internos de Modales
    const formRegistroUsuario = document.getElementById('form-registro-usuario');
    const formOlvidoUsuario = document.getElementById('form-olvido-usuario');
    const selectRegRol = document.getElementById('reg-rol');

    // --- 3. FUNCIONES AUXILIARES (TOASTS) ---
    function mostrarToastLogin(mensaje, tipo = 'error') {
        const existant = document.getElementById('toast-login');
        if (existant) existant.remove();

        const toast = document.createElement('div');
        toast.id = 'toast-login';
        
        const colorIcono = tipo === 'exito' ? 'text-green-400' : 'text-red-500';
        const icono = tipo === 'exito' ? 'check_circle' : 'warning';

        toast.className = 'fixed bottom-8 bg-gray-900 text-white px-6 py-4 rounded-xl shadow-xl z-[100] transform transition-all duration-300 flex items-center gap-3 border border-gray-800 animate-bounce';
        toast.innerHTML = `<span class="material-symbols-outlined ${colorIcono}">${icono}</span> <span class="text-sm font-semibold">${mensaje}</span>`;
        
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    // --- 4. POBLAR SELECT DE ROLES DINÁMICAMENTE ---
    function cargarRolesEnSelect() {
        if (!selectRegRol) return;
        
        // Limpiar opciones anteriores
        selectRegRol.innerHTML = '<option value="" disabled selected>Seleccione un rol institucional...</option>';
        
        // Inyectar cada rol existente en la base de datos de configuracion
        Object.values(rolesSistema).forEach(rol => {
            selectRegRol.innerHTML += `<option value="${rol.id}">${rol.nombre}</option>`;
        });
    }

    // --- 5. CONTROLADORES DE INTERFAZ (MODALES Y CONTRASEÑA) ---
    // Alternar visibilidad de contraseña
    btnTogglePassword?.addEventListener('click', () => {
        const isPassword = inputPassword.type === 'password';
        inputPassword.type = isPassword ? 'text' : 'password';
        iconTogglePassword.textContent = isPassword ? 'visibility_off' : 'visibility';
    });

    // Gestión de Modal Registro
    lnkCrearUsuario?.addEventListener('click', () => {
        rolesSistema = JSON.parse(localStorage.getItem('roles_eti')) || rolesPorDefecto; // Recargar por si hubo cambios
        cargarRolesEnSelect();
        modalRegistro?.classList.remove('hidden');
    });
    const ocultarRegistro = () => { modalRegistro?.classList.add('hidden'); formRegistroUsuario?.reset(); };
    btnCerrarRegistro?.addEventListener('click', ocultarRegistro);
    btnCancelarRegistro?.addEventListener('click', ocultarRegistro);

    // Gestión de Modal Olvido
    lnkOvidoPassword?.addEventListener('click', () => modalOlvido?.classList.remove('hidden'));
    const ocultarOlvido = () => { modalOlvido?.classList.add('hidden'); formOlvidoUsuario?.reset(); };
    btnCerrarOlvido?.addEventListener('click', ocultarOlvido);
    btnCancelarOlvido?.addEventListener('click', ocultarOlvido);

    // --- 6. PROCESAMIENTO DE FORMULARIOS (LOGIC) ---

    // A. Formulario de Inicio de Sesión (Login)
    formLogin?.addEventListener('submit', (e) => {
        e.preventDefault();

        const emailVal = inputEmail.value.trim().toLowerCase();
        const passwordVal = inputPassword.value;

        // Buscar cuenta en la base de datos relacional de usuarios
        const cuentaEncontrada = cuentasSistema.find(u => u.email === emailVal);

        if (cuentaEncontrada && cuentaEncontrada.password === passwordVal) {
            
            // Construir la sesión activa con los datos reales del usuario
            const sesionActiva = {
                usuario: cuentaEncontrada.email,
                rol: cuentaEncontrada.rolLabel,
                nombreOperador: cuentaEncontrada.nombre,
                timestamp: Date.now()
            };
            
            sessionStorage.setItem('sesion_eti_activa', JSON.stringify(sesionActiva));
            
            // Redirección directa interna de la carpeta pages/
            window.location.href = 'tablero.html';
        } else {
            inputEmail.classList.add('border-error');
            inputPassword.classList.add('border-error');
            mostrarToastLogin('Credenciales incorrectas o usuario no registrado.');

            setTimeout(() => {
                inputEmail.classList.remove('border-error');
                inputPassword.classList.remove('border-error');
            }, 2000);
        }
    });

    // B. Formulario de Registro de Cuentas Nuevas (Crear Usuario)
    formRegistroUsuario?.addEventListener('submit', (e) => {
        e.preventDefault();

        const nombre = document.getElementById('reg-nombre').value.trim();
        const email = document.getElementById('reg-email').value.trim().toLowerCase();
        const rolId = document.getElementById('reg-rol').value;
        const password = document.getElementById('reg-password').value;

        // Validar si el correo ya existe
        if (cuentasSistema.some(u => u.email === email)) {
            mostrarToastLogin('El correo electrónico ya posee una cuenta activa.');
            return;
        }

        // Obtener el nombre del rol seleccionado para la etiqueta de la sesión
        const rolObjeto = rolesSistema[rolId];
        const rolLabel = rolObjeto ? rolObjeto.nombre : 'Personal';

        // Guardar nueva cuenta en el arreglo maestro
        cuentasSistema.push({ nombre, email, rolId, rolLabel, password });
        localStorage.setItem('usuarios_cuentas_eti', JSON.stringify(cuentasSistema));

        mostrarToastLogin(`Cuenta creada con éxito para ${nombre}. ¡Ya puede ingresar!`, 'exito');
        ocultarRegistro();
    });

    // C. Formulario de Recuperación de Contraseña (Olvido su Clave)
    formOlvidoUsuario?.addEventListener('submit', (e) => {
        e.preventDefault();
        const emailOlvido = document.getElementById('olvido-email').value.trim().toLowerCase();
        
        const cuentaEncontrada = cuentasSistema.find(u => u.email === emailOlvido);

        if (cuentaEncontrada) {
            // Simulación interactiva ideal para mostrar la reactividad en el stand de grado
            mostrarToastLogin(`Auditoría E.T.I: La clave de acceso es "${cuentaEncontrada.password}"`, 'exito');
            ocultarOlvido();
        } else {
            mostrarToastLogin('El correo ingresado no coincide con ningún operador del sistema.');
        }
    });
});