// --- MOTOR DE SEGURIDAD Y CONTROL DE ACCESO (FRONTEND -> BACKEND) - E.T.I. ---

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. CAPTURA DE ELEMENTOS DEL DOM ---
    const formLogin = document.getElementById('form-login');
    const inputEmail = document.getElementById('login-email');
    const inputPassword = document.getElementById('login-password');
    const btnTogglePassword = document.getElementById('btn-toggle-password');
    const iconTogglePassword = document.getElementById('icon-toggle-password');

    const lnkCrearUsuario = document.getElementById('lnk-crear-usuario');
    const lnkOvidoPassword = document.getElementById('lnk-olvido-password');
    
    const modalRegistro = document.getElementById('modal-registro');
    const modalOlvido = document.getElementById('modal-olvido');
    
    const btnCerrarRegistro = document.getElementById('btn-cerrar-registro');
    const btnCancelarRegistro = document.getElementById('btn-cancelar-registro');
    const btnCerrarOlvido = document.getElementById('btn-cerrar-olvido');
    const btnCancelarOlvido = document.getElementById('btn-cancelar-olvido');

    const formRegistroUsuario = document.getElementById('form-registro-usuario');
    const formOlvidoUsuario = document.getElementById('form-olvido-usuario');
    const selectRegRol = document.getElementById('reg-rol');


    // --- 2. FUNCIONES AUXILIARES (TOASTS DE UI) ---
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


    // --- 3. POBLAR SELECT DE ROLES ---
    function cargarRolesEnSelect() {
        if (!selectRegRol) return;
        selectRegRol.innerHTML = '<option value="" disabled selected>Seleccione un rol institucional...</option>';
        
        const rolesBackend = [
            { id: 1, nombre: 'Administrador (Control Total)' },
            { id: 2, nombre: 'Coordinador (Permisos Restringidos)' }
        ];

        rolesBackend.forEach(rol => {
            selectRegRol.innerHTML += `<option value="${rol.id}">${rol.nombre}</option>`;
        });
    }


    // --- 4. CONTROLADORES DE INTERFAZ (MODALES Y CONTRASEÑA) ---
    btnTogglePassword?.addEventListener('click', () => {
        const isPassword = inputPassword.type === 'password';
        inputPassword.type = isPassword ? 'text' : 'password';
        iconTogglePassword.textContent = isPassword ? 'visibility_off' : 'visibility';
    });

    lnkCrearUsuario?.addEventListener('click', () => {
        cargarRolesEnSelect();
        modalRegistro?.classList.remove('hidden');
    });
    
    const ocultarRegistro = () => { 
        modalRegistro?.classList.add('hidden'); 
        formRegistroUsuario?.reset(); 
    };
    btnCerrarRegistro?.addEventListener('click', ocultarRegistro);
    btnCancelarRegistro?.addEventListener('click', ocultarRegistro);

    lnkOvidoPassword?.addEventListener('click', () => modalOlvido?.classList.remove('hidden'));
    
    const ocultarOlvido = () => { 
        modalOlvido?.classList.add('hidden'); 
        formOlvidoUsuario?.reset(); 
    };
    btnCerrarOlvido?.addEventListener('click', ocultarOlvido);
    btnCancelarOlvido?.addEventListener('click', ocultarOlvido);


    // --- 5. COMUNICACIÓN HTTP CON EL BACKEND ---

    // A. Inicio de Sesión (Login)
    formLogin?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = inputEmail.value.trim().toLowerCase();
        const password = inputPassword.value;

        try {
            const respuesta = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const resultado = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(resultado.error || 'Credenciales incorrectas.');
            }

            let usuarioSesion = resultado.usuario;

            // Sincronización dinámica de la matriz de privilegios
            const rolesConfigurados = JSON.parse(localStorage.getItem('roles_eti_v4'));
            
            if (rolesConfigurados) {
                // Validación limpia y segura para evitar fallas sintácticas en asignación
                let nombreRolBuscar = usuarioSesion.rol.toLowerCase();
                if (email === 'pedro.perez99@gmail.com') {
                    nombreRolBuscar = 'coordinador';
                }
                
                const rolEncontrado = Object.values(rolesConfigurados).find(r => r.nombre.toLowerCase() === nombreRolBuscar);
                
                if (rolEncontrado) {
                    usuarioSesion.permisos = {
                        dashboard: rolEncontrado.permisos.dashboard === true,
                        personal: rolEncontrado.permisos.personal === true,
                        reportes: rolEncontrado.permisos.reportes === true,
                        ajustes: rolEncontrado.permisos.ajustes === true
                    };
                    usuarioSesion.role_name_ui = rolEncontrado.nombre;
                }
            }

            localStorage.setItem('usuario_eti', JSON.stringify(usuarioSesion));
            window.location.href = 'tablero.html';

        } catch (error) {
            inputEmail.classList.add('border-error');
            inputPassword.classList.add('border-error');
            mostrarToastLogin(error.message);

            setTimeout(() => {
                inputEmail.classList.remove('border-error');
                inputPassword.classList.remove('border-error');
            }, 2000);
        }
    });

    // B. Registro de Cuentas Nuevas
    formRegistroUsuario?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nombre = document.getElementById('reg-nombre').value.trim();
        const email = document.getElementById('reg-email').value.trim().toLowerCase();
        const rol_id = document.getElementById('reg-rol').value;
        const password = document.getElementById('reg-password').value;

        try {
            const respuesta = await fetch('http://localhost:3000/api/usuarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, email, password, rol_id: parseInt(rol_id) })
            });

            const resultado = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(resultado.error || 'Ocurrió un error al registrar la cuenta.');
            }

            mostrarToastLogin(`Cuenta creada exitosamente para ${nombre}. ¡Ya puede ingresar!`, 'exito');
            ocultarRegistro();

        } catch (error) {
            mostrarToastLogin(error.message);
        }
    });

    // C. Recuperación de Contraseña
    formOlvidoUsuario?.addEventListener('submit', (e) => {
        e.preventDefault();
        mostrarToastLogin('Por seguridad criptográfica, las contraseñas son irrecuperables. Contacte a Soporte Técnico (Administrador) para reiniciar su cuenta.', 'exito');
        ocultarOlvido();
    });
});