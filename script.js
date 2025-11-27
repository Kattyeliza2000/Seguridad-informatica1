import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
// Se mantienen los imports de Firestore necesarios para validar dispositivos
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, query, orderBy, limit, onSnapshot, where, deleteDoc, updateDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// --- 1. CONFIGURACIÓN FINAL (PROYECTO: simulador-c565e) ---
// ESTA ES LA CONFIGURACIÓN PROPORCIONADA POR TU NUEVO PROYECTO
const firebaseConfig = {
    apiKey: "AIzaSyCvxiNJivb3u_S0nNkYrUEYxTO_XUkTKDk",
    authDomain: "simulador-c565e.firebaseapp.com",
    projectId: "simulador-c565e",
    storageBucket: "simulador-c565e.firebasestorage.app",
    messagingSenderId: "673284794982",
    appId: "1:673284794982:web:3c21cf20e04798a647dba7",
    measurementId: "G-W715QQWGY1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 2. LISTA DE CORREOS AUTORIZADOS Y DIFERENCIADOS ---
const correosDosDispositivos = ["dpachecog2@unemi.edu.ec", "htigrer@unemi.edu.ec", "sgavilanezp2@unemi.edu.ec", "jzamoram9@unemi.edu.ec", "fcarrillop@unemi.edu.ec", "naguilarb@unemi.edu.ec", "kholguinb2@unemi.edu.ec"];
const correosUnDispositivo = ["cnavarretem4@unemi.edu.ec", "gorellanas2@unemi.edu.ec", "ehidalgoc4@unemi.edu.ec", "lbrionesg3@unemi.edu.ec", "xsalvadorv@unemi.edu.ec", "nbravop4@unemi.edu.ec", "jmoreirap6@unemi.edu.ec", "jcastrof8@unemi.edu.ec", "jcaleroc3@unemi.edu.ec"];
const correosPermitidos = [...correosDosDispositivos, ...correosUnDispositivo];

// --- 3. VARIABLES GLOBALES (Limpias de conflictos) ---
let preguntasExamen = []; 
let indiceActual = 0;
let respuestasUsuario = []; 
let seleccionTemporal = null; 
let tiempoRestante = 0;
let intervaloTiempo;
let currentUserEmail = "";
let currentMode = 'individual';
let uidJugadorPermanente = null; // ID ÚNICO de Firebase (para Historial/Ranking)
let currentAvatarUrl = null; 
let currentStreak = 0; 
let startTime = 0; 

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


// --- 4. BANCO DE PREGUNTAS COMPLETO ---
const bancoPreguntas = [
    { texto: "¿Cuál es un ejemplo de amenaza técnica según el documento?", opciones: ["Phishing", "Baja tensión eléctrica", "Inyección SQL", "Insider"], respuesta: 1, explicacion: "Respuesta correcta: Baja tensión eléctrica (Fallo técnico/suministro)." },
    { texto: "¿Qué herramienta open-source permite escaneos de gran escala en red y sistemas?", opciones: ["Nmap", "Fortinet WVS", "OpenVAS", "Nessus Essentials"], respuesta: 0, explicacion: "Respuesta correcta: Nmap (Herramienta fundamental para escaneo y mapeo de redes)." },
    { texto: "El término SSRF significa:", opciones: ["Safe Session Reset Form", "Simple Service Relay Feature", "Secure Software Risk Framework", "Server-Side Request Forgery"], respuesta: 3, explicacion: "Respuesta correcta: Server-Side Request Forgery" },
    { texto: "El proyecto OWASP tiene como finalidad principal:", opciones: ["Vender cortafuegos", "Producir malware de prueba", "Crear estándares de hardware", "Mejorar la seguridad de aplicaciones web de forma abierta"], respuesta: 3, explicacion: "Respuesta correcta: Mejorar la seguridad de aplicaciones web de forma abierta" },
    { texto: "La gestión de activos se considera importante porque:", opciones: ["Genera llaves criptográficas", "Reduce el jitter", "Actualiza antivirus", "Mantiene control sobre hardware, software y datos"], respuesta: 3, explicacion: "Respuesta correcta: Mantiene control sobre hardware, software y datos" },
    { texto: "El operador “eq” en una regla de firewall sirve para:", opciones: ["Cambiar protocolo", "Hacer ping", "Filtrar un número de puerto específico", "Denegar IPs"], respuesta: 2, explicacion: "Respuesta correcta: Filtrar un número de puerto específico" },
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
    { texto: "El principio “C” del trípode CIA significa:", opciones: ["Confidencialidad", "Conectividad", "Capacidad", "Continuidad"], respuesta: 0, explicacion: "Respuesta correcta: Confidencialidad" },
    { texto: "El algoritmo RSA fue propuesto por:", opciones: ["Diffie & Hellman", "Rivest, Shamir y Adleman", "ElGamal", "Miller & Koblitz"], respuesta: 1, explicacion: "Respuesta correcta: Rivest, Shamir y Adleman" },
    { texto: "El método de transposición se basa en:", opciones: ["Usar claves públicas", "Reordenar las letras del mensaje", "Sustituir letras por números", "Generar firmas digitales"], respuesta: 1, explicacion: "Respuesta correcta: Reordenar las letras del mensaje" },
    { texto: "DES trabaja con bloques de:", opciones: ["32 bits", "256 bits", "64 bits", "128 bits"], respuesta: 2, explicacion: "Respuesta correcta: 64 bits" },
    { texto: "En un par de claves RSA, la clave que debe mantenerse secreta es la:", opciones: ["Compartida", "Certificada", "Pública", "Privada"], respuesta: 3, explicacion: "Respuesta correcta: Privada" },
    { texto: "Una firma digital permite verificar principalmente la:", opciones: ["Velocidad de red", "Compresión", "Fragmentación IP", "Integridad del mensaje y la identidad del remitente"], respuesta: 3, explicacion: "Respuesta correcta: Integridad del mensaje y la identidad del remitente" },
    { texto: "Un cifrador en flujo cifra la información:", opciones: ["Con curvas elípticas", "Mediante RSA", "En bloques de 128 bits", "Bit a bit"], respuesta: 3, explicacion: "Respuesta correcta: Bit a bit" },
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
    { texto: "Ventaja de un firewall perimetral bien configurado:", opciones: ["Mejora la batería de los clientes", "Elimina todos los virus", "Reduce la superficie de ataque expuesta a Internet", "Incrementa la velocidad Wi-Fi"], respuesta: 2, explicacion: "Respuesta correcta: Reduce la superficie de ataque expuesta a Internet" },
    { texto: "Herramienta que identifica puertos abiertos y sistema operativo desde consola:", opciones: ["OpenVAS", "Wireshark", "Nessus", "Nmap"], respuesta: 3, explicacion: "Respuesta correcta: Nmap" },
    { texto: "Un IDS normalmente responde:", opciones: ["Eliminando archivos", "Aumentando ancho de banda", "Generando alertas o registrando eventos", "Cambiando contraseñas"], respuesta: 2, explicacion: "Respuesta correcta: Generando alertas o registrando eventos." },
    { texto: "Un objetivo clave de la seguridad de bases de datos es mantener la:", opciones: ["Confidencialidad, integridad y disponibilidad (CIA)", "Fragmentación", "Redundancia excesiva", "Compresión"], respuesta: 0, explicacion: "Respuesta correcta: CIA." }
];

// VARIABLES GLOBALES
let preguntasExamen = []; // Se llena aleatoriamente con 20 preguntas
let indiceActual = 0;
let respuestasUsuario = []; 
let seleccionTemporal = null; 
let tiempoRestante = 0;
let intervaloTiempo;
let currentUserEmail = "";
let currentMode = 'individual';
let uidJugadorPermanente = null; // ID ÚNICO de Firebase para Historial/Ranking
let currentAvatarUrl = null; 
let currentStreak = 0; 
let startTime = 0; 

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


// --- 5. FUNCIÓN: OBTENER ID ÚNICO DEL DISPOSITIVO ---
function obtenerDeviceId() {
    let deviceId = localStorage.getItem('device_id_seguro');
    if (!deviceId) {
        deviceId = 'dev_' + Math.random().toString(36).substr(2, 9) + Date.now();
        localStorage.setItem('device_id_seguro', deviceId);
    }
    return deviceId;
}

// --- 6. FUNCIÓN DE VOZ ---
function hablar(texto) {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'es-ES';
    utterance.rate = 1.0;
    synth.speak(utterance);
}

// --- 7. LÓGICA DE SEGURIDAD AVANZADA (CUPOS DIFERENCIADOS) ---
async function validarDispositivo(user) {
    currentUserEmail = user.email;
    uidJugadorPermanente = user.uid; // Asignar el UID de Firebase
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
            if (listaDispositivos.length < limiteDispositivos) {
                listaDispositivos.push(miDeviceId);
                await setDoc(docRef, { dispositivos: listaDispositivos }, { merge: true });
                return true;
            } else {
                alert(`⛔ ACCESO DENEGADO ⛔\n\nHas excedido tu límite de ${limiteDispositivos} dispositivos registrados. Debes cerrar sesión en otro equipo para continuar.`);
                await signOut(auth);
                location.reload();
                return false;
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

// --- 8. MONITOR DE AUTENTICACIÓN ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        if (correosPermitidos.includes(user.email)) {
            const titulo = document.querySelector('h2');
            if(titulo) titulo.innerText = "Verificando Dispositivo..."; 
            
            const dispositivoValido = await validarDispositivo(user);
            
            if (dispositivoValido) {
                authScreen.classList.add('hidden');
                setupScreen.classList.remove('hidden');
                btnLogout.classList.remove('hidden');
                
                // Mostrar datos de perfil y foto
                const nombreReal = user.displayName || user.email.split('@')[0];
                document.getElementById('user-display').innerText = nombreReal;
                if(user.photoURL) document.getElementById('header-photo').src = user.photoURL;

                if(titulo) titulo.innerText = "Bienvenido";
                
                // Audio de bienvenida usando síntesis de voz
                setTimeout(() => {
                    hablar(`Bienvenido ${nombreReal}, elija la opción que necesite.`);
                }, 500); 
            }
        } else {
            alert("ACCESO RESTRINGIDO: Tu correo no está autorizado.");
            signOut(auth);
        }
    } else {
        authScreen.classList.remove('hidden');
        setupScreen.classList.add('hidden');
        quizScreen.classList.add('hidden');
        resultScreen.classList.add('hidden');
        reviewScreen.classList.add('hidden');
        btnLogout.classList.add('hidden');
    }
});

