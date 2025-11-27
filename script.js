import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, query, orderBy, limit, onSnapshot, where, deleteDoc, updateDoc, arrayUnion, arrayRemove, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAMQpnPJSdicgo5gungVOE0M7OHwkz4P9Y",
    authDomain: "autenticacion-8faac.firebaseapp.com",
    projectId: "autenticacion-8faac",
    storageBucket: "autenticacion-8faac.firebasestorage.app",
    messagingSenderId: "939518706600",
    appId: "1:939518706600:web:d28c3ec7de21da8379939d",
    measurementId: "G-8LXM9VS1M0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const correosDosDispositivos = ["dpachecog2@unemi.edu.ec", "htigrer@unemi.edu.ec", "sgavilanezp2@unemi.edu.ec", "jzamoram9@unemi.edu.ec", "fcarrillop@unemi.edu.ec", "naguilarb@unemi.edu.ec", "kholguinb2@unemi.edu.ec"];
const correosUnDispositivo = ["cnavarretem4@unemi.edu.ec", "gorellanas2@unemi.edu.ec", "ehidalgoc4@unemi.edu.ec", "lbrionesg3@unemi.edu.ec", "xsalvadorv@unemi.edu.ec", "nbravop4@unemi.edu.ec", "jmoreirap6@unemi.edu.ec", "jcastrof8@unemi.edu.ec", "jcaleroc3@unemi.edu.ec"];
const correosPermitidos = [...correosDosDispositivos, ...correosUnDispositivo];

const AVATAR_CONFIG = [
    { seed: 'Felix', style: 'avataaars', bg: 'b6e3f4' },
    { seed: 'Aneka', style: 'avataaars', bg: 'c0aede' },
    { seed: 'Zoe', style: 'avataaars', bg: 'd1d4f9' },
    { seed: 'Bear', style: 'avataaars', bg: 'ffdfbf' },
    { seed: 'Chester', style: 'avataaars', bg: 'ffd5dc' },
    { seed: 'Bandit', style: 'lorelei', bg: 'c0aede' },
    { seed: 'Molly', style: 'lorelei', bg: 'b6e3f4' },
    { seed: 'Buster', style: 'lorelei', bg: 'ffdfbf' }
];

const ROOM_ICONS = {
    "SALA_FIREWALL": "fa-fire",
    "SALA_ENCRIPTADO": "fa-lock",
    "SALA_ZERO_DAY": "fa-bug",
    "SALA_PHISHING": "fa-fish",
    "SALA_RANSOMWARE": "fa-skull-crossbones",
    "SALA_BOTNET": "fa-robot"
};

let currentAvatarUrl = null;
let currentStreak = 0;
let startTime = 0; 
let jugadorActualData = null; 

