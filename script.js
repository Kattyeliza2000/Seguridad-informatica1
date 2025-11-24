// 1. IMPORTAR FIREBASE
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

// 2. TU CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyBU1oaDdq6qD4fTiLN4lSAeQg6Kp06gDXk", 
  authDomain: "simulador-tics.firebaseapp.com",
  projectId: "simulador-tics",
  storageBucket: "simulador-tics.firebasestorage.app",
  messagingSenderId: "501091859008",
  appId: "1:501091859008:web:80e4596d2adcb5adbf7da5", 
  measurementId: "G-5LFLE4MBPH"
};

// 3. INICIALIZAR APP
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// --- BASE DE DATOS DE PREGUNTAS (Tus preguntas reales) ---
const preguntas = [
    {
        texto: "¿Qué categoría de activo abarca servidores, routers y estaciones de trabajo?",
        opciones: ["Data", "Lines & Networks", "Hardware", "Software"],
        respuesta: 2 // Hardware
    },
    {
        texto: "Una amenaza ambiental típica para un centro de datos sería:",
        opciones: ["Huracán", "Robo de servidores", "Virus informático", "Pérdida de energía"],
        respuesta: 0 // Huracán
    },
    {
        texto: "¿Qué nivel de riesgo requiere medidas inmediatas según la tabla de niveles?",
        opciones: ["Alto/Extremo", "Bajo", "Negligible", "Medio"],
        respuesta: 0 // Alto/Extremo
    },
    {
        texto: "El estándar OWASP ASVS se utiliza para:",
        opciones: ["Generar certificados SSL", "Probar hardware", "Cifrado TLS", "Verificar controles de seguridad en aplicaciones"],
        respuesta: 3 // Verificar controles de seguridad en aplicaciones
    }
];

let indiceActual = 0;
let puntaje = 0;
let tiempoRestante = 0;
let intervaloTiempo;

// REFERENCIAS AL HTML
const authScreen = document.getElementById('auth-screen');
const setupScreen = document.getElementById('setup-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const btnLogout = document.getElementById('btn-logout');

// --- LÓGICA DE AUTENTICACIÓN ---

// Verificar estado del usuario (Si ya entró o no)
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuario logueado: Mostramos el menú del examen
        authScreen.classList.add('hidden');
        setupScreen.classList.remove('hidden');
        btnLogout.classList.remove('hidden');
        document.getElementById('user-display').innerText = user.email;
    } else {
        // Nadie logueado: Mostramos pantalla de login
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
        .catch((error) => alert("Error al entrar: " + error.message));
});

// Botón Registro
document.getElementById('btn-register').addEventListener('click', () => {
    const email = document.getElementById('email-input').value;
    const pass = document.getElementById('pass-input').value;
    createUserWithEmailAndPassword(auth, email, pass)
        .then(() => alert("¡Cuenta creada! Ya estás dentro."))
        .catch((error) => alert("Error al registrar: " + error.message));
});

// Botón Google
document.getElementById('btn-google').addEventListener('click', () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch((error) => console.error(error));
});

// Botón Cerrar Sesión
btnLogout.addEventListener('click', () => {
    signOut(auth);
    location.reload();
});

// --- LÓGICA DEL EXAMEN ---

document.getElementById('btn-start').addEventListener('click', () => {
    const tiempo = document.getElementById('time-select').value;
    
    // Configurar tiempo
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
    const contenedorOpciones = document.getElementById('options-container');
    contenedorOpciones.innerHTML = '';

    data.opciones.forEach((opcion, index) => {
        const btn = document.createElement('button');
        btn.innerText = opcion;
        btn.onclick = () => verificarRespuesta(index, btn);
        contenedorOpciones.appendChild(btn);
    });

    document.getElementById('progress-display').innerText = `Pregunta ${indiceActual + 1} de ${preguntas.length}`;
}

function verificarRespuesta(indiceSeleccionado, btn) {
    const correcta = preguntas[indiceActual].respuesta;
    const botones = document.getElementById('options-container').querySelectorAll('button');

    // Bloquear botones para no responder dos veces
    botones.forEach(b => b.disabled = true);

    if (indiceSeleccionado === correcta) {
        btn.classList.add('correct');
        puntaje++;
    } else {
        btn.classList.add('incorrect');
        // Mostrar cuál era la correcta
        botones[correcta].classList.add('correct');
    }

    // Pasar a la siguiente pregunta automáticamente en 1.5 segundos
    setTimeout(() => {
        indiceActual++;
        cargarPregunta();
    }, 1500);
}

function iniciarReloj() {
    intervaloTiempo = setInterval(() => {
        tiempoRestante--;
        let minutos = Math.floor(tiempoRestante / 60);
        let segundos = tiempoRestante % 60;
        document.getElementById('timer-display').innerText = `${minutos}:${segundos < 10 ? '0' : ''}${segundos}`;

        if (tiempoRestante <= 0) {
            clearInterval(intervaloTiempo);
            terminarQuiz();
        }
    }, 1000);
}

function terminarQuiz() {
    clearInterval(intervaloTiempo);
    quizScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    document.getElementById('score-final').innerText = `${puntaje} / ${preguntas.length}`;
}
