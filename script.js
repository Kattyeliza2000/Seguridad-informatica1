// 1. IMPORTAR FIREBASE (Usando los enlaces CDN correctos para web)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ---------------------------------------------------------
// 2. TUS LLAVES REALES (PROYECTO: autenticacion-8faac)
// ---------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyAMQpnPJSdicgo5gungVOE0M7OHwkz4P9Y",
  authDomain: "autenticacion-8faac.firebaseapp.com",
  projectId: "autenticacion-8faac",
  storageBucket: "autenticacion-8faac.firebasestorage.app",
  messagingSenderId: "939518706600",
  appId: "1:939518706600:web:d28c3ec7de21da8379939d",
  measurementId: "G-8LXM9VS1M0"
};

// 3. INICIALIZAR LA APP
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ---------------------------------------------------------
// 4. SEGURIDAD: LISTA DE CORREOS PERMITIDOS
// ---------------------------------------------------------
const correosPermitidos = [
    "dpachecog2@unemi.edu.ec", 
    "cnavarretem4@unemi.edu.ec", 
    "htigrer@unemi.edu.ec", 
    "gorellanas2@unemi.edu.ec", 
    "iastudillol@unemi.edu.ec", 
    "sgavilanezp2@unemi.edu.ec", 
    "jzamoram9@unemi.edu.ec", 
    "fcarrillop@unemi.edu.ec", 
    "naguilarb@unemi.edu.ec", 
    "ehidalgoc4@unemi.edu.ec", 
    "lbrionesg3@unemi.edu.ec", 
    "xsalvadorv@unemi.edu.ec", 
    "nbravop4@unemi.edu.ec", 
    "jmoreirap6@unemi.edu.ec", 
    "kholguinb2@unemi.edu.ec",
    "ky211209@gmail.com", // Tu correo personal (para pruebas)
    "ky2112h@gmail.com"   // Tu otro correo
];

// 5. BASE DE DATOS DE PREGUNTAS
const preguntas = [
    { texto: "¿Qué categoría de activo abarca servidores, routers y estaciones de trabajo?", opciones: ["Data", "Lines & Networks", "Hardware", "Software"], respuesta: 2 },
    { texto: "Una amenaza ambiental típica para un centro de datos sería:", opciones: ["Huracán", "Robo de servidores", "Virus informático", "Pérdida de energía"], respuesta: 0 },
    { texto: "¿Qué nivel de riesgo requiere medidas inmediatas según la tabla de niveles?", opciones: ["Alto/Extremo", "Bajo", "Negligible", "Medio"], respuesta: 0 },
    { texto: "El estándar OWASP ASVS se utiliza para:", opciones: ["Generar certificados SSL", "Probar hardware", "Cifrado TLS", "Verificar controles de seguridad en aplicaciones"], respuesta: 3 }
];

let indiceActual = 0;
let puntaje = 0;
let tiempoRestante = 0;
let intervaloTiempo;

// REFERENCIAS HTML
const authScreen = document.getElementById('auth-screen');
const setupScreen = document.getElementById('setup-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const btnLogout = document.getElementById('btn-logout');

// --- LÓGICA DE VALIDACIÓN DE USUARIOS (SEGURIDAD) ---

onAuthStateChanged(auth, (user) => {
    if (user) {
        // 1. El usuario puso la contraseña correcta en Firebase.
        // 2. AHORA verificamos si su correo es de la UNEMI.
        if (correosPermitidos.includes(user.email)) {
            // ¡TODO CORRECTO!
            authScreen.classList.add('hidden');
            setupScreen.classList.remove('hidden');
            btnLogout.classList.remove('hidden');
            document.getElementById('user-display').innerText = user.email;
        } else {
            // Contraseña bien, pero correo NO autorizado.
            alert("ACCESO DENEGADO: Tu correo (" + user.email + ") no está en la lista autorizada.");
            signOut(auth); // Lo sacamos
        }
    } else {
        // Nadie conectado
        authScreen.classList.remove('hidden');
        setupScreen.classList.add('hidden');
        quizScreen.classList.add('hidden');
        resultScreen.classList.add('hidden');
        btnLogout.classList.add('hidden');
    }
});

// Botón Login (Correo y Contraseña)
document.getElementById('btn-login').addEventListener('click', () => {
    const email = document.getElementById('email-input').value;
    const pass = document.getElementById('pass-input').value;
    signInWithEmailAndPassword(auth, email, pass)
        .catch((error) => alert("Error: Contraseña incorrecta o usuario no encontrado."));
});

// Botón Registro
document.getElementById('btn-register').addEventListener('click', () => {
    const email = document.getElementById('email-input').value;
    const pass = document.getElementById('pass-input').value;
    
    // Verificamos lista antes de molestar a Firebase
    if (!correosPermitidos.includes(email)) {
        alert("No puedes registrarte. Tu correo no es institucional.");
        return;
    }

    createUserWithEmailAndPassword(auth, email, pass)
        .then(() => alert("Cuenta creada exitosamente."))
        .catch((error) => alert("Error: " + error.message));
});

// Botón Google
document.getElementById('btn-google').addEventListener('click', () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch((error) => {
        console.error(error);
        alert("Error con Google. Verifica que el dominio esté autorizado en Firebase (Authentication -> Settings -> Dominios).");
    });
});

// Botón Salir
btnLogout.addEventListener('click', () => {
    signOut(auth);
    location.reload();
});

// --- LÓGICA DEL EXAMEN ---
document.getElementById('btn-start').addEventListener('click', () => {
    const tiempo = document.getElementById('time-select').value;
    if (tiempo !== 'infinity') {
        tiempoRestante = parseInt(tiempo) * 60;
        iniciarReloj();
    } else {
        document.getElementById('timer-display').innerText = "--:--";
    }
    setupScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');
    cargarPregunta();
});

function cargarPregunta() {
    if (indiceActual >= preguntas.length) {
        terminarQuiz();
        return;
    }
    const data = preguntas[indiceActual];
    document.getElementById('question-text').innerText = `${indiceActual + 1}. ${data.texto}`;
    const cont = document.getElementById('options-container');
    cont.innerHTML = '';
    data.opciones.forEach((opcion, index) => {
        const btn = document.createElement('button');
        btn.innerText = opcion;
        btn.onclick = () => verificarRespuesta(index, btn);
        cont.appendChild(btn);
    });
    document.getElementById('progress-display').innerText = `Pregunta ${indiceActual + 1} de ${preguntas.length}`;
}

function verificarRespuesta(index, btn) {
    const correcta = preguntas[indiceActual].respuesta;
    const botones = document.getElementById('options-container').querySelectorAll('button');
    botones.forEach(b => b.disabled = true);
    if (index === correcta) {
        btn.classList.add('correct');
        puntaje++;
    } else {
        btn.classList.add('incorrect');
        botones[correcta].classList.add('correct');
    }
    setTimeout(() => { indiceActual++; cargarPregunta(); }, 1500);
}

function iniciarReloj() {
    intervaloTiempo = setInterval(() => {
        tiempoRestante--;
        let m = Math.floor(tiempoRestante / 60);
        let s = tiempoRestante % 60;
        document.getElementById('timer-display').innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
        if (tiempoRestante <= 0) { clearInterval(intervaloTiempo); terminarQuiz(); }
    }, 1000);
}

function terminarQuiz() {
    clearInterval(intervaloTiempo);
    quizScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    document.getElementById('score-final').innerText = `${puntaje} / ${preguntas.length}`;
}