// --- BANCO DE PREGUNTAS COMPLETO (64 PREGUNTAS) ---
const bancoPreguntas = [
    { texto: "¿Cuál es un ejemplo de amenaza técnica según el documento?", opciones: ["Phishing", "Baja tensión eléctrica", "Inyección SQL", "Insider"], respuesta: 1, explicacion: "Respuesta correcta: Baja tensión eléctrica." },
    { texto: "¿Qué herramienta open-source permite escaneos de gran escala en red y sistemas?", opciones: ["Nmap", "Fortinet WVS", "OpenVAS", "Nessus Essentials"], respuesta: 2, explicacion: "Respuesta correcta: OpenVAS." },
    { texto: "Una amenaza ambiental típica para un centro de datos sería:", opciones: ["Huracán", "Robo de servidores", "Virus informático", "Pérdida de energía"], respuesta: 0, explicacion: "Respuesta correcta: Huracán." },
    { texto: "Herramienta que identifica puertos abiertos y sistema operativo desde consola:", opciones: ["OpenVAS", "Wireshark", "Nessus", "Nmap"], respuesta: 3, explicacion: "Respuesta correcta: Nmap." },
    { texto: "Un IDS normalmente responde:", opciones: ["Eliminando archivos", "Aumentando ancho de banda", "Generando alertas o registrando eventos", "Cambiando contraseñas"], respuesta: 2, explicacion: "Respuesta correcta: Generando alertas o registrando eventos." },
    { texto: "Un objetivo clave de la seguridad de bases de datos es mantener la:", opciones: ["Confidencialidad, integridad y disponibilidad (CIA)", "Fragmentación", "Redundancia excesiva", "Compresión"], respuesta: 0, explicacion: "Respuesta correcta: Confidencialidad, integridad y disponibilidad (CIA)." },
    { texto: "El término SSRF significa:", opciones: ["Safe Session Reset Form", "Simple Service Relay Feature", "Secure Software Risk Framework", "Server-Side Request Forgery"], respuesta: 3, explicacion: "Respuesta correcta: Server-Side Request Forgery." },
    { texto: "El proyecto OWASP tiene como finalidad principal:", opciones: ["Vender cortafuegos", "Producir malware de prueba", "Crear estándares de hardware", "Mejorar la seguridad de aplicaciones web de forma abierta"], respuesta: 3, explicacion: "Respuesta correcta: Mejorar la seguridad de aplicaciones web de forma abierta." },
    { texto: "La gestión de activos se considera importante porque:", opciones: ["Genera llaves criptográficas", "Reduce el jitter", "Actualiza antivirus", "Mantiene control sobre hardware, software y datos"], respuesta: 3, explicacion: "Respuesta correcta: Mantiene control sobre hardware, software y datos." },
    { texto: "El operador 'eq' en una regla de firewall sirve para:", opciones: ["Cambiar protocolo", "Hacer ping", "Filtrar un número de puerto específico", "Denegar IPs"], respuesta: 2, explicacion: "Respuesta correcta: Filtrar un número de puerto específico." },
    { texto: "Una falla criptográfica puede conducir principalmente a:", opciones: ["Exposición de datos confidenciales", "Jitter elevando", "DoS", "Aumento de latencia"], respuesta: 0, explicacion: "Respuesta correcta: Exposición de datos confidenciales." },
    { texto: "¿Qué categoría de activo abarca servidores, routers y estaciones de trabajo?", opciones: ["Data", "Lines & Networks", "Hardware", "Software"], respuesta: 2, explicacion: "Respuesta correcta: Hardware." },
    { texto: "¿Qué nivel de riesgo requiere medidas inmediatas según la tabla de niveles?", opciones: ["Alto/Extremo", "Bajo", "Negligible", "Medio"], respuesta: 0, explicacion: "Respuesta correcta: Alto/Extremo." },
    { texto: "El estándar OWASP ASVS se utiliza para:", opciones: ["Generar certificados SSL", "Probar hardware", "Cifrado TLS", "Verificar controles de seguridad en aplicaciones"], respuesta: 3, explicacion: "Respuesta correcta: Verificar controles de seguridad en aplicaciones." },
    { texto: "Los ataques pasivos se caracterizan por:", opciones: ["Inyectar malware", "Ejecutar DoS", "Destruir hardware", "Escuchar y capturar tráfico"], respuesta: 3, explicacion: "Respuesta correcta: Escuchar y capturar tráfico." },
    { texto: "En el Top 10 OWASP 2021, la vulnerabilidad que ocupa el primer lugar es:", opciones: ["Inyección", "XSS", "Broken Access Control", "SSRF"], respuesta: 2, explicacion: "Respuesta correcta: Broken Access Control." },
    { texto: "Un Sombrero gris (Gray Hat) se define como alguien que:", opciones: ["Actúa a veces como White Hat y a veces como Black Hat", "Sólo ataca redes bancarias", "Es siempre malicioso", "Trabaja para la NSA"], respuesta: 0, explicacion: "Respuesta correcta: Actúa a veces como White Hat y a veces como Black Hat." },
    { texto: "¿Cuál de los siguientes es un ejemplo de ataque activo listado en el material?", opciones: ["Shoulder surfing", "Footprinting", "Inyección SQL", "Sniffing"], respuesta: 2, explicacion: "Respuesta correcta: Inyección SQL." },
    { texto: "Dentro de las fases del hacking ético, la primera etapa es:", opciones: ["Reconocimiento (recon)", "Mantenimiento de acceso", "Escalada de privilegios", "Borrado de huellas"], respuesta: 0, explicacion: "Respuesta correcta: Reconocimiento (recon)." },
    { texto: "El principio 'C' del trípode CIA significa:", opciones: ["Confidencialidad", "Conectividad", "Capacidad", "Continuidad"], respuesta: 0, explicacion: "Respuesta correcta: Confidencialidad." },
    { texto: "El algoritmo RSA fue propuesto por:", opciones: ["Diffie & Hellman", "Rivest, Shamir y Adleman", "ElGamal", "Miller & Koblitz"], respuesta: 1, explicacion: "Respuesta correcta: Rivest, Shamir y Adleman." },
    { texto: "El método de transposición se basa en:", opciones: ["Usar claves públicas", "Reordenar las letras del mensaje", "Sustituir letras por números", "Generar firmas digitales"], respuesta: 1, explicacion: "Respuesta correcta: Reordenar las letras del mensaje." },
    { texto: "DES trabaja con bloques de:", opciones: ["32 bits", "256 bits", "64 bits", "128 bits"], respuesta: 2, explicacion: "Respuesta correcta: 64 bits." },
    { texto: "En un par de claves RSA, la clave que debe mantenerse secreta es la:", opciones: ["Compartida", "Certificada", "Pública", "Privada"], respuesta: 3, explicacion: "Respuesta correcta: Privada." },
    { texto: "Una firma digital permite verificar principalmente la:", opciones: ["Velocidad de red", "Compresión", "Fragmentación IP", "Integridad del mensaje y la identidad del remitente"], respuesta: 3, explicacion: "Respuesta correcta: Integridad del mensaje y la identidad del remitente." },
    { texto: "Un cifrador en flujo cifra la información:", opciones: ["Con curvas elípticas", "Mediante RSA", "En bloques de 128 bits", "Bit a bit"], respuesta: 3, explicacion: "Respuesta correcta: Bit a bit." },
    { texto: "La propiedad que asegura que solo personas autorizadas lean un mensaje es la:", opciones: ["Confidencialidad", "Integridad", "No repudio", "Disponibilidad"], respuesta: 0, explicacion: "Respuesta correcta: Confidencialidad." },
    { texto: "La criptografía de curva elíptica (ECC) ofrece la misma seguridad que RSA con:", opciones: ["Claves más largas", "Claves más cortas", "OTP", "Hashes MD5"], respuesta: 1, explicacion: "Respuesta correcta: Claves más cortas." },
    { texto: "Un protocolo criptográfico es:", opciones: ["Un conjunto de pasos entre entidades para lograr un objetivo de seguridad", "Un certificado X.509", "Una clave pública", "Un algoritmo de hashing"], respuesta: 0, explicacion: "Respuesta correcta: Un conjunto de pasos entre entidades para lograr un objetivo de seguridad." },
    { texto: "La longitud efectiva de clave en DES es de:", opciones: ["128 bits", "56 bits", "512 bits", "40 bits"], respuesta: 1, explicacion: "Respuesta correcta: 56 bits." },
    { texto: "Los protocolos de autenticación tipo desafío-respuesta sirven para:", opciones: ["Cifrar discos", "Medir jitter", "Verificar la identidad de un usuario sin revelar el secreto", "Generar OTP"], respuesta: 2, explicacion: "Respuesta correcta: Verificar la identidad de un usuario sin revelar el secreto." },
    { texto: "Ventaja esencial de la criptografía de clave pública:", opciones: ["Requiere OTP", "No usa matemáticas", "No es necesario compartir la clave secreta", "Consume menos CPU"], respuesta: 2, explicacion: "Respuesta correcta: No es necesario compartir la clave secreta." },
    { texto: "El ataque conocido como watering-hole consiste en:", opciones: ["Infectar un sitio legítimo visitado por el objetivo", "Falsificar DNS", "Shoulder surfing", "Phishing SMS"], respuesta: 0, explicacion: "Respuesta correcta: Infectar un sitio legítimo visitado por el objetivo." },
    { texto: "El método de autenticación más común y sencillo es el uso de:", opciones: ["Tokens biométricos", "NFC implantado", "Contraseñas", "Blockchain"], respuesta: 2, explicacion: "Respuesta correcta: Contraseñas." },
    { texto: "Un nombre NetBIOS estándar contiene:", opciones: ["32 bits aleatorios", "Sólo números hexadecimales", "15 caracteres del dispositivo y 1 del servicio", "8 bytes fijos"], respuesta: 2, explicacion: "Respuesta correcta: 15 caracteres del dispositivo y 1 del servicio." },
    { texto: "El fin de un ataque de escalada de privilegios es:", opciones: ["Obtener accesos de mayor nivel o ilimitados", "Subir jitter", "Colapsar la red", "Robar hardware"], respuesta: 0, explicacion: "Respuesta correcta: Obtener accesos de mayor nivel o ilimitados." },
    { texto: "El ataque whaling se dirige principalmente a:", opciones: ["Estudiantes", "Altos ejecutivos", "Soporte técnico", "Servidores DNS"], respuesta: 1, explicacion: "Respuesta correcta: Altos ejecutivos." },
    { texto: "En un cifrado simétrico la misma clave sirve para:", opciones: ["Cifrar y descifrar", "Sólo cifrar", "Distribuir claves públicas", "Sólo firma"], respuesta: 0, explicacion: "Respuesta correcta: Cifrar y descifrar." },
    { texto: "¿Cuál es el objetivo principal de la criptografía?", opciones: ["Reducir el ancho de banda", "Convertir texto en imágenes", "Garantizar la seguridad de la información y las comunicaciones", "Firmar correos"], respuesta: 2, explicacion: "Respuesta correcta: Garantizar la seguridad de la información y las comunicaciones." },
    { texto: "La herramienta Metasploit Framework destaca por permitir:", opciones: ["Generar hashes MD5", "Crear certificados SSL", "Levantar un servidor SMB falso y capturar hashes", "Cifrar discos"], respuesta: 2, explicacion: "Respuesta correcta: Levantar un servidor SMB falso y capturar hashes." },
    { texto: "En SMTP, el comando que verifica un usuario es:", opciones: ["HELO", "DATA", "RCPT TO", "VRFY"], respuesta: 3, explicacion: "Respuesta correcta: VRFY." },
    { texto: "Un hacker ético (White Hat) se caracteriza por:", opciones: ["Espiar empresas", "Contar con permiso para probar sistemas", "Obtener lucro personal", "Distribuir ransomware"], respuesta: 1, explicacion: "Respuesta correcta: Contar con permiso para probar sistemas." },
    { texto: "En la autenticación de dos factores (2FA), un segundo factor puede ser:", opciones: ["Token de un solo uso (OTP)", "Dirección MAC", "Dominio DNS", "Subnet mask"], respuesta: 0, explicacion: "Respuesta correcta: Token de un solo uso (OTP)." },
    { texto: "Wifiphisher es una herramienta usada para:", opciones: ["Enumerar DNS", "Escanear puertos", "Obtener contraseñas WPA/WPA2 vía phishing", "Realizar fuzzing"], respuesta: 2, explicacion: "Respuesta correcta: Obtener contraseñas WPA/WPA2 vía phishing." },
    { texto: "El primer paso de un ataque de ingeniería social es:", opciones: ["Borrar huellas", "Recopilar información de la víctima", "Infectar con ransomware", "Solicitar rescate"], respuesta: 1, explicacion: "Respuesta correcta: Recopilar información de la víctima." },
    { texto: "La enumeración se emplea para listar:", opciones: ["Temperatura CPU", "Usuarios, hosts y servicios del sistema", "Parches instalados", "Logs de impresora"], respuesta: 1, explicacion: "Respuesta correcta: Usuarios, hosts y servicios del sistema." },
    { texto: "¿Cuál es el objetivo principal de la seguridad física en una organización?", opciones: ["Optimizar la impresión", "Aumentar el ancho de banda", "Permitir el libre acceso visitante", "Disminuir el riesgo sobre infraestructuras y datos"], respuesta: 3, explicacion: "Respuesta correcta: Disminuir el riesgo sobre infraestructuras y datos." },
    { texto: "¿Para qué se usa Maltego en OSINT?", opciones: ["Actualizar firmware", "Probar puertos UDP", "Gestionar contraseñas", "Mapear relaciones entre entidades"], respuesta: 3, explicacion: "Respuesta correcta: Mapear relaciones entre entidades." },
    { texto: "Un ataque interno suele ser realizado por:", opciones: ["Botnets externas", "Spammers", "Empleados con acceso privilegiado", "Hackers anónimos"], respuesta: 2, explicacion: "Respuesta correcta: Empleados con acceso privilegiado." },
    { texto: "SNMP se transporta habitualmente sobre:", opciones: ["ICMP", "UDP", "SCTP", "TCP puerto 80"], respuesta: 1, explicacion: "Respuesta correcta: UDP." },
    { texto: "En la fórmula de nivel de riesgo, 'consecuencia' se refiere a:", opciones: ["Probabilidad", "Severidad del daño", "Valor del activo", "Tiempo de respuesta"], respuesta: 1, explicacion: "Respuesta correcta: Severidad del daño." },
    { texto: "El escáner de vulnerabilidades Nikto2 se centra en:", opciones: ["Aplicaciones web y servidores HTTP", "Bases de datos", "Redes SCADA", "Firmware loT"], respuesta: 0, explicacion: "Respuesta correcta: Aplicaciones web y servidores HTTP." },
    { texto: "El ataque de fisherman phishing se apoya principalmente en:", opciones: ["Llamadas VoIP", "Redes sociales", "MQTT", "Correos masivos"], respuesta: 1, explicacion: "Respuesta correcta: Redes sociales." },
    { texto: "La relación básica de riesgo se expresa como:", opciones: ["Amenaza + Impacto", "Vulnerabilidad + Impacto", "Amenaza x Vulnerabilidad x Impacto", "Impacto - Probabilidad"], respuesta: 2, explicacion: "Respuesta correcta: Amenaza x Vulnerabilidad x Impacto." },
    { texto: "Una contramedida básica contra la enumeración NetBIOS es:", opciones: ["Abrir puertos 135-139", "Usar SMTP sin TLS", "Habilitar Telnet", "Deshabilitar el uso compartido de archivos/impresoras"], respuesta: 3, explicacion: "Respuesta correcta: Deshabilitar el uso compartido de archivos/impresoras." },
    { texto: "Un ejemplo de control de presencia y acceso es:", opciones: ["UPS", "Barrera antivirus", "Extintor", "CCTV"], respuesta: 3, explicacion: "Respuesta correcta: CCTV." },
    { texto: "En seguridad lógica, el control AAA incluye:", opciones: ["Autenticación, autorización y auditoría", "API, App, Audit", "Antispam, antivirus, antimalware"], respuesta: 0, explicacion: "Respuesta correcta: Autenticación, autorización y auditoría." },
    { texto: "Un ataque pasivo contra WLAN que solo escucha tráfico se denomina:", opciones: ["DoS inalámbrico", "Spoofing", "Jamming", "Eavesdropping"], respuesta: 3, explicacion: "Respuesta correcta: Eavesdropping." },
    { texto: "En una WLAN, ¿qué dispositivo conecta clientes Wi-Fi con la LAN cableada?", opciones: ["Firewall", "Repetidor", "Switch", "Punto de acceso (AP)"], respuesta: 3, explicacion: "Respuesta correcta: Punto de acceso (AP)." },
    { texto: "El tráfico saliente que abandona la red se controla mediante:", opciones: ["VLAN", "Reglas de filtrado de salida en el cortafuegos", "IDS", "VPN"], respuesta: 1, explicacion: "Respuesta correcta: Reglas de filtrado de salida en el cortafuegos." },
    { texto: "Política que define quién accede a qué datos dentro de una BD:", opciones: ["Cifrado TLS", "Autorización / control de acceso", "Compilación", "Backup"], respuesta: 1, explicacion: "Respuesta correcta: Autorización / control de acceso." },
    { texto: "Antes de aplicar parches en producción se debe:", opciones: ["Cambiar el FQDN", "Borrar registros", "Probar el parche en un entorno de pruebas", "Reiniciar IDS"], respuesta: 2, explicacion: "Respuesta correcta: Probar el parche en un entorno de pruebas." },
    { texto: "Una inyección SQL basada en errores aprovecha:", opciones: ["Cifrado AES", "Tiempo de respuesta", "Mensajes de error devueltos por la aplicación", "Token OTP"], respuesta: 2, explicacion: "Respuesta correcta: Mensajes de error devueltos por la aplicación." },
    { texto: "Ventaja de un firewall perimetral bien configurado:", opciones: ["Mejora la batería de los clientes", "Elimina todos los virus", "Reduce la superficie de ataque expuesta a Internet", "Incrementa la velocidad Wi-Fi"], respuesta: 2, explicacion: "Respuesta correcta: Reduce la superficie de ataque expuesta a Internet." }
];

