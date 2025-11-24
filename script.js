import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// --- CONFIGURACIÓN REAL (PROYECTO: autenticacion-8faac) ---
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

// --- LISTA DE CORREOS AUTORIZADOS ---
const correosPermitidos = [
    "dpachecog2@unemi.edu.ec", "cnavarretem4@unemi.edu.ec", "htigrer@unemi.edu.ec", 
    "gorellanas2@unemi.edu.ec", "iastudillol@unemi.edu.ec", "sgavilanezp2@unemi.edu.ec", 
    "jzamoram9@unemi.edu.ec", "fcarrillop@unemi.edu.ec", "naguilarb@unemi.edu.ec", 
    "ehidalgoc4@unemi.edu.ec", "lbrionesg3@unemi.edu.ec", "xsalvadorv@unemi.edu.ec", 
    "nbravop4@unemi.edu.ec", "jmoreirap6@unemi.edu.ec", "kholguinb2@unemi.edu.ec",
    "ky211209@gmail.com", "ky2112h@gmail.com"
];

// --- PREGUNTAS ---
const preguntas = [
    { texto: "¿Qué categoría de activo abarca servidores, routers y estaciones de trabajo?", opciones: ["Data", "Lines & Networks", "Hardware", "Software"], respuesta: 2, explicacion: "El Hardware comprende componentes físicos como servidores y routers." },
    { texto: "Una amenaza ambiental típica para un centro de datos sería:", opciones: ["Huracán", "Robo de servidores", "Virus informático", "Pérdida de energía"], respuesta: 0, explicacion: "Los desastres naturales como huracanes son amenazas ambientales físicas." },
    { texto: "¿Qué nivel de riesgo requiere medidas inmediatas según la tabla de niveles?", opciones: ["Alto/Extremo", "Bajo", "Negligible", "Medio"], respuesta: 0, explicacion: "El riesgo Alto/Extremo es crítico y requiere acción inmediata." },
    { texto: "El estándar OWASP ASVS se utiliza para:", opciones: ["Generar certificados SSL", "Probar hardware", "Cifrado TLS", "Verificar controles de seguridad en aplicaciones"], respuesta: 3, explicacion: "OWASP ASVS es un estándar para verificar la seguridad técnica en aplicaciones." }
];

let indiceActual = 0;
let respuestasUsuario = []; 
let seleccionTemporal = null; 
let tiempoRestante = 0;
let intervaloTiempo;

// REFERENCIAS HTML
const authScreen = document.getElementById('auth-screen');
const setupScreen = document.getElementById('setup-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const reviewScreen = document.getElementById('review-screen');
const btnLogout = document.getElementById('btn-logout');
const btnNextQuestion = document.getElementById('btn-next-question');

// --- SEGURIDAD DISPOSITIVOS ---
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
    const miDeviceId = obtenerDeviceId(); 
    const docRef = doc(db, "usuarios_seguros", email);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const datos = docSnap.data();
        let listaDispositivos = datos.dispositivos || []; 
        if (listaDispositivos.includes(miDeviceId)) return true; 
        else {
            if (listaDispositivos.length < 2) {
                listaDispositivos.push(miDeviceId);
                await setDoc(docRef, { dispositivos: listaDispositivos }, { merge: true });
                return true;
            } else {
                alert(`⛔ ACCESO DENEGADO ⛔\n\nYa tienes 2 dispositivos registrados.\nNo puedes usar un tercer equipo.`);
                await signOut(auth);
                location.reload();
                return false;
            }
        }
    } else {
        await setDoc(docRef, { dispositivos: [miDeviceId], fecha_registro: new Date().toISOString() });
        return true;
    }
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        if (correosPermitidos.includes(user.email)) {
            const titulo = document.querySelector('h2');
            if(titulo) titulo.innerText = "Verificando..."; 
            const valido = await validarDispositivo(user);
            if (valido) {
                authScreen.classList.add('hidden');
                setupScreen.classList.remove('hidden');
                btnLogout.classList.remove('hidden');
                document.getElementById('user-display').innerText = user.email;
                if(titulo) titulo.innerText = "Bienvenido";
            }
        } else {
            alert("Tu correo no está autorizado.");
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

// --- EVENTOS (SOLO GOOGLE) ---
document.getElementById('btn-google').addEventListener('click', () => {
    signInWithPopup(auth, new GoogleAuthProvider()).catch(e => alert("Error Google."));
});

btnLogout.addEventListener('click', () => { signOut(auth); location.reload(); });

// --- LÓGICA EXAMEN ---
document.getElementById('btn-start').addEventListener('click', () => {
    const tiempo = document.getElementById('time-select').value;
    if (tiempo !== 'infinity') { tiempoRestante = parseInt(tiempo) * 60; iniciarReloj(); } 
    else { document.getElementById('timer-display').innerText = "--:--"; }
    
    respuestasUsuario = []; 
    indiceActual = 0;
    setupScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');
    cargarPregunta();
});

function cargarPregunta() {
    seleccionTemporal = null; 
    btnNextQuestion.classList.add('hidden'); 

    if (indiceActual >= preguntas.length) { terminarQuiz(); return; }
    
    const data = preguntas[indiceActual];
    document.getElementById('question-text').innerText = `${indiceActual + 1}. ${data.texto}`;
    const cont = document.getElementById('options-container'); cont.innerHTML = '';
    
    data.opciones.forEach((opcion, index) => {
        const btn = document.createElement('button');
        btn.innerText = opcion;
        btn.onclick = () => seleccionarOpcion(index, btn); 
        cont.appendChild(btn);
    });
    document.getElementById('progress-display').innerText = `Pregunta ${indiceActual + 1} de ${preguntas.length}`;

    if(indiceActual === preguntas.length - 1) {
        btnNextQuestion.innerHTML = 'Finalizar <i class="fa-solid fa-check"></i>';
    } else {
        btnNextQuestion.innerHTML = 'Siguiente <i class="fa-solid fa-arrow-right"></i>';
    }
}

function seleccionarOpcion(index, btnClickeado) {
    seleccionTemporal = index;
    const botones = document.getElementById('options-container').querySelectorAll('button');
    botones.forEach(b => b.classList.remove('option-selected'));
    btnClickeado.classList.add('option-selected');
    btnNextQuestion.classList.remove('hidden');
}

btnNextQuestion.addEventListener('click', () => {
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
    preguntas.forEach((p, i) => { if (respuestasUsuario[i] === p.respuesta) aciertos++; });
    quizScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    document.getElementById('score-final').innerText = `${aciertos} / ${preguntas.length}`;
}

// --- REVISIÓN ---
document.getElementById('btn-review').addEventListener('click', () => {
    resultScreen.classList.add('hidden');
    reviewScreen.classList.remove('hidden');
    const cont = document.getElementById('review-container'); cont.innerHTML = '';
    preguntas.forEach((p, i) => {
        const dada = respuestasUsuario[i];
        const ok = (dada === p.respuesta);
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