// --- 9. EVENTOS DE AUTENTICACIÓN ---
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

// --- 10. LÓGICA DEL EXAMEN ---
document.getElementById('btn-start').addEventListener('click', () => {
    // ... [Lógica del Examen/Estudio] ...
    const tiempo = document.getElementById('time-select').value;
    const modo = document.getElementById('mode-select').value;

    if (tiempo !== 'infinity') { tiempoRestante = parseInt(tiempo) * 60; iniciarReloj(); } 
    else { document.getElementById('timer-display').innerText = "--:--"; }
    
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
});

// --- 11. FUNCIONES DE QUIZ ---
function cargarPregunta() {
    seleccionTemporal = null; 
    btnNextQuestion.classList.add('hidden'); 
    
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
    const isStudyMode = document.getElementById('mode-select').value === 'study';

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


btnNextQuestion.addEventListener('click', () => {
    const isStudyMode = document.getElementById('mode-select').value === 'study';
    
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


function iniciarReloj() {
    intervaloTiempo = setInterval(() => {
        tiempoRestante--;
        let m = Math.floor(tiempoRestante / 60), s = tiempoRestante % 60;
        document.getElementById('timer-display').innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
        if (tiempoRestante <= 0) { clearInterval(intervaloTiempo); terminarQuiz(); }
    }, 1000);
}

function terminarQuiz() {
    clearInterval(intervaloTiempo);
    let aciertos = 0;
    const totalPreguntas = preguntasExamen.length;
    
    preguntasExamen.forEach((p, i) => { if (respuestasUsuario[i] === p.respuesta) aciertos++; });
    quizScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    document.getElementById('score-final').innerText = `${aciertos} / ${totalPreguntas}`;
    
    const modeSelect = document.getElementById('mode-select');
    if (modeSelect && modeSelect.value === 'study') {
        document.getElementById('btn-review').classList.add('hidden');
    } else {
        document.getElementById('btn-review').classList.remove('hidden');
    }
}

// --- 12. REVISIÓN ---
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