let preguntasExamen = [];
let indiceActual = 0;
let respuestasUsuario = [];
let seleccionTemporal = null;
let tiempoRestante = 0;
let intervaloTiempo;
let currentUserEmail = "";
let currentRoomId = null;
let currentMode = 'individual';
let unsubscribeRoom = null;

function playClick() {
    const sfx = document.getElementById('click-sound');
    if(sfx) { sfx.currentTime = 0; sfx.play().catch(()=>{}); }
}

function initAvatars() {
    const grid = document.getElementById('avatar-grid');
    if(grid.children.length > 1) return; 
    grid.innerHTML = '';
    AVATAR_CONFIG.forEach((av, index) => {
        const url = `https://api.dicebear.com/7.x/${av.style}/svg?seed=${av.seed}&backgroundColor=${av.bg}`;
        const img = document.createElement('img');
        img.src = url;
        img.className = 'avatar-option';
        if(index === 0) { img.classList.add('avatar-selected'); currentAvatarUrl = url; }
        img.onclick = () => {
            playClick();
            document.querySelectorAll('.avatar-option').forEach(x => x.classList.remove('avatar-selected'));
            img.classList.add('avatar-selected');
            currentAvatarUrl = url;
        };
        grid.appendChild(img);
    });
}

function hablar(texto, callback) {
    const synth = window.speechSynthesis;
    if (!synth) { if(callback) callback(); return; }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'es-ES';
    utterance.rate = 1.0;
    const voices = synth.getVoices();
    const naturalVoice = voices.find(v => (v.lang.includes('es') && (v.name.includes('Google') || v.name.includes('Natural'))) || (v.lang === 'es-ES' || v.lang === 'es-419'));
    if(naturalVoice) utterance.voice = naturalVoice;
    if (callback) utterance.onend = callback;
    synth.speak(utterance);
}

