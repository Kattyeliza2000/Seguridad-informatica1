import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, query, orderBy, limit, updateDoc, getDocs, arrayUnion, onSnapshot, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { bancoPreguntas } from './preguntas.js'; 

// --- CONFIGURACIÓN ---
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

const correosDosDispositivos = ["dpachecog2@unemi.edu.ec", "htigrer@unemi.edu.ec", "sgavilanezp2@unemi.edu.ec", "jzamoram9@unemi.edu.ec", "fcarrillop@unemi.edu.ec", "naguilarb@unemi.edu.ec", "kholguinb2@unemi.edu.ec"];
const correosUnDispositivo = [
    "cnavarretem4@unemi.edu.ec", "iastudillol@unemi.edu.ec", "gorellanas2@unemi.edu.ec", "ehidalgoc4@unemi.edu.ec", "lbrionesg3@unemi.edu.ec", 
    "xsalvadorv@unemi.edu.ec", "nbravop4@unemi.edu.ec", "jmoreirap6@unemi.edu.ec", "jcastrof8@unemi.edu.ec", "jcaleroc3@unemi.edu.ec"
];
const correosPermitidos = [...correosDosDispositivos, ...correosUnDispositivo];

// --- VARIABLES ---
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
let tempBattleID = null; 
let unsubscribeRoom = null; 
let currentSalaId = null; 
let jugadoresEnSalaAlFinal = []; 
let ghostHostTimer = null; 

const AVATAR_CONFIG = [
    { seed: 'Katty', style: 'avataaars', bg: 'e8d1ff' }, { seed: 'Ana', style: 'avataaars', bg: 'ffd5dc' }, { seed: 'Sofia', style: 'avataaars', bg: 'b6e3f4' }, 
    { seed: 'Laura', style: 'lorelei', bg: 'c0aede' }, { seed: 'Maya', style: 'lorelei', bg: 'f7c9e5' }, { seed: 'Zoe', style: 'avataaars', bg: 'd1d4f9' }, 
    { seed: 'Mia', style: 'lorelei', bg: 'ffdfbf' }, { seed: 'Felix', style: 'avataaars', bg: 'a0d6b3' }, { seed: 'Aneka', style: 'avataaars', bg: 'c7d0f8' }, 
    { seed: 'John', style: 'avataaars', bg: 'ffc5a1' }, { seed: 'Buster', style: 'lorelei', bg: 'a6c0ff' }, { seed: 'Chester', style: 'avataaars', bg: 'f9d3b4' }, 
    { seed: 'Bandit', style: 'lorelei', bg: 'ffdfbf' }, { seed: 'Chris', style: 'avataaars', bg: 'a1eafb' }
];

const ROOM_ICONS = { "SALA_FIREWALL": "fa-fire", "SALA_ENCRIPTADO": "fa-lock", "SALA_ZERO_DAY": "fa-bug", "SALA_PHISHING": "fa-fish", "SALA_RANSOMWARE": "fa-skull-crossbones", "SALA_BOTNET": "fa-robot" };

