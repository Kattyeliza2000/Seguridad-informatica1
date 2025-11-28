import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
// Mantenemos imports de Firestore para el control en tiempo real (onSnapshot, arrayUnion, deleteDoc)
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, query, orderBy, limit, updateDoc, getDocs, arrayUnion, onSnapshot, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// --- 1. CONFIGURACIÓN FINAL DE FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyCvxiNJivb3u_S0nNkYrUEYxTO_XUkTKDk",
    authDomain: "simulador-c565e.firebaseapp.com",
    projectId: "simulador-c565e",
    storageBucket: "simulador-c565e.firebasestorage.app",
    measurementId: "G-W715QQWGY1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 2. LISTA DE CORREOS AUTORIZADOS ---
const correosDosDispositivos = ["dpachecog2@unemi.edu.ec", "htigrer@unemi.edu.ec", "sgavilanezp2@unemi.edu.ec", "jzamoram9@unemi.edu.ec", "fcarrillop@unemi.edu.ec", "naguilarb@unemi.edu.ec", "kholguinb2@unemi.edu.ec"];
const correosUnDispositivo = ["cnavarretem4@unemi.edu.ec", "gorellanas2@unemi.edu.ec", "ehidalgoc4@unemi.edu.ec", "lbrionesg3@unemi.edu.ec", "xsalvadorv@unemi.edu.ec", "nbravop4@unemi.edu.ec", "jmoreirap6@unemi.edu.ec", "jcastrof8@unemi.edu.ec", "jcaleroc3@unemi.edu.ec"];
const correosPermitidos = [...correosDosDispositivos, ...correosUnDispositivo];

// --- 3. VARIABLES GLOBALES (Limpias y Unificadas) ---
let preguntasExamen = []; 
let indiceActual = 0;
let respuestasUsuario = []; 
let seleccionTemporal = null; 
let tiempoRestante = 0;
let intervaloTiempo;
let currentUserEmail = "";
let currentMode = 'individual';
let uidJugadorPermanente = null; 
let currentAvatarUrl = null; 
let currentStreak = 0; 
let startTime = 0; 
let battleRoomID = null;    
let currentAlias = null;    
let tempBattleID = null; // ID TEMPORAL DE SESIÓN
let unsubscribeRoom = null; // Para detener el listener de Firebase
let currentSalaId = null; // Sala actual del jugador

// --- 3. CONFIGURACIÓN DE AVATARES Y SALAS ---
const AVATAR_CONFIG = [
    { seed: 'Katty', style: 'avataaars', bg: 'e8d1ff', tags: 'Femenino' }, { seed: 'Ana', style: 'avataaars', bg: 'ffd5dc', tags: 'Femenino' }, { seed: 'Sofia', style: 'avataaars', bg: 'b6e3f4', tags: 'Femenino' }, { seed: 'Laura', style: 'lorelei', bg: 'c0aede', tags: 'Femenino' }, { seed: 'Maya', style: 'lorelei', bg: 'f7c9e5', tags: 'Femenino' }, { seed: 'Zoe', style: 'avataaars', bg: 'd1d4f9', tags: 'Femenino' }, { seed: 'Mia', style: 'lorelei', bg: 'ffdfbf', tags: 'Femenino' },
    { seed: 'Felix', style: 'avataaars', bg: 'a0d6b3', tags: 'Masculino' }, { seed: 'Aneka', style: 'avataaars', bg: 'c7d0f8', tags: 'Masculino' }, { seed: 'John', style: 'avataaars', bg: 'ffc5a1', tags: 'Masculino' }, { seed: 'Buster', style: 'lorelei', bg: 'a6c0ff', tags: 'Masculino' }, { seed: 'Chester', style: 'avataaars', bg: 'f9d3b4', tags: 'Masculino' }, { seed: 'Bandit', style: 'lorelei', bg: 'ffdfbf', tags: 'Masculino' }, { seed: 'Chris', style: 'avataaars', bg: 'a1eafb', tags: 'Masculino' },
];

const ROOM_ICONS = {
    "SALA_FIREWALL": "fa-fire", "SALA_ENCRIPTADO": "fa-lock", "SALA_ZERO_DAY": "fa-bug", "SALA_PHISHING": "fa-fish", "SALA_RANSOMWARE": "fa-skull-crossbones", "SALA_BOTNET": "fa-robot"
};