window.addEventListener('load', () => {
    setTimeout(() => document.getElementById('app-loader').classList.add('hidden'), 1000);
});

window.addEventListener('beforeunload', (e) => {
    if (!document.getElementById('quiz-screen').classList.contains('hidden') || !document.getElementById('lobby-screen').classList.contains('hidden')) {
        e.preventDefault(); e.returnValue = '';
    }
});

function showScreen(screenId) {
    document.querySelectorAll('.container').forEach(el => el.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
}

function obtenerDeviceId() {
    let deviceId = localStorage.getItem('device_id_seguro');
    if (!deviceId) {
        deviceId = 'dev_' + Math.random().toString(36).substr(2, 9) + Date.now();
        localStorage.setItem('device_id_seguro', deviceId);
    }
    return deviceId;
}

async function validarDispositivo(user) {
    const email = user.email;
    currentUserEmail = email;
    const miDeviceId = obtenerDeviceId();
    let limite = correosDosDispositivos.includes(email) ? 2 : 1;
    const docRef = doc(db, "usuarios_seguros", email);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const datos = docSnap.data();
        let lista = datos.dispositivos || [];
        if (lista.includes(miDeviceId)) return true;
        if (lista.length < limite) {
            lista.push(miDeviceId);
            await setDoc(docRef, { dispositivos: lista }, { merge: true });
            return true;
        } else {
            alert(`⛔ ACCESO DENEGADO\nLímite de ${limite} dispositivos alcanzado.`);
            await signOut(auth);
            location.reload();
            return false;
        }
    } else {
        await setDoc(docRef, { dispositivos: [miDeviceId], fecha: new Date().toISOString() });
        return true;
    }
}