// REFERENCIAS HTML
const authScreen = document.getElementById('auth-screen');
const setupScreen = document.getElementById('setup-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const reviewScreen = document.getElementById('review-screen');
const btnLogout = document.getElementById('btn-logout');
const btnNextQuestion = document.getElementById('btn-next-question');
const btnQuitQuiz = document.getElementById('btn-quit-quiz');
const modeSelect = document.getElementById('mode-select');

function showScreen(screenId) {
    document.querySelectorAll('.container').forEach(el => el.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
}

function playClick() {
    const sfx = document.getElementById('click-sound');
    if(sfx) { 
        sfx.volume = parseFloat(document.getElementById('volume-slider').value) || 0.5;
        sfx.currentTime = 0; 
        sfx.play().catch(()=>{}); 
    }
}

function generarHuellaDigital() {
    const nav = window.navigator;
    const screen = window.screen;
    const rawString = `${nav.userAgent}||${nav.language}||${screen.colorDepth}||${screen.width}x${screen.height}||${new Date().getTimezoneOffset()}`;
    let hash = 0;
    for (let i = 0; i < rawString.length; i++) {
        const char = rawString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; 
    }
    return "DEV_" + Math.abs(hash).toString(36);
}

function obtenerDeviceId() {
    let deviceId = localStorage.getItem('device_id_seguro');
    if (!deviceId) {
        deviceId = generarHuellaDigital(); 
        localStorage.setItem('device_id_seguro', deviceId);
    }
    return deviceId;
}

function hablar(texto) {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = 'es-ES';
    u.volume = parseFloat(document.getElementById('volume-slider').value) || 0.5;
    synth.speak(u);
}

function generarIDTemporal() { return 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9); }

// --- DB FUNCTIONS ---
async function guardarProgresoEstudio() {
    if (!uidJugadorPermanente || currentMode !== 'study') return;
    try {
        await setDoc(doc(db, "progreso_estudio", uidJugadorPermanente), {
            uid: uidJugadorPermanente,
            indiceActual: indiceActual,
            respuestasUsuario: respuestasUsuario,
            indicesPreguntas: preguntasExamen.map(p => bancoPreguntas.indexOf(p)),
            fecha: new Date()
        });
    } catch (e) { console.error(e); }
}

async function borrarProgresoEstudio() {
    if (!uidJugadorPermanente) return;
    try { await deleteDoc(doc(db, "progreso_estudio", uidJugadorPermanente)); } catch (e) {}
}

async function verificarProgresoEstudio() {
    if (!uidJugadorPermanente) return null;
    const s = await getDoc(doc(db, "progreso_estudio", uidJugadorPermanente));
    return s.exists() ? s.data() : null;
}

// --- PERMISOS ---
async function verificarPermisoDeAcceso(email) {
    if (correosDosDispositivos.includes(email)) return { permitido: true, limite: 2 };
    if (correosUnDispositivo.includes(email)) return { permitido: true, limite: 1 };
    try {
        const docRef = doc(db, "usuarios_autorizados", email);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) return { permitido: true, limite: docSnap.data().limiteDispositivos || 1 };
    } catch (e) {}
    return { permitido: false, limite: 0 };
}

async function validarDispositivo(user, limit) {
    currentUserEmail = user.email.toLowerCase(); // Asegurar minúsculas
    uidJugadorPermanente = user.uid;
    const miDeviceId = obtenerDeviceId(); 
    
    // === PASE VIP REAL: Nunca bloquea a kholguinb2 ===
    if (currentUserEmail === 'kholguinb2@unemi.edu.ec') return true;

    const ref = doc(db, "usuarios_seguros", currentUserEmail);
    const snap = await getDoc(ref);
    
    if (snap.exists()) {
        let devs = snap.data().dispositivos || [];
        if (devs.includes(miDeviceId)) return true;
        
        if (devs.length >= limit) {
            alert(`⛔ ACCESO DENEGADO ⛔\n\nTu cuenta ya está activa en ${limit} dispositivo(s).\nContacta al administrador.`);
            await signOut(auth);
            location.reload();
            return false;
        } else {
            await setDoc(ref, { dispositivos: [...devs, miDeviceId] }, { merge: true });
            return true;
        }
    } else {
        await setDoc(ref, { dispositivos: [miDeviceId], fecha: new Date().toISOString() });
        return true;
    }
}

// --- LOGIN ---
onAuthStateChanged(auth, async (user) => {
    document.getElementById('app-loader').classList.add('hidden');
    if (user) {
        const emailLower = user.email.toLowerCase();
        const acceso = await verificarPermisoDeAcceso(emailLower);
        
        if (acceso.permitido || emailLower === 'kholguinb2@unemi.edu.ec') {
            
            // ADMIN BUTTON
            if (emailLower === 'kholguinb2@unemi.edu.ec') {
                const btnAdmin = document.getElementById('btn-admin-settings');
                if(btnAdmin) {
                    btnAdmin.classList.remove('hidden');
                    btnAdmin.onclick = () => {
                        document.getElementById('admin-modal').classList.remove('hidden');
                        cargarUsuariosAutorizados();
                    };
                }
            }

            uidJugadorPermanente = user.uid;
            currentUserEmail = emailLower;
            const valid = await validarDispositivo(user, acceso.limite);
            
            if (valid) {
                showScreen('setup-screen');
                document.getElementById('user-display').innerText = user.displayName;
                if (user.photoURL) {
                    document.getElementById('user-google-photo').src = user.photoURL;
                    document.getElementById('user-google-photo').classList.remove('hidden');
                }
                document.getElementById('header-user-info').classList.add('hidden');
                
                // ASEGURAR QUE EL BOTÓN SALIR ES VISIBLE AL ENTRAR
                btnLogout.classList.remove('hidden');
                
                setTimeout(() => hablar(`Hola ${user.displayName.split(' ')[0]}`), 500);
            }
        } else {
            alert("Correo no autorizado"); signOut(auth);
        }
    } else {
        showScreen('auth-screen');
        document.getElementById('header-user-info').classList.add('hidden');
    }
});