// REFERENCIAS HTML
const authScreen = document.getElementById('auth-screen');
const setupScreen = document.getElementById('setup-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const reviewScreen = document.getElementById('review-screen');
const btnLogout = document.getElementById('btn-logout');
const btnNextQuestion = document.getElementById('btn-next-question');
const btnRanking = document.getElementById('btn-ranking');
const btnStats = document.getElementById('btn-stats');
const modeSelect = document.getElementById('mode-select');
const aliasInputGroup = document.getElementById('alias-input-group');
const aliasInput = document.getElementById('alias-input');
const btnStart = document.getElementById('btn-start');
const btnQuitQuiz = document.getElementById('btn-quit-quiz'); 
const headerUserInfo = document.getElementById('header-user-info');
const lobbyTitle = document.getElementById('lobby-title');
const lobbyPlayers = document.getElementById('lobby-players');
const btnStartWar = document.getElementById('btn-start-war');
const lobbyStatusText = document.getElementById('lobby-status-text'); // Asegurar referencia

// --- FUNCIÓN UTILITARIA: CAMBIAR PANTALLA ---
function showScreen(screenId) {
    document.querySelectorAll('.container').forEach(el => el.classList.add('hidden'));
    const screenElement = document.getElementById(screenId);
    if(screenElement) {
        screenElement.classList.remove('hidden');
    }
}

// --- FUNCIÓN UTILITARIA: SONIDO CLIC (CORREGIDO: Definido tempranamente para evitar ReferenceError) ---
function playClick() {
    const sfx = document.getElementById('click-sound');
    if(sfx) { sfx.currentTime = 0; sfx.play().catch(()=>{}); }
}


// --- 4. BANCO DE PREGUNTAS COMPLETO (Mantenido) ---
const bancoPreguntas = [
    { texto: "¿Cuál es un ejemplo de amenaza técnica según el documento?", opciones: ["Phishing", "Baja tensión eléctrica", "Inyección SQL", "Insider"], respuesta: 1, explicacion: "Respuesta correcta: Baja tensión eléctrica (Fallo técnico/suministro)." },
    { texto: "¿Qué herramienta open-source permite escaneos de gran escala en red y sistemas?", opciones: ["Nmap", "Fortinet WVS", "OpenVAS", "Nessus Essentials"], respuesta: 2, explicacion: "Respuesta correcta: OpenVAS. Nmap es para mapeo, pero OpenVAS es para escaneo de vulnerabilidades a gran escala." }, // <--- CORRECCIÓN A ÍNDICE 2 (OpenVAS)
    { texto: "El término SSRF significa:", opciones: ["Safe Session Reset Form", "Simple Service Relay Feature", "Secure Software Risk Framework", "Server-Side Request Forgery"], respuesta: 3, explicacion: "Respuesta correcta: Server-Side Request Forgery" },
    { texto: "El proyecto OWASP tiene como finalidad principal:", opciones: ["Vender cortafuegos", "Producir malware de prueba", "Crear estándares de hardware", "Mejorar la seguridad de aplicaciones web de forma abierta"], respuesta: 3, explicacion: "Respuesta correcta: Mejorar la seguridad de aplicaciones web de forma abierta" },
    { texto: "La gestión de activos se considera importante porque:", opciones: ["Genera llaves criptográficas", "Reduce el jitter", "Actualiza antivirus", "Mantiene control sobre hardware, software y datos"], respuesta: 3, explicacion: "Respuesta correcta: Mantiene control sobre hardware, software y datos" },
    { texto: "El operador 'eq' en una regla de firewall sirve para:", opciones: ["Cambiar protocolo", "Hacer ping", "Filtrar un número de puerto específico", "Denegar IPs"], respuesta: 2, explicacion: "Respuesta correcta: Filtrar un número de puerto específico" },
    { texto: "Una falla criptográfica puede conducir principalmente a:", opciones: ["Exposición de datos confidenciales", "Jitter elevando", "DoS", "Aumento de latencia"], respuesta: 0, explicacion: "Respuesta correcta: Exposición de datos confidenciales" },
    { texto: "¿Qué categoría de activo abarca servidores, routers y estaciones de trabajo?", opciones: ["Data", "Lines & Networks", "Hardware", "Software"], respuesta: 2, explicacion: "Respuesta correcta: Hardware" },
    { texto: "Una amenaza ambiental típica para un centro de datos sería:", opciones: ["Huracán", "Robo de servidores", "Virus informático", "Pérdida de energía"], respuesta: 0, explicacion: "Respuesta correcta: Huracán (Desastre natural/climático)." },
    { texto: "¿Qué nivel de riesgo requiere medidas inmediatas según la tabla de niveles?", opciones: ["Alto/Extremo", "Bajo", "Negligible", "Medio"], respuesta: 0, explicacion: "Respuesta correcta: Alto/Extremo" },
    { texto: "El estándar OWASP ASVS se utiliza para:", opciones: ["Generar certificados SSL", "Probar hardware", "Cifrado TLS", "Verificar controles de seguridad en aplicaciones"], respuesta: 3, explicacion: "Respuesta correcta: Verificar controles de seguridad en aplicaciones" },
    { texto: "Los ataques pasivos se caracterizan por:", opciones: ["Inyectar malware", "Ejecutar DoS", "Destruir hardware", "Escuchar y capturar tráfico"], respuesta: 3, explicacion: "Respuesta correcta: Escuchar y capturar tráfico" },
    { texto: "En el Top 10 OWASP 2021, la vulnerabilidad que ocupa el primer lugar es:", opciones: ["Inyección", "XSS", "Broken Access Control", "SSRF"], respuesta: 2, explicacion: "Respuesta correcta: Broken Access Control" },
    { texto: "Un Sombrero gris (Gray Hat) se define como alguien que:", opciones: ["Actúa a veces como White Hat y a veces como Black Hat", "Sólo ataca redes bancarias", "Es siempre malicioso", "Trabaja para la NSA"], respuesta: 0, explicacion: "Respuesta correcta: Actúa a veces como White Hat y a veces como Black Hat" },
    { texto: "¿Cuál de los siguientes es un ejemplo de ataque activo listado en el material?", opciones: ["Shoulder surfing", "Footprinting", "Inyección SQL", "Sniffing"], respuesta: 2, explicacion: "Respuesta correcta: Inyección SQL" },
    { texto: "Dentro de las fases del hacking ético, la primera etapa es:", opciones: ["Reconocimiento (recon)", "Mantenimiento de acceso", "Escalada de privilegios", "Borrado de huellas"], respuesta: 0, explicacion: "Respuesta correcta: Reconocimiento (recon)" },
    { texto: "El principio 'C' del trípode CIA significa:", opciones: ["Confidencialidad", "Conectividad", "Capacidad", "Continuidad"], respuesta: 0, explicacion: "Respuesta correcta: Confidencialidad" },
    { texto: "El algoritmo RSA fue propuesto por:", opciones: ["Diffie & Hellman", "Rivest, Shamir y Adleman", "ElGamal", "Miller & Koblitz"], respuesta: 1, explicacion: "Respuesta correcta: Rivest, Shamir y Adleman" },
    { texto: "El método de transposición se basa en:", opciones: ["Usar claves públicas", "Reordenar las letras del mensaje", "Sustituir letras por números", "Generar firmas digitales"], respuesta: 1, explicacion: "Respuesta correcta: Reordenar las letras del mensaje" },
    { texto: "DES trabaja con bloques de:", opciones: ["32 bits", "256 bits", "64 bits", "128 bits"], respuesta: 2, explicacion: "Respuesta correcta: 64 bits" },
    { texto: "En un par de claves RSA, la clave que debe mantenerse secreta es la:", opciones: ["Compartida", "Certificada", "Pública", "Privada"], respuesta: 3, explicacion: "Respuesta correcta: Privada" },
    { texto: "Una firma digital permite verificar principalmente la:", opciones: ["Velocidad de red", "Compresión", "Fragmentación IP", "Integridad del mensaje y la identidad del remitente"], respuesta: 3, explicacion: "Respuesta correcta: Integridad del mensaje y la identidad del remitente" },
    { texto: "Un cifrador en flujo cifra la información:", opciones: ["Con curvas celípticas", "Mediante RSA", "En bloques de 128 bits", "Bit a bit"], respuesta: 3, explicacion: "Respuesta correcta: Bit a bit" },
    { texto: "La propiedad que asegura que solo personas autorizadas lean un mensaje es la:", opciones: ["Confidencialidad", "Integridad", "No repudio", "Disponibilidad"], respuesta: 0, explicacion: "Respuesta correcta: Confidencialidad" },
    { texto: "La criptografía de curva elíptica (ECC) ofrece la misma seguridad que RSA con:", opciones: ["Claves más largas", "Claves más cortas", "OTP", "Hashes MD5"], respuesta: 1, explicacion: "Respuesta correcta: Claves más cortas" },
    { texto: "Un protocolo criptográfico es:", opciones: ["Un conjunto de pasos entre entidades para lograr un objetivo de seguridad", "Un certificado X.509", "Una clave pública", "Un algoritmo de hashing"], respuesta: 0, explicacion: "Respuesta correcta: Un conjunto de pasos entre entidades para lograr un objetivo de seguridad" },
    { texto: "La longitud efectiva de clave en DES es de:", opciones: ["128 bits", "56 bits", "512 bits", "40 bits"], respuesta: 1, explicacion: "Respuesta correcta: 56 bits" },
    { texto: "Los protocolos de autenticación tipo desafío-respuesta sirven para:", opciones: ["Cifrar discos", "Medir jitter", "Verificar la identidad de un usuario sin revelar el secreto", "Generar OTP"], respuesta: 2, explicacion: "Respuesta correcta: Verificar la identidad de un usuario sin revelar el secreto" },
    { texto: "Ventaja esencial de la criptografía de clave pública:", opciones: ["Requiere OTP", "No usa matemáticas", "No es necesario compartir la clave secreta", "Consume menos CPU"], respuesta: 2, explicacion: "Respuesta correcta: No es necesario compartir la clave secreta" },
    { texto: "El ataque conocido como watering-hole consiste en:", opciones: ["Infectar un sitio legítimo visitado por el objetivo", "Falsificar DNS", "Shoulder surfing", "Phishing SMS"], respuesta: 0, explicacion: "Respuesta correcta: Infectar un sitio legítimo visitado por el objetivo" },
    { texto: "El método de autenticación más común y sencillo es el uso de:", opciones: ["Tokens biométricos", "NFC implantado", "Contraseñas", "Blockchain"], respuesta: 2, explicacion: "Respuesta correcta: Contraseñas" },
    { texto: "Un nombre NetBIOS estándar contiene:", opciones: ["32 bits aleatorios", "Sólo números hexadecimales", "15 caracteres del dispositivo y 1 del servicio", "8 bytes fijos"], respuesta: 2, explicacion: "Respuesta correcta: 15 caracteres del dispositivo y 1 del servicio" },
    { texto: "El fin de un ataque de escalada de privilegios es:", opciones: ["Obtener accesos de mayor nivel o ilimitados", "Subir jitter", "Colapsar la red", "Robar hardware"], respuesta: 0, explicacion: "Respuesta correcta: Obtener accesos de mayor nivel o ilimitados" },
    { texto: "El ataque whaling se dirige principalmente a:", opciones: ["Estudiantes", "Altos ejecutivos", "Soporte técnico", "Servidores DNS"], respuesta: 1, explicacion: "Respuesta correcta: Altos ejecutivos" },
    { texto: "En un cifrado simétrico la misma clave sirve para:", opciones: ["Cifrar y descifrar", "Sólo cifrar", "Distribuir claves públicas", "Sólo firma"], respuesta: 0, explicacion: "Respuesta correcta: Cifrar y descifrar" },
    { texto: "¿Cuál es el objetivo principal de la criptografía?", opciones: ["Reducir el ancho de banda", "Convertir texto en imágenes", "Garantizar la seguridad de la información y las comunicaciones", "Firmar correos"], respuesta: 2, explicacion: "Respuesta correcta: Garantizar la seguridad de la información y las comunicaciones" },
    { texto: "La herramienta Metasploit Framework destaca por permitir:", opciones: ["Generar hashes MD5", "Crear certificados SSL", "Levantar un servidor SMB falso y capturar hashes", "Cifrar discos"], respuesta: 2, explicacion: "Respuesta correcta: Levantar un servidor SMB falso y capturar hashes" },
    { texto: "En SMTP, el comando que verifica un usuario es:", opciones: ["HELO", "DATA", "RCPT TO", "VRFY"], respuesta: 3, explicacion: "Respuesta correcta: VRFY" },
    { texto: "Un hacker ético (White Hat) se caracteriza por:", opciones: ["Espiar empresas", "Contar con permiso para probar sistemas", "Obtener lucro personal", "Distribuir ransomware"], respuesta: 1, explicacion: "Respuesta correcta: Contar con permiso para probar sistemas" },
    { texto: "En la autenticación de dos factores (2FA), un segundo factor puede ser:", opciones: ["Token de un solo uso (OTP)", "Dirección MAC", "Dominio DNS", "Subnet mask"], respuesta: 0, explicacion: "Respuesta correcta: Token de un solo uso (OTP)" },
    { texto: "Wifiphisher es una herramienta usada para:", opciones: ["Enumerar DNS", "Escanear puertos", "Obtener contraseñas WPA/WPA2 vía phishing", "Realizar fuzzing"], respuesta: 2, explicacion: "Respuesta correcta: Obtener contraseñas WPA/WPA2 vía phishing" },
    { texto: "El primer paso de un ataque de ingeniería social es:", opciones: ["Borrar huellas", "Recopilar información de la víctima", "Infectar con ransomware", "Solicitar rescate"], respuesta: 1, explicacion: "Respuesta correcta: Recopilar información de la víctima" },
    { texto: "La enumeración se emplea para listar:", opciones: ["Temperatura CPU", "Usuarios, hosts y servicios del sistema", "Parches instalados", "Logs de impresora"], respuesta: 1, explicacion: "Respuesta correcta: Usuarios, hosts y servicios del sistema" },
    { texto: "¿Cuál es el objetivo principal de la seguridad física en una organización?", opciones: ["Optimizar la impresión", "Aumentar el ancho de banda", "Permitir el libre acceso visitante", "Disminuir el riesgo sobre infraestructuras y datos"], respuesta: 3, explicacion: "Respuesta correcta: Disminuir el riesgo sobre infraestructuras y datos" },
    { texto: "¿Para qué se usa Maltego en OSINT?", opciones: ["Actualizar firmware", "Probar puertos UDP", "Gestionar contraseñas", "Mapear relaciones entre entidades"], respuesta: 3, explicacion: "Respuesta correcta: Mapear relaciones entre entidades" },
    { texto: "Un ataque interno suele ser realizado por:", opciones: ["Botnets externas", "Spammers", "Empleados con acceso privilegiado", "Hackers anónimos"], respuesta: 2, explicacion: "Respuesta correcta: Empleados con acceso privilegiado" },
    { texto: "SNMP se transporta habitualmente sobre:", opciones: ["ICMP", "UDP", "SCTP", "TCP puerto 80"], respuesta: 1, explicacion: "Respuesta correcta: UDP" },
    { texto: "En la fórmula de nivel de riesgo, “consecuencia” se refiere a:", opciones: ["Probabilidad", "Severidad del daño", "Valor del activo", "Tiempo de respuesta"], respuesta: 1, explicacion: "Respuesta correcta: Severidad del daño" },
    { texto: "El escáner de vulnerabilidades Nikto2 se centra en:", opciones: ["Aplicaciones web y servidores HTTP", "Bases de datos", "Redes SCADA", "Firmware IoT"], respuesta: 0, explicacion: "Respuesta correcta: Aplicaciones web y servidores HTTP" },
    { texto: "El ataque de fisherman phishing se apoya principalmente en:", opciones: ["Llamadas VoIP", "Redes sociales", "MQTT", "Correos masivos"], respuesta: 1, explicacion: "Respuesta correcta: Redes sociales" },
    { texto: "La relación básica de riesgo se expresa como:", opciones: ["Amenaza + Impacto", "Vulnerabilidad ÷ Impacto", "Amenaza × Vulnerabilidad × Impacto", "Impacto – Probabilidad"], respuesta: 2, explicacion: "Respuesta correcta: Amenaza × Vulnerabilidad × Impacto" },
    { texto: "Una contramedida básica contra la enumeración NetBIOS es:", opciones: ["Abrir puertos 135-139", "Usar SMTP sin TLS", "Habilitar Telnet", "Deshabilitar el uso compartido de archivos/impresoras"], respuesta: 3, explicacion: "Respuesta correcta: Deshabilitar el uso compartido de archivos/impresoras" },
    { texto: "Un ejemplo de control de presencia y acceso es:", opciones: ["UPS", "Barrera antivirus", "Extintor", "CCTV"], respuesta: 3, explicacion: "Respuesta correcta: CCTV" },
    { texto: "En seguridad lógica, el control AAA incluye:", opciones: ["Autenticación, autorización y auditoría", "API, App, Audit", "Asignar ACLs automáticas", "Antispam, antivirus, antimalware"], respuesta: 0, explicacion: "Respuesta correcta: Autenticación, autorización y auditoría" },
    { texto: "Un ataque pasivo contra WLAN que solo escucha tráfico se denomina:", opciones: ["DoS inalámbrico", "Spoofing", "Jamming", "Eavesdropping"], respuesta: 3, explicacion: "Respuesta correcta: Eavesdropping (Escucha clandestina)." },
    { texto: "En una WLAN, ¿qué dispositivo conecta clientes Wi-Fi con la LAN cableada?", opciones: ["Firewall", "Repetidor", "Switch", "Punto de acceso (AP)"], respuesta: 3, explicacion: "Respuesta correcta: Punto de acceso (AP)" },
    { texto: "El tráfico saliente que abandona la red se controla mediante:", opciones: ["VLAN", "Reglas de filtrado de salida en el cortafuegos", "IDS", "VPN"], respuesta: 1, explicacion: "Respuesta correcta: Reglas de filtrado de salida en el cortafuegos" },
    { texto: "Política que define quién accede a qué datos dentro de una BD:", opciones: ["Cifrado TLS", "Autorización / control de acceso", "Compilación", "Backup"], respuesta: 1, explicacion: "Respuesta correcta: Autorización / control de acceso" },
    { texto: "Antes de aplicar parches en producción se debe:", opciones: ["Cambiar el FQDN", "Borrar registros", "Probar el parche en un entorno de pruebas", "Reiniciar IDS"], respuesta: 2, explicacion: "Respuesta correcta: Probar el parche en un entorno de pruebas" },
    { texto: "Una inyección SQL basada en errores aprovecha:", opciones: ["Cifrado AES", "Tiempo de respuesta", "Mensajes de error devueltos por la aplicación", "Token OTP"], respuesta: 2, explicacion: "Respuesta correcta: Mensajes de error devueltos por la aplicación" },
    { texto: "Ventaja de un firewall perimetral bien configurado:", opciones: ["Mejora la batería de los clientes", "Elimina todos los virus", "Reduce la superficie de ataque expuesta a Internet", "Incrementa la velocidad Wi-Fi"], respuesta: 2, explicacion: "Respuesta correcta: Reduce la superficie de ataque expuesta a Internet" }
];

// --- 5. FUNCIÓN: OBTENER ID ÚNICO DEL DISPOSITIVO (Mantenido) ---
function obtenerDeviceId() {
    let deviceId = localStorage.getItem('device_id_seguro');
    if (!deviceId) {
        deviceId = 'dev_' + Math.random().toString(36).substr(2, 9) + Date.now();
        localStorage.setItem('device_id_seguro', deviceId);
    }
    return deviceId;
}

// --- 6. FUNCIÓN DE VOZ (TTS) (Mantenido) ---
function hablar(texto) {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'es-ES';
    utterance.rate = 1.0;
    synth.speak(utterance);
}

// --- FUNCIÓN DE UTILIDAD: ID Temporal (Para Batalla) (Mantenido) ---
function generarIDTemporal() {
    return 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

// --- FUNCIONES DE BATALLA (REAL-TIME IMPLEMENTATION) (Mantenido) ---
const salasActivasRef = collection(db, 'salas_activas');

async function iniciarBatalla() {
    console.log("Modo Batalla iniciado: Flujo real-time.");
    tempBattleID = generarIDTemporal();
    currentMode = 'multiplayer';
    
    document.getElementById('header-user-info').classList.remove('hidden'); 
    
    // Va a la pantalla de Avatar/Alias
    showScreen('avatar-screen'); 
    initAvatars(); 
}

// --- FUNCIÓN: Inicializa la grilla de avatares (Mantenido) ---
function initAvatars() {
    const grid = document.getElementById('avatar-grid');
    if(!grid) return; 
    grid.innerHTML = '';
    
    AVATAR_CONFIG.forEach((av, index) => {
        const url = `https://api.dicebear.com/7.x/${av.style}/svg?seed=${av.seed}&backgroundColor=${av.bg}`;
        const img = document.createElement('img');
        img.src = url;
        img.className = 'avatar-option';
        
        if(index === 0) { 
            img.classList.add('avatar-selected'); 
            currentAvatarUrl = url; 
        }
        
        img.onclick = () => {
            playClick();
            document.querySelectorAll('.avatar-option').forEach(x => x.classList.remove('avatar-selected'));
            img.classList.add('avatar-selected');
            currentAvatarUrl = url;
        };
        grid.appendChild(img);
    });
    
    const currentName = document.getElementById('user-display').innerText.split(' ')[0];
    document.getElementById('player-nickname').value = currentName;
}

// --- FUNCIÓN: Muestra la pantalla de selección de salas (Mantenido) ---
function mostrarSelectorSalas() {
    showScreen('rooms-screen');
    const list = document.getElementById('rooms-list');
    if (!list) return;
    list.innerHTML = '';
    
    const SALAS_PREDEFINIDAS = ["SALA_FIREWALL", "SALA_ENCRIPTADO", "SALA_ZERO_DAY", "SALA_PHISHING", "SALA_RANSOMWARE", "SALA_BOTNET"];

    SALAS_PREDEFINIDAS.forEach(salaId => {
        const btn = document.createElement('div');
        btn.className = 'room-btn';
        const iconClass = ROOM_ICONS[salaId] || 'fa-users';
        
        const salaRef = doc(db, "salas_activas", salaId);
        onSnapshot(salaRef, (docSnap) => {
            const count = docSnap.exists() ? (docSnap.data().jugadores || []).length : 0;
            const el = document.getElementById(`count-${salaId}`);
            if(el) {
                 el.innerText = `${count} Agentes`;
            } else {
                 btn.innerHTML = `<i class="fa-solid ${iconClass} room-icon"></i><strong>${salaId.replace('SALA_', '').replace(/_/g, ' ')}</strong><span class="room-count" id="count-${salaId}">${count} Agentes</span>`; 
            }
        });
        
        btn.onclick = () => { 
            playClick(); 
            unirseASala(salaId); // ** LLAMA AL LOBBY REAL **
        };
        list.appendChild(btn);
    });
}

// --- FUNCIÓN CLAVE: UNIRSE A SALA Y GESTIÓN DE LOBBY EN TIEMPO REAL (CORREGIDA) ---
async function unirseASala(salaId) {
    if (!uidJugadorPermanente || !currentAlias) return; 

    // 0. DETENER LISTENER VIEJO SI EXISTE
    if (unsubscribeRoom) unsubscribeRoom();
    currentSalaId = salaId; // ASIGNAR SALA ACTUAL

    const salaRef = doc(db, "salas_activas", salaId);
    
    // 1. ELIMINAR CUALQUIER SESIÓN ANTERIOR ACTIVA (Robustez contra jugadores fantasma)
    const limpiarJugadorAnterior = async () => {
        const snap = await getDoc(salaRef);
        if (snap.exists()) {
            const jugadores = snap.data().jugadores || [];
            // Filtra por UID permanente para eliminar cualquier sesión antigua del mismo usuario
            const jugadoresLimpios = jugadores.filter(j => j.uid !== uidJugadorPermanente);
            await updateDoc(salaRef, { jugadores: jugadoresLimpios });
        }
    };
    await limpiarJugadorAnterior(); // Ejecuta la limpieza

    const jugadorData = { 
        id: tempBattleID, // ID temporal de sesión
        uid: uidJugadorPermanente, // ID permanente para rastreo
        name: currentAlias, 
        avatar: currentAvatarUrl,
        score: 0,
        estado: 'activo'
    };

    // 2. Añadir el jugador a la sala (o crearla si es el primero)
    await setDoc(salaRef, { 
        jugadores: arrayUnion(jugadorData),
        estado: "esperando",
        fechaCreacion: new Date()
    }, { merge: true });

    showScreen('lobby-screen');
    if (lobbyTitle) lobbyTitle.innerText = `SALA: ${salaId.replace('SALA_', '').replace(/_/g, ' ')}`;
    
    // 3. ESCUCHA EN TIEMPO REAL DEL LOBBY
    unsubscribeRoom = onSnapshot(salaRef, async (docSnap) => {
        if (!docSnap.exists()) {
             if(unsubscribeRoom) unsubscribeRoom(); 
             currentSalaId = null; // Limpiar variable
             showScreen('setup-screen');
             hablar("La sala fue cerrada.");
             return;
        }

        const data = docSnap.data();
        let jugadores = data.jugadores || [];
        
        // El Host es el jugador en el índice 0, gracias a cómo Firestore maneja la eliminación.
        const esHost = jugadores.length > 0 && jugadores[0].uid === uidJugadorPermanente;

        // Renderizar Jugadores
        if (lobbyPlayers) {
            lobbyPlayers.innerHTML = jugadores.map(p => {
                const isYou = p.uid === uidJugadorPermanente;
                const isHostDisplay = p.uid === jugadores[0].uid;
                const hostText = isHostDisplay ? ' (Host)' : '';
                return `<div class="player-badge" style="background-color: ${isHostDisplay ? '#f0f7ff' : '#e6f4ea'};">
                    <img src="${p.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default&backgroundColor=e0e0e0'}" class="lobby-avatar-small" /> ${p.name} ${isYou ? '(Tú)' : ''}${hostText}
                </div>`;
            }).join('');
        }
        
        // LÓGICA DE ASIGNACIÓN DE HOST Y BOTÓN DE INICIO
        if (btnStartWar) {
            if (data.estado === 'esperando') {
                
                // CONTROLAR EL BOTÓN DE INICIO (Solo host)
                if (esHost) {
                    btnStartWar.classList.remove('hidden');
                    if (jugadores.length >= 2) {
                        lobbyStatusText.innerText = `¡Oponente(s) encontrado(s) (${jugadores.length} de 2). Presiona INICIAR BATALLA.`;
                        btnStartWar.style.background = '#28a745'; 
                    } else {
                        // Cuando el Host está solo, DEBE esperar un oponente real, NO iniciar.
                        // ******* AJUSTE CRÍTICO SOLICITADO *******
                        btnStartWar.classList.add('hidden'); // Ocultar si está solo
                        lobbyStatusText.innerText = `Esperando oponente real (1 de 2)...`; 
                    }
                } else {
                    btnStartWar.classList.add('hidden');
                    lobbyStatusText.innerText = `Esperando al Host (${jugadores[0].name}) para iniciar...`;
                }

            } 
            // NOTA: Si data.estado es 'jugando', el botón de inicio es irrelevante.
            // La lógica de continuación está implícita porque el jugador ya está en la pantalla quiz-screen.
        }
        
        // 4. INICIAR LA PARTIDA SINCRONIZADAMENTE
        if (data.estado === 'jugando') {
             if(unsubscribeRoom) unsubscribeRoom(); // Detener la escucha del lobby
             iniciarJuegoReal();
        }
    });

    // 5. EVENTOS DE CONTROL DEL LOBBY
    if (btnStartWar) {
        btnStartWar.onclick = async () => {
            const salaActualRef = doc(db, "salas_activas", salaId);
            // Solo el host puede cambiar el estado a 'jugando'
            const snap = await getDoc(salaActualRef);
            if (snap.exists() && snap.data().jugadores[0].uid === uidJugadorPermanente && snap.data().jugadores.length >= 2) {
                await updateDoc(salaActualRef, { estado: 'jugando' });
                hablar("Iniciando la secuencia de examen. ¡Que gane el mejor agente!");
            } else {
                 hablar("Necesitas al menos un oponente para iniciar la batalla.");
            }
        };
    }

    // Evento para abandonar la sala
    document.getElementById('btn-leave-lobby').onclick = async () => {
        if (confirm("¿Seguro que quieres abandonar la sala?")) {
            await limpiarSala(salaId); // Limpia tu ID de la sala
            if(unsubscribeRoom) unsubscribeRoom();
            currentSalaId = null; // Limpiar variable
            showScreen('setup-screen'); // Vuelve a la pantalla de configuración (SETUP)
        }
    };
}

// --- FUNCIÓN CLAVE: LIMPIEZA DE SALA (Para Abandono/Finalización) (Mantenido) ---
async function limpiarSala(salaId) {
    const salaRef = doc(db, "salas_activas", salaId);
    
    try {
        const snap = await getDoc(salaRef);
        if(snap.exists()) {
            const jugadores = snap.data().jugadores || [];
            
            // Filtra el array para eliminar al jugador actual por ID TEMPORAL
            const jugadoresActualizados = jugadores.filter(j => j.id !== tempBattleID);
            
            // NOTA: Si el host se va, el siguiente jugador en la lista se convierte en el índice [0] (nuevo host).
            await updateDoc(salaRef, { 
                jugadores: jugadoresActualizados 
            });
            
            // Si no quedan jugadores, elimina la sala por completo.
            if(jugadoresActualizados.length === 0) {
                 await deleteDoc(salaRef);
            }
        }
    } catch (e) { 
        console.error("Error limpiando sala:", e); 
    }
}


// --- 7. LÓGICA DE SEGURIDAD AVANZADA (CUPOS DIFERENCIADOS) (Mantenido) ---
async function validarDispositivo(user) {
    currentUserEmail = user.email;
    uidJugadorPermanente = user.uid;
    const miDeviceId = obtenerDeviceId(); 
    
    let limiteDispositivos = 1;
    if (correosDosDispositivos.includes(currentUserEmail)) {
        limiteDispositivos = 2;
    }

    const docRef = doc(db, "usuarios_seguros", currentUserEmail);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const datos = docSnap.data();
        let listaDispositivos = datos.dispositivos || []; 
        
        if (listaDispositivos.includes(miDeviceId)) {
            return true;
        } else {
            if (listaDispositivos.length >= limiteDispositivos) {
                // ACCESO DENEGADO
                alert(`⛔ ACCESO DENEGADO ⛔\n\nHas excedido tu límite de ${limiteDispositivos} dispositivos registrados. Debes cerrar sesión en otro equipo para continuar.`);
                await signOut(auth);
                location.reload();
                return false;
            } else {
                // Si hay espacio, añadir el nuevo dispositivo
                let nuevaLista = [...listaDispositivos, miDeviceId];
                await setDoc(docRef, { dispositivos: nuevaLista }, { merge: true });
                return true;
            }
        }
    } else {
        await setDoc(docRef, {
            dispositivos: [miDeviceId],
            fecha_registro: new Date().toISOString()
        });
        return true;
    }
}

// --- 8. MONITOR DE AUTENTICACIÓN (Muestra Perfil de Google) (Mantenido) ---
onAuthStateChanged(auth, async (user) => {
    document.getElementById('app-loader').classList.add('hidden');

    if (user) {
        if (correosPermitidos.includes(user.email)) {
            
            // LÓGICA PARA CAPITALIZAR EL NOMBRE: "Katty"
            let nombre = user.displayName || user.email.split('@')[0];
            const partes = nombre.toLowerCase().split(' ');
            const nombreCompletoCorregido = partes.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
            
            const nombreCorto = nombreCompletoCorregido.split(' ')[0];
            
            uidJugadorPermanente = user.uid;
            currentUserEmail = user.email;

            const dispositivoValido = await validarDispositivo(user);
            
            if (dispositivoValido) {
                // OCULTAR LOGIN y MOSTRAR SETUP
                authScreen.classList.add('hidden');
                setupScreen.classList.remove('hidden');
                btnLogout.classList.remove('hidden');

                // Mostrar Nombre y Foto en el SETUP
                document.getElementById('user-display').innerText = nombreCompletoCorregido;
                if (user.photoURL) {
                    document.getElementById('user-google-photo').src = user.photoURL;
                    document.getElementById('user-google-photo').classList.remove('hidden');
                }
                
                // OCULTAR PERFIL EN EL ENCABEZADO AL INICIO
                document.getElementById('header-user-info').classList.add('hidden'); 

                // Audio de bienvenida (TTS)
                setTimeout(() => {
                    hablar(`Bienvenido ${nombreCorto}, elija la opción que necesite.`);
                }, 500);
            }
        } else {
            alert("ACCESO RESTRINGIDO: Tu correo no está autorizado.");
            signOut(auth);
        }
    } else {
        // PANTALLA DE LOGOUT/NO LOGUEADO
        authScreen.classList.remove('hidden');
        setupScreen.classList.add('hidden');
        document.getElementById('header-user-info').classList.add('hidden');
    }
});

// --- 9. EVENTOS DE AUTENTICACIÓN (Mantenido) ---
document.getElementById('btn-google').addEventListener('click', () => {
    signInWithPopup(auth, new GoogleAuthProvider()).catch(e => {
        console.error("Error Google:", e);
        alert("Error de inicio de sesión. Revisa la consola o permisos de pop-ups.");
    });
});

btnLogout.addEventListener('click', () => {
    if(confirm("¿Cerrar sesión?")) {
        signOut(auth);
        location.reload();
    }
});

// --- 10. LÓGICA DEL JUEGO / SETUP (Mantenido) ---
document.getElementById('btn-start').addEventListener('click', () => {
    const modo = modeSelect.value;
    
    // 1. MOSTRAR PERFIL EN ENCABEZADO AL EMPEZAR (Solución a la UX)
    const nombreCompleto = document.getElementById('user-display').innerText;
    const nombreCorto = nombreCompleto.split(' ')[0];

    document.getElementById('header-user-info').classList.remove('hidden');
    document.getElementById('header-username').innerText = nombreCorto;
    document.getElementById('header-photo').src = document.getElementById('user-google-photo').src;


    if (modo === 'multiplayer') {
        const alias = aliasInput.value.trim();
        if (alias.length < 3) {
            hablar("Por favor, introduce un alias de al menos tres letras para la batalla.");
            aliasInput.focus();
            return;
        }
        currentAlias = alias;
        hablar(`¡Excelente, ${alias}! Elige tu avatar y tu zona de guerra.`);
        iniciarBatalla(); // Redirige a la pantalla de Avatar/Alias
    } else {
        // TTS AL INICIAR EXAMEN/ESTUDIO
        hablar(`Magnífico, has seleccionado el modo ${modo}. Buena suerte.`);
        iniciarJuegoReal();
    }
    
    // ** ACTIVAR MÚSICA DE FONDO Y CLIC **
    const bgMusic = document.getElementById('bg-music');
    if(bgMusic) { bgMusic.volume = obtenerVolumen(); bgMusic.play().catch(()=>{}); }
});

// --- LÓGICA DE VISUALIZACIÓN DE ALIAS EN SETUP (Mantenido) ---
modeSelect.addEventListener('change', () => {
    const isMultiplayer = modeSelect.value === 'multiplayer';
    
    if (isMultiplayer) {
        aliasInputGroup.classList.remove('hidden');
        btnStart.innerText = '⚔️ Unirse a Batalla';
    } else {
        aliasInputGroup.classList.add('hidden');
        btnStart.innerText = 'Empezar';
    }
});

// --- LÓGICA DE NAVEGACIÓN DENTRO DE BATALLA (Avatar -> Sala) (Mantenido) ---
document.addEventListener('DOMContentLoaded', () => {
    const btnConfirmIdentity = document.getElementById('btn-confirm-identity');
    
    if (btnConfirmIdentity) {
        btnConfirmIdentity.addEventListener('click', () => {
            const nick = document.getElementById('player-nickname').value.trim();
            
            if (nick.length < 3) {
                 hablar("Por favor, introduce un apodo de al menos tres letras.");
                 return;
            }
            
            // Si el nick es válido, pasamos a seleccionar la sala
            mostrarSelectorSalas();
        });
    }
    
    // Navegación hacia atrás
    const backToSetup = document.getElementById('back-to-setup');
    const backToAvatar = document.getElementById('back-to-avatar');
    
    if(backToSetup) backToSetup.addEventListener('click', () => showScreen('setup-screen'));
    if(backToAvatar) backToAvatar.addEventListener('click', () => showScreen('avatar-screen'));
});


function iniciarJuegoReal() {
    const tiempo = document.getElementById('time-select').value;
    const modo = document.getElementById('mode-select').value;

    if (tiempo !== 'infinity') {
        tiempoRestante = parseInt(tiempo) * 60;
        iniciarReloj();
    } else {
        document.getElementById('timer-display').innerText = "--:--";
    }

    if (modo === 'study') {
        preguntasExamen = [...bancoPreguntas].sort(() => 0.5 - Math.random());
    } else {
        preguntasExamen = [...bancoPreguntas].sort(() => 0.5 - Math.random()).slice(0, 20);
    }
    
    respuestasUsuario = [];
    indiceActual = 0;
    setupScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');
    cargarPregunta();
}

// --- 11. FUNCIONES DE QUIZ (Mantenido) ---
function cargarPregunta() {
    seleccionTemporal = null; 
    btnNextQuestion.classList.add('hidden'); 
    
    // Ocultar botón Rendirse en modo Estudio
    if (modeSelect.value === 'study') {
        btnQuitQuiz.classList.add('hidden'); 
    } else {
        btnQuitQuiz.classList.remove('hidden'); 
    }

    if (indiceActual >= preguntasExamen.length) { terminarQuiz(); return; }
    
    const data = preguntasExamen[indiceActual];
    document.getElementById('question-text').innerText = `${indiceActual + 1}. ${data.texto}`;
    const cont = document.getElementById('options-container'); cont.innerHTML = '';
    
    data.opciones.forEach((opcion, index) => {
        const btn = document.createElement('button');
        btn.innerText = opcion;
        btn.onclick = () => seleccionarOpcion(index, btn); 
        cont.appendChild(btn);
    });
    document.getElementById('progress-display').innerText = `Pregunta ${indiceActual + 1} de ${preguntasExamen.length}`;

    if(indiceActual === preguntasExamen.length - 1) {
        btnNextQuestion.innerHTML = 'Finalizar <i class="fa-solid fa-check"></i>';
    } else {
        btnNextQuestion.innerHTML = 'Siguiente <i class="fa-solid fa-arrow-right"></i>';
    }
}

function seleccionarOpcion(index, btnClickeado) {
    const isStudyMode = modeSelect.value === 'study';

    if (isStudyMode && seleccionTemporal !== null) {
        return;
    }
    
    seleccionTemporal = index;
    const botones = document.getElementById('options-container').querySelectorAll('button');
    botones.forEach(b => b.classList.remove('option-selected'));
    btnClickeado.classList.add('option-selected');
    
    if (isStudyMode) {
        mostrarResultadoInmediato(index);
    } else {
        btnNextQuestion.classList.remove('hidden');
    }
}

function mostrarResultadoInmediato(seleccionada) {
    const pregunta = preguntasExamen[indiceActual];
    const correcta = pregunta.respuesta;
    const cont = document.getElementById('options-container');
    const botones = cont.querySelectorAll('button');
    
    // 2. Control de sonido por respuesta
    const esCorrecta = (seleccionada === correcta);
    if (esCorrecta) {
        document.getElementById('correct-sound').play().catch(()=>{});
    } else {
        // Control de sonido fallido en modo Estudio (deshabilitado en modo estudio)
        if (modeSelect.value !== 'study') { 
            document.getElementById('fail-sound').play().catch(()=>{}); 
        }
    }

    botones.forEach(btn => btn.disabled = true);
    botones.forEach((btn, index) => {
        btn.classList.remove('option-selected');
        if (index === correcta) {
            btn.classList.add('ans-correct', 'feedback-visible');
        } else if (index === seleccionada) {
            btn.classList.add('ans-wrong', 'feedback-visible');
        }
    });

    const divExplicacion = document.createElement('div');
    divExplicacion.className = 'explanation-feedback';
    divExplicacion.innerHTML = `<strong>Explicación:</strong> ${pregunta.explicacion}`;
    cont.appendChild(divExplicacion);
    
    respuestasUsuario.push(seleccionada);
    btnNextQuestion.classList.remove('hidden');
}

// --- 12. EVENTO: Render Rendirse (Mantenido) ---
document.getElementById('btn-quit-quiz').addEventListener('click', () => {
    if (confirm("¿Estás seguro que deseas rendirte? Tu progreso actual se guardará.")) {
        terminarQuiz(true); 
    }
});


// --- 13. FUNCIÓN TERMINAR QUIZ (Validación 100% y Animación) (Mantenido) ---
function terminarQuiz(abandono = false) {
    const bgMusic = document.getElementById('bg-music');
    if(bgMusic) { bgMusic.pause(); bgMusic.currentTime = 0; }
    clearInterval(intervaloTiempo);
    
    // Si era modo Batalla, limpiar la sala antes de terminar
    if (currentMode === 'multiplayer' && currentSalaId) {
        limpiarSala(currentSalaId);
        currentSalaId = null; 
    }

    let aciertos = 0;
    respuestasUsuario.forEach((r, i) => { 
        if (r === preguntasExamen[i].respuesta) aciertos++; 
    });
    
    const totalPreguntas = preguntasExamen.length;
    const notaPorcentaje = totalPreguntas > 0 ? Math.round((aciertos / totalPreguntas) * 100) : 0;
    
    quizScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    document.getElementById('score-final').innerText = `${aciertos} / ${totalPreguntas}`;
    
    const msg = document.getElementById('custom-msg');
    const sfxWin = document.getElementById('success-sound');
    const sfxFail = document.getElementById('fail-sound');
    const vol = obtenerVolumen();
    
    if (sfxWin) sfxWin.volume = vol;
    if (sfxFail) sfxFail.volume = vol;

    msg.className = ''; 

    if (abandono) {
        msg.innerText = "Finalizado por usuario. Se registraron las respuestas completadas."; 
        msg.style.color = "#ea4335";
        
    } else if (aciertos === totalPreguntas) { // VALIDACIÓN: PUNTAJE PERFECTO (100%)
        msg.innerHTML = '<i class="fa-solid fa-trophy moving-icon-win"></i> ¡FELICITACIONES! PUNTAJE PERFECTO 💯'; 
        msg.style.color = "#28a745"; 
        if (typeof createConfetti === 'function') createConfetti(); 
        if (sfxWin) sfxWin.play().catch(()=>{});
        hablar("¡Increíble! Has obtenido un puntaje perfecto. Eres un maestro en seguridad."); 

    } else if (notaPorcentaje >= 85) { 
        msg.innerHTML = '<i class="fa-solid fa-medal moving-icon-win"></i> ¡LEGENDARIO! 🏆'; 
        msg.style.color = "#28a745"; 
        if (typeof createConfetti === 'function') createConfetti(); 
        if (sfxWin) sfxWin.play().catch(()=>{});

    } else if (notaPorcentaje >= 70) { 
        msg.innerHTML = '<i class="fa-solid fa-check-circle moving-icon-win"></i> ¡Misión Cumplida!'; 
        msg.style.color = "#fbbc04";
        if (sfxWin) sfxWin.play().catch(()=>{});

    } else { 
        msg.innerHTML = '<i class="fa-solid fa-face-sad-cry moving-icon-fail"></i> Entrenamiento fallido. Debes mejorar.'; 
        msg.style.color = "#1a73e8"; 
        if (sfxFail) sfxFail.play().catch(()=>{});
    }
    
    // Ocultar botón Revisar Respuestas si es modo Estudio
    if (modeSelect.value === 'study') {
        document.getElementById('btn-review').classList.add('hidden');
    } else {
        document.getElementById('btn-review').classList.remove('hidden');
    }
}

// --- 14. EVENTO SIGUIENTE PREGUNTA (Mantenido) ---
btnNextQuestion.addEventListener('click', () => {
    const isStudyMode = modeSelect.value === 'study';
    
    if (isStudyMode && seleccionTemporal !== null) {
        indiceActual++;
        cargarPregunta();
        return; 
    }
    
    if (seleccionTemporal !== null) {
        respuestasUsuario.push(seleccionTemporal);
        indiceActual++;
        cargarPregunta();
    }
});


// --- 15. FUNCIONES AUXILIARES DE TIEMPO Y ANIMACIÓN (Mantenido) ---
function iniciarReloj() {
    intervaloTiempo = setInterval(() => {
        tiempoRestante--;
        let m = Math.floor(tiempoRestante / 60), s = tiempoRestante % 60;
        document.getElementById('timer-display').innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
        if (tiempoRestante <= 0) { clearInterval(intervaloTiempo); terminarQuiz(); }
    }, 1000);
}

function createConfetti() {
    const w = document.getElementById('confetti-wrapper'); 
    if (!w) return;
    w.classList.remove('hidden'); 
    w.innerHTML = '';
    const c = ['#1a73e8', '#34a853', '#fbbc04', 'ea4335'];
    for(let i=0; i<100; i++) {
        const d = document.createElement('div');
        d.style.position='absolute'; d.style.width='10px'; d.style.height='10px';
        d.style.backgroundColor = c[Math.floor(Math.random()*c.length)];
        d.style.left = Math.random()*100+'vw';
        d.style.animation = `fall ${Math.random()*3+2}s linear forwards`;
        w.appendChild(d);
    }
}

// --- 16. REVISIÓN Y MÁS FUNCIONES AUXILIARES (Mantenido) ---
document.getElementById('btn-review').addEventListener('click', () => {
    resultScreen.classList.add('hidden');
    reviewScreen.classList.remove('hidden');
    const cont = document.getElementById('review-container'); cont.innerHTML = '';
    
    preguntasExamen.forEach((p, i) => {
        const dada = respuestasUsuario[i], ok = (dada === p.respuesta);
        const card = document.createElement('div'); card.className = 'review-item';
        let ops = '';
        p.opciones.forEach((o, x) => {
            let c = (x === p.respuesta) ? 'ans-correct' : (x === dada && !ok ? 'ans-wrong' : '');
            let ico = (x === p.respuesta) ? '✅ ' : (x === dada && !ok ? '❌ ' : '');
            let b = (x === dada) ? 'user-selected' : '';
            ops += `<div class="review-answer ${c} ${b}">${ico}${o}</div>`;
        });
        card.innerHTML = `<div class="review-question">${i+1}. ${p.texto}</div>${ops}<div class="review-explanation"><strong>Explicación:</strong> ${p.explicacion}</div>`;
        cont.appendChild(card);
    });
});

// --- 17. INICIALIZACIÓN Y EVENTOS DE VOLUMEN (Corregidos) (Mantenido) ---

function obtenerVolumen() {
    return parseFloat(document.getElementById('volume-slider').value);
}

function actualizarVolumen() {
    const vol = obtenerVolumen();
    document.querySelectorAll('audio').forEach(a => {
        a.volume = vol;
        a.muted = (vol === 0);
    });

    const icon = document.getElementById('vol-icon');
    icon.className = 'fa-solid ' + (vol === 0 ? 'fa-volume-xmark' : (vol < 0.5 ? 'fa-volume-low' : 'fa-volume-high'));
}

window.addEventListener('DOMContentLoaded', () => {
    actualizarVolumen();
});

document.getElementById('volume-slider').addEventListener('input', actualizarVolumen);

document.getElementById('btn-mute').addEventListener('click', () => {
    const slider = document.getElementById('volume-slider');
    const vol = obtenerVolumen();
    
    if (vol > 0) {
        slider.dataset.lastVolume = vol; 
        slider.value = 0;
    } else {
        slider.value = slider.dataset.lastVolume || 0.4; 
    }
    actualizarVolumen();
});

// --- Funciones de Ranking/Historial (Mantenidas) ---
async function guardarHistorialFirebase(nota) {
    try {
        await addDoc(collection(db, "historial_academico"), {
            email: currentUserEmail,
            score: nota,
            date: new Date(),
            uid: uidJugadorPermanente
        });
    } catch (e) { console.error("Error guardando historial:", e); }
}

async function guardarPuntajeGlobal(nota) {
    try {
        const today = new Date().toLocaleDateString();
        const docRef = doc(db, "ranking_global", uidJugadorPermanente); 
        
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().dateString === today) {
            if (nota > docSnap.data().score) {
                await updateDoc(docRef, {
                    score: nota,
                    date: new Date(),
                    dateString: today
                });
            }
        } else {
            await setDoc(docRef, {
                email: currentUserEmail,
                score: nota,
                date: new Date(),
                dateString: today
            });
        }
    } catch (e) { console.error("Error guardando puntaje global:", e); }
}


// --- 18. GESTIÓN DE SALA AL CERRAR VENTANA/PESTAÑA (Mantenido) ---

window.addEventListener('beforeunload', async (e) => {
    // Intenta limpiar la sala si el usuario la está abandonando
    if (currentSalaId && tempBattleID) {
        // La limpieza se hará de forma asíncrona, pero el navegador lo intentará.
        await limpiarSala(currentSalaId); 
    }
});

document.addEventListener('visibilitychange', async () => {
    // Si la página se oculta (minimiza o cambia de pestaña) y está en modo Batalla, limpiar la sesión
    // Nota: Esta limpieza solo es crucial en el lobby. Si ya está jugando, el juego continúa localmente.
    if (document.hidden && currentSalaId && tempBattleID) {
        // Podríamos decidir NO limpiar si data.estado === 'jugando', pero la limpieza evita fantasmas.
        await limpiarSala(currentSalaId);
    }
});