function toggleHeaderButtons() {
    const modo = document.getElementById('mode-select').value;
    const btnRanking = document.getElementById('btn-ranking');
    const btnStats = document.getElementById('btn-stats');
    
    if (modo === 'exam') {
        btnRanking.classList.remove('hidden');
        btnStats.classList.remove('hidden');
    } else {
        btnRanking.classList.add('hidden');
        btnStats.classList.add('hidden');
    }
}

document.getElementById('mode-select').addEventListener('change', toggleHeaderButtons);

onAuthStateChanged(auth, async (user) => {
    if (user) {
        if (correosPermitidos.includes(user.email)) {
            if (await validarDispositivo(user)) {
                showScreen('setup-screen');
                document.getElementById('btn-logout').classList.remove('hidden');
                
                const nombreReal = user.displayName ? user.displayName.split(' ')[0] : user.email.split('@')[0];
                document.getElementById('user-display').innerText = nombreReal;
                document.getElementById('player-nickname').value = nombreReal;
                
                if (user.photoURL) {
                    const profilePic = document.getElementById('user-google-photo');
                    profilePic.src = user.photoURL;
                    profilePic.classList.remove('hidden');
                    const headerPic = document.getElementById('header-photo');
                    if(headerPic) headerPic.src = user.photoURL;
                }
                
                toggleHeaderButtons();
                setTimeout(() => {
                    hablar(`Bienvenido ${nombreReal}, elija la opción que necesite.`);
                }, 500);
            }
        } else {
            alert("No autorizado.");
            signOut(auth);
        }
    } else {
        showScreen('auth-screen');
        document.getElementById('btn-ranking').classList.add('hidden');
        document.getElementById('btn-stats').classList.add('hidden');
        document.getElementById('btn-logout').classList.add('hidden');
        document.getElementById('header-user-info').classList.add('hidden');
    }
});