// --- ADMIN LOGIC ---
async function cargarUsuariosAutorizados() {
    const container = document.getElementById('admin-users-list');
    if(!container) return;
    container.innerHTML = '<p style="padding:10px;">Cargando...</p>';
    try {
        const q = query(collection(db, "usuarios_autorizados"));
        const snap = await getDocs(q);
        container.innerHTML = '';
        if (snap.empty) container.innerHTML = '<p style="padding:10px;color:#777;">Vacio.</p>';
        snap.forEach((doc) => {
            const d = doc.data();
            const div = document.createElement('div');
            div.className = 'user-item-row';
            div.innerHTML = `<div><span class="user-email">${d.email}</span> <span class="user-limit">${d.limiteDispositivos} Disp.</span></div><button class="btn-delete-user" onclick="eliminarUsuarioAutorizado('${doc.id}')"><i class="fa-solid fa-trash"></i></button>`;
            container.appendChild(div);
        });
    } catch(e) { container.innerHTML = 'Error.'; }
}

window.eliminarUsuarioAutorizado = async function(email) {
    if(confirm(`Eliminar ${email}?`)) {
        await deleteDoc(doc(db, "usuarios_autorizados", email));
        await deleteDoc(doc(db, "usuarios_seguros", email));
        cargarUsuariosAutorizados();
    }
};

document.getElementById('close-admin').onclick = () => document.getElementById('admin-modal').classList.add('hidden');
document.getElementById('btn-admin-clean-rooms').onclick = async () => {
    if(confirm("¿Limpiar TODO?")) {
        const s = await getDocs(collection(db, "salas_activas"));
        s.forEach(async (d) => await deleteDoc(d.ref));
        alert("Limpieza completa.");
    }
};
document.getElementById('btn-admin-reset-user').onclick = async () => {
    const e = document.getElementById('admin-reset-email').value.trim();
    if(e) { await deleteDoc(doc(db, "usuarios_seguros", e)); alert("Desbloqueado."); }
};
document.getElementById('btn-admin-add-user').onclick = async () => {
    const e = document.getElementById('admin-new-email').value.trim();
    let l = 1;
    document.getElementsByName('device-limit').forEach(r => { if(r.checked) l = parseInt(r.value); });
    if(e) {
        await setDoc(doc(db, "usuarios_autorizados", e), { email: e, limiteDispositivos: l });
        cargarUsuariosAutorizados();
        alert("Guardado.");
    }
};

// --- BOTONES GENERALES ---
document.getElementById('btn-google').onclick = () => signInWithPopup(auth, new GoogleAuthProvider());
btnLogout.onclick = async () => {
    if(confirm("¿Cerrar sesión?")) {
        if(currentSalaId) await limpiarSala(currentSalaId);
        await signOut(auth);
        location.reload();
    }
};

// --- JUEGO START ---
document.getElementById('btn-start').onclick = () => {
    currentMode = modeSelect.value; // FIX: Capturar modo actual
    
    document.getElementById('header-user-info').classList.remove('hidden');
    const usr = document.getElementById('user-display').innerText;
    document.getElementById('header-username').innerText = usr.split(' ')[0];
    document.getElementById('header-photo').src = document.getElementById('user-google-photo').src;

    if(currentMode === 'multiplayer') {
        if(document.getElementById('alias-input').value.length < 3) { hablar("Falta alias"); return; }
        currentAlias = document.getElementById('alias-input').value;
        iniciarBatalla();
    } else {
        hablar("Iniciando.");
        iniciarJuegoReal();
    }
    const bg = document.getElementById('bg-music');
    if(bg) { bg.volume=0.4; bg.play().catch(()=>{}); }
};

