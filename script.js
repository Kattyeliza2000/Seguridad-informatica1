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
let jugadoresEnSalaAlFinal = []; // Para guardar los jugadores y dibujar el podio

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
const lobbyStatusText = document.getElementById('lobby-status-text'); 
const finalAvatarDisplay = document.getElementById('final-avatar-display');
const roomResultsBox = document.getElementById('room-results-box');
const podiumContainer = document.getElementById('podium-container');


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

// --- FUNCIÓN CLAVE: UNIRSE A SALA Y GESTIÓN DE LOBBY EN TIEMPO REAL (MODIFICADA) ---
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
        score: 0, // Score inicial
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