document.getElementById('btn-google').addEventListener('click', () => signInWithPopup(auth, new GoogleAuthProvider()));
document.getElementById('btn-logout').addEventListener('click', () => { if(confirm("¿Salir?")) { signOut(auth); location.reload(); } });

document.getElementById('btn-start').addEventListener('click', () => {
    const nombre = document.getElementById('user-display').innerText;
    document.getElementById('btn-start').disabled = true;
    hablar("Excelente, te deseo suerte.", () => {
        document.getElementById('btn-start').disabled = false;
        iniciarJuegoReal();
    });
});

function iniciarJuegoReal() {
    const modo = document.getElementById('mode-select').value;
    const tiempo = document.getElementById('time-select').value;
    
    document.getElementById('header-user-info').classList.remove('hidden');
    document.getElementById('header-username').innerText = document.getElementById('user-display').innerText;

    if (tiempo !== 'infinity') { tiempoRestante = parseInt(tiempo) * 60; } 
    else { tiempoRestante = -1; }

    if (modo === 'multiplayer') {
        showScreen('avatar-screen');
        initAvatars(); 
        currentMode = 'multiplayer';
    } 
    else if (modo === 'study') {
        currentMode = 'study';
        // MODO ESTUDIO: 64 PREGUNTAS ALEATORIAS
        preguntasExamen = [...bancoPreguntas].sort(() => 0.5 - Math.random());
        iniciarInterfazQuiz();
    } 
    else {
        currentMode = 'exam';
        // MODO EXAMEN: 20 PREGUNTAS ALEATORIAS
        preguntasExamen = [...bancoPreguntas].sort(() => 0.5 - Math.random()).slice(0, 20);
        iniciarInterfazQuiz();
    }
}