modeSelect.onchange = () => {
    const isMulti = modeSelect.value === 'multiplayer';
    document.getElementById('alias-input-group').classList.toggle('hidden', !isMulti);
    document.getElementById('btn-start').innerText = isMulti ? '⚔️ Unirse a Batalla' : 'Empezar';
};

// --- LÓGICA DE PREGUNTAS Y AVANCE (SOLUCIÓN AL BOTÓN SIGUIENTE) ---
function cargarPregunta() {
    seleccionTemporal = null;
    btnNextQuestion.classList.add('hidden');
    
    // ASEGURAR VISIBILIDAD DE BOTÓN RENDIRSE
    if (currentMode === 'study') btnQuitQuiz.classList.add('hidden');
    else btnQuitQuiz.classList.remove('hidden');

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
    btnNextQuestion.innerHTML = (indiceActual === preguntasExamen.length - 1) ? 'Finalizar <i class="fa-solid fa-check"></i>' : 'Siguiente <i class="fa-solid fa-arrow-right"></i>';
}

function seleccionarOpcion(index, btnClickeado) {
    const isStudy = currentMode === 'study';
    const isMulti = currentMode === 'multiplayer';
    
    if ((isStudy || isMulti) && seleccionTemporal !== null) return;

    seleccionTemporal = index;
    const buttons = document.getElementById('options-container').querySelectorAll('button');
    buttons.forEach(b => b.classList.remove('option-selected'));
    btnClickeado.classList.add('option-selected');

    if (isStudy || isMulti) {
        mostrarResultadoInmediato(index);
        if (isStudy) setTimeout(() => { guardarProgresoEstudio(); }, 500);
        if (isMulti && index === preguntasExamen[indiceActual].respuesta) currentStreak++;
    } 
    btnNextQuestion.classList.remove('hidden');
}

function mostrarResultadoInmediato(seleccionada) {
    const correcta = preguntasExamen[indiceActual].respuesta;
    const buttons = document.getElementById('options-container').querySelectorAll('button');
    const combo = document.getElementById('combo-display');

    if (seleccionada === correcta) {
        document.getElementById('correct-sound').play().catch(()=>{});
        if(currentMode === 'multiplayer' && currentStreak > 1) {
            combo.innerText = `¡RACHA x${currentStreak}! 🔥`;
            combo.classList.remove('hidden');
            combo.style.animation = 'none';
            combo.offsetHeight; 
            combo.style.animation = 'popIn 0.5s';
        }
    } else {
        document.getElementById('fail-sound').play().catch(()=>{});
        currentStreak = 0;
        combo.classList.add('hidden');
    }

    buttons.forEach((btn, idx) => {
        btn.disabled = true;
        if (idx === correcta) btn.classList.add('ans-correct');
        else if (idx === seleccionada) btn.classList.add('ans-wrong');
    });
    
    const div = document.createElement('div');
    div.className = 'explanation-feedback';
    div.innerHTML = `<strong>Explicación:</strong> ${preguntasExamen[indiceActual].explicacion}`;
    document.getElementById('options-container').appendChild(div);
    
    respuestasUsuario.push(seleccionada);
}

// === EVENTO CLAVE DEL BOTÓN SIGUIENTE (CORREGIDO) ===
btnNextQuestion.onclick = () => {
    const isStudy = currentMode === 'study';
    const isMulti = currentMode === 'multiplayer';
    
    // En Estudio/Multi ya se guardó al hacer clic, solo avanzamos
    if (isStudy || isMulti) {
        indiceActual++;
        cargarPregunta();
        if(isStudy) guardarProgresoEstudio();
    } 
    // En Examen, guardamos ahora la selección y avanzamos
    else if (seleccionTemporal !== null) {
        respuestasUsuario.push(seleccionTemporal);
        indiceActual++;
        cargarPregunta();
    }
};