document.getElementById('btn-confirm-identity').addEventListener('click', () => {
    playClick();
    mostrarSelectorSalas();
});

document.getElementById('back-to-setup').addEventListener('click', () => showScreen('setup-screen'));
document.getElementById('back-to-avatar').addEventListener('click', () => showScreen('avatar-screen'));

document.getElementById('btn-stats').addEventListener('click', async () => { 
    try { await cargarGraficoFirebase(); document.getElementById('stats-modal').classList.remove('hidden'); } 
    catch (e) { console.log(e); }
});

document.getElementById('btn-ranking').addEventListener('click', async () => {
    try { document.getElementById('ranking-modal').classList.remove('hidden'); await cargarRankingGlobal(); } 
    catch (e) { console.log(e); }
});

document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.add('hidden');
    });
});

const SALAS_PREDEFINIDAS = ["SALA_FIREWALL", "SALA_ENCRIPTADO", "SALA_ZERO_DAY", "SALA_PHISHING", "SALA_RANSOMWARE", "SALA_BOTNET"];

function mostrarSelectorSalas() {
    showScreen('rooms-screen');
    const list = document.getElementById('rooms-list');
    list.innerHTML = '';
    SALAS_PREDEFINIDAS.forEach(salaId => {
        const btn = document.createElement('div');
        btn.className = 'room-btn';
        btn.innerHTML = `<strong>${salaId.replace('SALA_', '').replace(/_/g, ' ')}</strong><span class="room-count" id="count-${salaId}">...</span>`;
        onSnapshot(doc(db, "salas_activas", salaId), (docSnap) => {
            const count = docSnap.exists() ? (docSnap.data().jugadores || []).length : 0;
            const el = document.getElementById(`count-${salaId}`);
            if(el) el.innerText = `${count} Agentes`;
        });
        btn.onclick = () => { playClick(); unirseASala(salaId); };
        list.appendChild(btn);
    });
}

async function unirseASala(salaId) {
    currentRoomId = salaId;
    const salaRef = doc(db, "salas_activas", salaId);
    const salaSnap = await getDoc(salaRef);
    let tiempoDeLaSala = parseInt(document.getElementById('time-select').value);

    if (salaSnap.exists() && salaSnap.data().jugadores && salaSnap.data().jugadores.length > 0) {
        const config = salaSnap.data().configTiempo;
        if(config) tiempoDeLaSala = config;
    } else {
        await setDoc(salaRef, { configTiempo: tiempoDeLaSala }, { merge: true });
    }

    if (tiempoDeLaSala !== 'infinity') { tiempoRestante = parseInt(tiempoDeLaSala) * 60; } 
    else { tiempoRestante = -1; }

    const nick = document.getElementById('player-nickname').value || currentUserEmail.split('@')[0];
    const jugadorData = { name: nick, avatar: currentAvatarUrl };

    jugadorActualData = jugadorData;

    await setDoc(salaRef, { jugadores: arrayUnion(jugadorData), estado: "esperando" }, { merge: true });

    showScreen('lobby-screen');
    document.getElementById('lobby-title').innerText = salaId.replace('SALA_', '').replace(/_/g, ' ');

    unsubscribeRoom = onSnapshot(salaRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const jugadores = data.jugadores || [];
            const listDiv = document.getElementById('lobby-players');
            listDiv.innerHTML = '';
            
            jugadores.forEach(p => { 
                const name = p.name || p; 
                const av = p.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default&backgroundColor=e0e0e0';
                listDiv.innerHTML += `<div class="player-badge"><img src="${av}" class="lobby-avatar-small"> ${name}</div>`; 
            });
            
            const btnStart = document.getElementById('btn-start-war');
            if (jugadores.length >= 2) btnStart.classList.remove('hidden');
            else btnStart.classList.add('hidden');

            if (data.estado === 'jugando') iniciarQuizMultiplayer();
        }
    });
}

async function limpiarSala(salaId) {
    if(!salaId || !jugadorActualData) return;
    const salaRef = doc(db, "salas_activas", salaId);
    try {
        await updateDoc(salaRef, { jugadores: arrayRemove(jugadorActualData) });
        
        const snap = await getDoc(salaRef);
        if(snap.exists()) {
            const currentPlayers = snap.data().jugadores || [];
            if(currentPlayers.length === 0 && snap.data().estado !== 'esperando') {
                 await updateDoc(salaRef, { estado: 'esperando' });
            }
        }
    } catch (e) { console.error("Error limpiando sala", e); }
}