// --- RESTO DE LÓGICA DE INICIO ---
async function iniciarJuegoReal() {
    const tiempo = document.getElementById('time-select').value;
    if (tiempo !== 'infinity') {
        tiempoRestante = parseInt(tiempo) * 60;
        iniciarReloj();
    } else document.getElementById('timer-display').innerText = "--:--";

    if (currentMode === 'study') {
        const p = await verificarProgresoEstudio();
        if (p) {
            const modal = document.getElementById('resume-modal');
            document.getElementById('resume-text').innerHTML = `Pregunta ${p.indiceActual + 1} de ${p.indicesPreguntas.length}.<br>¿Continuar?`;
            modal.classList.remove('hidden');
            document.getElementById('btn-resume-yes').onclick = () => {
                playClick(); modal.classList.add('hidden');
                preguntasExamen = p.indicesPreguntas.map(i => bancoPreguntas[i]);
                respuestasUsuario = p.respuestasUsuario || [];
                indiceActual = p.indiceActual;
                showScreen('quiz-screen'); cargarPregunta();
            };
            document.getElementById('btn-resume-no').onclick = async () => {
                playClick(); modal.classList.add('hidden');
                await borrarProgresoEstudio();
                empezarNuevoJuego();
            };
            return;
        }
    }
    empezarNuevoJuego();
}

function empezarNuevoJuego() {
    if (currentMode === 'study') preguntasExamen = [...bancoPreguntas].sort(() => 0.5 - Math.random());
    else preguntasExamen = [...bancoPreguntas].sort(() => 0.5 - Math.random()).slice(0, 20);
    
    respuestasUsuario = [];
    indiceActual = 0;
    showScreen('quiz-screen');
    cargarPregunta();
}

// --- TERMINAR ---
async function terminarQuiz(abandono = false) {
    clearInterval(intervaloTiempo);
    const btnReview = document.getElementById('btn-review');
    const btnInicio = document.getElementById('btn-inicio-final');
    if(btnReview) btnReview.disabled = true;
    if(btnInicio) btnInicio.disabled = true;

    if(currentMode === 'study' && !abandono) await borrarProgresoEstudio();

    let aciertos = 0;
    respuestasUsuario.forEach((r, i) => { if(r === preguntasExamen[i].respuesta) aciertos++; });
    
    showScreen('result-screen');
    document.getElementById('score-final').innerText = `${aciertos} / ${preguntasExamen.length}`;
    const msg = document.getElementById('custom-msg');
    
    if (currentMode === 'multiplayer' && currentSalaId) {
        // ... Lógica multiplayer (simplificada aquí, usa la completa si la necesitas) ...
        // Asegura desbloqueo de botones al terminar
        setTimeout(() => { 
             btnReview.disabled = false; 
             btnInicio.disabled = false; 
        }, 2000); 
    } else {
        if(aciertos === preguntasExamen.length) msg.innerText = "¡Perfecto!";
        else msg.innerText = "Finalizado.";
        btnReview.disabled = false;
        btnInicio.disabled = false;
        document.getElementById('room-results-box').classList.add('hidden');
        document.getElementById('final-avatar-display').classList.add('hidden');
        // Mostrar botón revisar si NO es estudio
        if(currentMode !== 'study') btnReview.classList.remove('hidden');
        else btnReview.classList.add('hidden');
    }
}

// --- EXTRAS ---
function iniciarReloj() {
    intervaloTiempo = setInterval(() => {
        tiempoRestante--;
        let m = Math.floor(tiempoRestante / 60), s = tiempoRestante % 60;
        document.getElementById('timer-display').innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
        if (tiempoRestante <= 0) { clearInterval(intervaloTiempo); terminarQuiz(); }
    }, 1000);
}

document.getElementById('volume-slider').addEventListener('input', (e) => {
    document.querySelectorAll('audio').forEach(a => a.volume = e.target.value);
});

// --- AVATARES Y SALAS (Se mantienen igual que antes, asegurando imports) ---
document.getElementById('btn-confirm-identity').onclick = () => mostrarSelectorSalas();
document.getElementById('back-to-setup').onclick = () => showScreen('setup-screen');
document.getElementById('back-to-avatar').onclick = () => showScreen('avatar-screen');