document.getElementById('btn-leave-lobby').addEventListener('click', async () => {
    if (confirm("¿Abandonar escuadrón?")) {
        if (currentRoomId) {
            await limpiarSala(currentRoomId);
            location.reload();
        }
    }
});

document.getElementById('btn-start-war').addEventListener('click', async () => {
    const salaRef = doc(db, "salas_activas", currentRoomId);
    await updateDoc(salaRef, { estado: 'jugando' });
});

function iniciarQuizMultiplayer() {
    if (unsubscribeRoom) unsubscribeRoom();
    preguntasExamen = [...bancoPreguntas].sort(() => 0.5 - Math.random()).slice(0, 30); // 30 PREGUNTAS
    iniciarInterfazQuiz();
}

function iniciarInterfazQuiz() {
    if(currentMode === 'exam') {
        document.getElementById('btn-ranking').classList.add('locked-btn');
        document.getElementById('btn-stats').classList.add('locked-btn');
    }

    respuestasUsuario = [];
    indiceActual = 0;
    currentStreak = 0;
    startTime = Date.now();
    
    const bgMusic = document.getElementById('bg-music');
    const vol = document.getElementById('volume-slider').value;
    if(bgMusic) { bgMusic.volume = vol; bgMusic.play().catch(e => console.log("Autoplay fail")); }

    if(tiempoRestante > 0) iniciarReloj();
    else document.getElementById('timer-display').innerText = "--:--";

    showScreen('quiz-screen');
    cargarPregunta();
}

function cargarPregunta() {
    if (indiceActual >= preguntasExamen.length) { terminarQuiz(); return; }
    
    const data = preguntasExamen[indiceActual];
    document.getElementById('question-text').innerText = `${indiceActual + 1}. ${data.texto}`;
    const cont = document.getElementById('options-container'); cont.innerHTML = '';
    seleccionTemporal = null;
    document.getElementById('btn-next-question').classList.add('hidden');

    data.opciones.forEach((opcion, index) => {
        const btn = document.createElement('button');
        btn.innerText = opcion;
        btn.onclick = () => seleccionarOpcion(index, btn);
        cont.appendChild(btn);
    });
    document.getElementById('progress-display').innerText = `Pregunta ${indiceActual + 1}/${preguntasExamen.length}`;
}

function seleccionarOpcion(index, btn) {
    if (currentMode === 'study' && seleccionTemporal !== null) return;
    
    seleccionTemporal = index;
    const btns = document.getElementById('options-container').querySelectorAll('button');
    btns.forEach(b => b.classList.remove('option-selected'));
    btn.classList.add('option-selected');
    
    if (currentMode === 'study') {
        mostrarResultadoInmediato(index);
    } else {
        document.getElementById('btn-next-question').classList.remove('hidden');
    }
}

function mostrarResultadoInmediato(sel) {
    const pregunta = preguntasExamen[indiceActual];
    const correcta = pregunta.respuesta;
    const cont = document.getElementById('options-container');
    const btns = cont.querySelectorAll('button');
    
    // Deshabilitar botones
    btns.forEach(b => b.disabled = true);
    
    // Pintar feedback
    btns[correcta].classList.add('ans-correct', 'feedback-visible');
    if(sel !== correcta) btns[sel].classList.add('ans-wrong', 'feedback-visible');
    
    // Mostrar explicación
    const div = document.createElement('div');
    div.className = 'explanation-feedback';
    div.innerHTML = `<strong>Explicación:</strong> ${pregunta.explicacion}`;
    cont.appendChild(div);
    
    respuestasUsuario.push(sel);
    // HABILITAR BOTÓN SIGUIENTE (CORRECCIÓN CRÍTICA)
    document.getElementById('btn-next-question').classList.remove('hidden');
}

document.getElementById('btn-next-question').addEventListener('click', () => {
    if (seleccionTemporal !== null) {
        if(currentMode === 'multiplayer') {
            const correcta = preguntasExamen[indiceActual].respuesta;
            if (seleccionTemporal === correcta) {
                currentStreak++;
                if(currentStreak >= 2) mostrarRacha(currentStreak);
                const sfx = document.getElementById('correct-sound');
                const vol = document.getElementById('volume-slider').value;
                sfx.volume = vol; sfx.play();
            } else {
                currentStreak = 0;
            }
        }

        if(currentMode !== 'study') respuestasUsuario.push(seleccionTemporal);
        indiceActual++;
        cargarPregunta();
    }
});

document.getElementById('btn-exit-war-modal').addEventListener('click', async () => { location.reload(); });

// (Resto de funciones: terminarQuiz, renderBattlePodium, guardarHistorialFirebase, etc., se mantienen igual)
