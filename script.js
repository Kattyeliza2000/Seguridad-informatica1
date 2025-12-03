import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, query, orderBy, limit, updateDoc, getDocs, arrayUnion, onSnapshot, deleteDoc, arrayRemove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { bancoPreguntas } from './preguntas.js'; 

// --- CONFIGURACIÓN FIREBASE ---
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

// --- LISTAS DE CORREOS Y PERMISOS ---
const correosDosDispositivos = ["dpachecog2@unemi.edu.ec", "htigrer@unemi.edu.ec", "sgavilanezp2@unemi.edu.ec", "jzamoram9@unemi.edu.ec", "fcarrillop@unemi.edu.ec", "naguilarb@unemi.edu.ec", "kholguinb2@unemi.edu.ec"];
const correosUnDispositivo = [
    "cnavarretem4@unemi.edu.ec", "iastudillol@unemi.edu.ec", "gorellanas2@unemi.edu.ec", "ehidalgoc4@unemi.edu.ec", "lbrionesg3@unemi.edu.ec", 
    "xsalvadorv@unemi.edu.ec", "nbravop4@unemi.edu.ec", "jmoreirap6@unemi.edu.ec", "jcastrof8@unemi.edu.ec", "jcaleroc3@unemi.edu.ec"
];
const correosPermitidos = [...correosDosDispositivos, ...correosUnDispositivo];

// --- VARIABLES GLOBALES ---
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
let ghostHostTimer = null; 
let isHost = false;
let playersInRoom = [];
let myPlayerId = null;
let hasLoadedAvatars = false;

// --- CONSTANTES DE JUEGO ---
const SUPER_ADMIN_EMAIL = "kholguinb2@unemi.edu.ec";
const AVATAR_CONFIG = [
    { seed: 'Katty', style: 'avataaars', bg: 'e8d1ff' }, { seed: 'Ana', style: 'avataaars', bg: 'ffd5dc' }, { seed: 'Sofia', style: 'avataaars', bg: 'b6e3f4' }, 
    { seed: 'Laura', style: 'lorelei', bg: 'c0aede' }, { seed: 'Maya', style: 'lorelei', bg: 'f7c9e5' }, { seed: 'Zoe', style: 'avataaars', bg: 'd1d4f9' }, 
    { seed: 'Mia', style: 'lorelei', bg: 'ffdfbf' }, { seed: 'Felix', style: 'avataaars', bg: 'a0d6b3' }, { seed: 'Aneka', style: 'avataaars', bg: 'c7d0f8' }, 
    { seed: 'John', style: 'avataaars', bg: 'ffc5a1' }, { seed: 'Buster', style: 'lorelei', bg: 'a6c0ff' }, { seed: 'Chester', style: 'avataaars', bg: 'f9d3b4' }, 
    { seed: 'Bandit', style: 'lorelei', bg: 'ffdfbf' }, { seed: 'Chris', style: 'avataaars', bg: 'a1eafb' }
];

const ROOM_ICONS = { 
    "SALA_FIREWALL": "fa-fire", 
    "SALA_ENCRIPTADO": "fa-lock", 
    "SALA_ZERO_DAY": "fa-bug", 
    "SALA_PHISHING": "fa-fish", 
    "SALA_RANSOMWARE": "fa-skull-crossbones", 
    "SALA_BOTNET": "fa-robot" 
};

// --- REFERENCIAS DOM ---
const authScreen = document.getElementById('auth-screen');
const setupScreen = document.getElementById('setup-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const reviewScreen = document.getElementById('review-screen');
const btnLogout = document.getElementById('btn-logout');
const btnNextQuestion = document.getElementById('btn-next-question');
const btnQuitQuiz = document.getElementById('btn-quit-quiz');
const btnExitQuiz = document.getElementById('btn-exit-quiz');
const modeSelect = document.getElementById('mode-select');
const volumeSlider = document.getElementById('volume-slider');

function showScreen(screenId) {
    document.querySelectorAll('.container').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(screenId);
    if(target) target.classList.remove('hidden');
}

// === AUDIO Y VOLUMEN ===
function obtenerVolumen() {
    return volumeSlider ? parseFloat(volumeSlider.value) : 0.5;
}

function actualizarVolumen() {
    const vol = obtenerVolumen();
    document.querySelectorAll('audio').forEach(a => {
        a.volume = vol;
        a.muted = (vol <= 0);
    });
    const icon = document.getElementById('btn-mute');
    if(icon) icon.className = 'fa-solid ' + (vol <= 0 ? 'fa-volume-xmark' : (vol < 0.5 ? 'fa-volume-low' : 'fa-volume-high'));
}

if(volumeSlider) {
    volumeSlider.addEventListener('input', actualizarVolumen);
    setTimeout(actualizarVolumen, 500);
}

document.getElementById('btn-mute').addEventListener('click', () => {
    if (obtenerVolumen() > 0) {
        volumeSlider.dataset.lastVolume = volumeSlider.value; 
        volumeSlider.value = 0;
    } else {
        volumeSlider.value = volumeSlider.dataset.lastVolume || 0.5; 
    }
    actualizarVolumen();
});

function playClick() {
    const sfx = document.getElementById('click-sound');
    if(sfx) { 
        sfx.volume = obtenerVolumen();
        sfx.currentTime = 0; 
        sfx.play().catch(()=>{}); 
    }
}

function hablar(texto) {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = 'es-ES';
    u.volume = obtenerVolumen(); 
    synth.speak(u);
}

// === SEGURIDAD Y DISPOSITIVOS ===
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

function generarIDTemporal() { 
    return 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9); 
}

// --- FUNCIONES DB ESTUDIO ---
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

// --- VERIFICACIÓN DE PERMISOS ---
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
    currentUserEmail = user.email.toLowerCase(); 
    uidJugadorPermanente = user.uid;
    const miDeviceId = obtenerDeviceId(); 
    
    // SUPER ADMIN - ACCESO ILIMITADO
    if (currentUserEmail === SUPER_ADMIN_EMAIL) {
        const ref = doc(db, "usuarios_seguros", currentUserEmail);
        const snap = await getDoc(ref);
        
        if (snap.exists()) {
            let devs = snap.data().dispositivos || [];
            if (!devs.includes(miDeviceId)) {
                await setDoc(ref, { 
                    dispositivos: [...devs, miDeviceId],
                    superAdmin: true,
                    ultimoAcceso: new Date().toISOString()
                }, { merge: true });
            }
        } else {
            await setDoc(ref, { 
                dispositivos: [miDeviceId], 
                superAdmin: true,
                fecha: new Date().toISOString(),
                ultimoAcceso: new Date().toISOString()
            });
        }
        return true;
    }
    
    // USUARIOS NORMALES
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
            await setDoc(ref, { 
                dispositivos: [...devs, miDeviceId],
                ultimoAcceso: new Date().toISOString()
            }, { merge: true });
            return true;
        }
    } else {
        await setDoc(ref, { 
            dispositivos: [miDeviceId], 
            fecha: new Date().toISOString(),
            ultimoAcceso: new Date().toISOString()
        });
        return true;
    }
}

// === LOGIN Y ESTADO DE AUTH ===
onAuthStateChanged(auth, async (user) => {
    document.getElementById('app-loader').classList.add('hidden');
    if (user) {
        const emailLower = user.email.toLowerCase();
        const acceso = await verificarPermisoDeAcceso(emailLower);
        
        if (acceso.permitido || emailLower === SUPER_ADMIN_EMAIL) {
            
            // MOSTRAR PANEL ADMIN SOLO PARA SUPER ADMIN
            if (emailLower === SUPER_ADMIN_EMAIL) {
                const btnAdmin = document.getElementById('btn-admin-settings');
                if(btnAdmin) {
                    btnAdmin.classList.remove('hidden');
                    btnAdmin.onclick = () => {
                        playClick();
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
                    
                    // MOSTRAR HEADER INMEDIATAMENTE
                    document.getElementById('header-user-info').classList.remove('hidden');
                    document.getElementById('header-username').innerText = user.displayName.split(' ')[0];
                    document.getElementById('header-photo').src = user.photoURL;
                }
                
                btnLogout.classList.remove('hidden');
                
                setTimeout(() => {
                    hablar(`Bienvenido ${user.displayName.split(' ')[0]}, elija la opción que necesite.`);
                    playClick();
                }, 500);
            }
        } else {
            alert("Correo no autorizado"); 
            await signOut(auth);
        }
    } else {
        showScreen('auth-screen');
        document.getElementById('header-user-info').classList.add('hidden');
    }
});

// --- LÓGICA DE ADMIN ---
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

document.getElementById('close-admin').onclick = () => {
    playClick();
    document.getElementById('admin-modal').classList.add('hidden');
};

document.getElementById('btn-admin-clean-rooms').onclick = async () => {
    if(confirm("¿Limpiar TODAS las salas?")) {
        const s = await getDocs(collection(db, "salas_activas"));
        s.forEach(async (d) => await deleteDoc(d.ref));
        alert("Limpieza completa.");
        document.getElementById('admin-modal').classList.add('hidden');
    }
};

document.getElementById('btn-admin-reset-user').onclick = async () => {
    const e = document.getElementById('admin-reset-email').value.trim();
    if(e) { 
        await deleteDoc(doc(db, "usuarios_seguros", e)); 
        alert("Usuario desbloqueado."); 
    }
};

document.getElementById('btn-admin-add-user').onclick = async () => {
    const e = document.getElementById('admin-new-email').value.trim().toLowerCase();
    let l = 1;
    document.getElementsByName('device-limit').forEach(r => { 
        if(r.checked) l = parseInt(r.value); 
    });
    
    if(e) {
        await setDoc(doc(db, "usuarios_autorizados", e), { 
            email: e, 
            limiteDispositivos: l,
            agregadoPor: currentUserEmail,
            fecha: new Date().toISOString()
        });
        cargarUsuariosAutorizados();
        alert("Usuario autorizado correctamente.");
    }
};

// --- EVENTOS DE INTERFAZ Y JUEGO ---
document.getElementById('btn-google').onclick = () => {
    playClick();
    signInWithPopup(auth, new GoogleAuthProvider());
};

btnLogout.onclick = async () => {
    if(confirm("¿Cerrar sesión?")) {
        playClick();
        if(currentSalaId) await limpiarSala(currentSalaId);
        await signOut(auth);
        location.reload();
    }
};

// BOTÓN PRINCIPAL START
document.getElementById('btn-start').onclick = () => {
    playClick();
    currentMode = modeSelect.value; 
    
    if(currentMode === 'multiplayer') {
        const aliasVal = document.getElementById('alias-input').value.trim();
        if(aliasVal.length < 3) { 
            hablar("Por favor, introduce un alias de al menos 3 caracteres."); 
            document.getElementById('alias-input').focus();
            return; 
        }
        currentAlias = aliasVal;
        hablar(`¡Excelente, ${currentAlias}! Elige tu avatar.`);
        iniciarBatalla(); 
    } else {
        // SONIDO ESPECÍFICO PARA EXAMEN INDIVIDUAL
        const examSound = document.getElementById('click-sound');
        if(examSound) {
            examSound.volume = obtenerVolumen();
            examSound.currentTime = 0;
            examSound.play().catch(()=>{});
        }
        
        hablar("Iniciando " + (currentMode === 'study' ? "modo estudio" : "examen individual"));
        iniciarJuegoReal();
    }
    
    const bg = document.getElementById('bg-music');
    if(bg) { 
        bg.volume = obtenerVolumen(); 
        bg.play().catch(()=>{}); 
    }
};

modeSelect.onchange = () => {
    playClick();
    const isMulti = modeSelect.value === 'multiplayer';
    document.getElementById('alias-input-group').classList.toggle('hidden', !isMulti);
    document.getElementById('btn-start').innerText = isMulti ? '⚔️ Unirse a Batalla' : 'Empezar';
};

// BOTÓN SALIR DEL QUIZ - SOLO EN EXAMEN Y ESTUDIO
if (btnExitQuiz) {
    btnExitQuiz.onclick = async () => {
        playClick();
        if(currentMode === 'study') {
            await guardarProgresoEstudio();
            showScreen('setup-screen');
        } else if(currentMode === 'individual') {
            if(confirm("¿Salir del examen? Perderás el progreso.")) {
                clearInterval(intervaloTiempo);
                showScreen('setup-screen');
            }
        }
        
        const bg = document.getElementById('bg-music');
        if(bg) { bg.pause(); bg.currentTime = 0; }
    };
}

// === LÓGICA DE PREGUNTAS ===
function cargarPregunta() {
    seleccionTemporal = null;
    btnNextQuestion.classList.add('hidden');
    
    // BOTONES SEGÚN MODO (REQUERIMIENTO ESPECÍFICO)
    if (currentMode === 'multiplayer') {
        btnQuitQuiz.classList.remove('hidden'); 
        if(btnExitQuiz) btnExitQuiz.classList.add('hidden');
    } else {
        // NO MOSTRAR "RENDIRSE" EN EXAMEN NI ESTUDIO
        btnQuitQuiz.classList.add('hidden'); 
        if(btnExitQuiz) btnExitQuiz.classList.remove('hidden'); 
    }

    if (indiceActual >= preguntasExamen.length) { 
        terminarQuiz(); 
        return; 
    }

    const data = preguntasExamen[indiceActual];
    document.getElementById('question-text').innerText = `${indiceActual + 1}. ${data.texto}`;
    const cont = document.getElementById('options-container'); 
    cont.innerHTML = '';

    data.opciones.forEach((opcion, index) => {
        const btn = document.createElement('button');
        btn.innerText = opcion;
        btn.onclick = () => seleccionarOpcion(index, btn);
        cont.appendChild(btn);
    });
    
    document.getElementById('progress-display').innerText = `Pregunta ${indiceActual + 1} de ${preguntasExamen.length}`;
    btnNextQuestion.innerHTML = (indiceActual === preguntasExamen.length - 1) ? 
        'Finalizar <i class="fa-solid fa-check"></i>' : 
        'Siguiente <i class="fa-solid fa-arrow-right"></i>';
}

function seleccionarOpcion(index, btnClickeado) {
    playClick(); // SONIDO AL DAR CLIC
    
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

    // SONIDOS DIFERENCIADOS POR MODO
    if (seleccionada === correcta) {
        if (currentMode === 'multiplayer') {
            // EN BATALLA: solo sonido de clic, no pista
            const clickSound = document.getElementById('click-sound');
            if(clickSound) {
                clickSound.currentTime = 0;
                clickSound.play().catch(()=>{});
            }
        } else {
            // EN ESTUDIO: sonido de correcto
            document.getElementById('correct-sound').play().catch(()=>{});
        }
        
        if(currentMode === 'multiplayer' && currentStreak > 1) {
            combo.innerText = `¡RACHA x${currentStreak}! 🔥`;
            combo.classList.remove('hidden');
            combo.style.animation = 'none';
            combo.offsetHeight; 
            combo.style.animation = 'popIn 0.5s';
        }
    } else {
        if (currentMode === 'multiplayer') {
            // EN BATALLA: solo sonido de clic
            const clickSound = document.getElementById('click-sound');
            if(clickSound) {
                clickSound.currentTime = 0;
                clickSound.play().catch(()=>{});
            }
        } else {
            // EN ESTUDIO: sonido de error
            document.getElementById('fail-sound').play().catch(()=>{});
        }
        currentStreak = 0;
        combo.classList.add('hidden');
    }

    buttons.forEach((btn, idx) => {
        btn.disabled = true;
        if (idx === correcta) btn.classList.add('ans-correct');
        else if (idx === seleccionada && seleccionada !== correcta) btn.classList.add('ans-wrong');
    });
    
    // SOLO MOSTRAR EXPLICACIÓN EN MODO ESTUDIO
    if (currentMode === 'study') {
        const div = document.createElement('div');
        div.className = 'explanation-feedback';
        div.innerHTML = `<strong>Explicación:</strong> ${preguntasExamen[indiceActual].explicacion}`;
        document.getElementById('options-container').appendChild(div);
    }
    
    respuestasUsuario.push(seleccionada);
}

btnNextQuestion.onclick = () => {
    playClick();
    const isStudy = currentMode === 'study';
    const isMulti = currentMode === 'multiplayer';
    
    if (isStudy || isMulti) {
        indiceActual++;
        cargarPregunta();
        if(isStudy) guardarProgresoEstudio();
    } 
    else if (seleccionTemporal !== null) {
        respuestasUsuario.push(seleccionTemporal);
        indiceActual++;
        cargarPregunta();
    }
};

// BOTÓN RENDIRSE - SOLO EN BATALLA
btnQuitQuiz.onclick = async () => {
    playClick();
    if(confirm("¿Rendirse de la batalla? Quedarás registrado en el podio hasta donde hayas avanzado.")) {
        await terminarQuiz(true);
    }
};

// === INICIO DEL JUEGO ===
async function iniciarJuegoReal() {
    const tiempo = document.getElementById('time-select').value;
    if (tiempo !== 'infinity') {
        tiempoRestante = parseInt(tiempo) * 60;
        iniciarReloj();
    } else {
        document.getElementById('timer-display').innerText = "--:--";
    }

    if (currentMode === 'study') {
        const p = await verificarProgresoEstudio();
        if (p) {
            const modal = document.getElementById('resume-modal');
            document.getElementById('resume-text').innerHTML = `Pregunta ${p.indiceActual + 1} de ${p.indicesPreguntas.length}.<br>¿Continuar donde lo dejaste?`;
            modal.classList.remove('hidden');
            
            document.getElementById('btn-resume-yes').onclick = () => {
                playClick(); 
                modal.classList.add('hidden');
                preguntasExamen = p.indicesPreguntas.map(i => bancoPreguntas[i]);
                respuestasUsuario = p.respuestasUsuario || [];
                indiceActual = p.indiceActual;
                hablar("Recuperando tu sesión.");
                showScreen('quiz-screen'); 
                cargarPregunta();
            };
            
            document.getElementById('btn-resume-no').onclick = async () => {
                playClick(); 
                modal.classList.add('hidden');
                await borrarProgresoEstudio();
                empezarNuevoJuego();
            };
            return;
        }
    }
    empezarNuevoJuego();
}

function empezarNuevoJuego() {
    if (currentMode === 'study') {
        // MODO ESTUDIO: todas las preguntas aleatorias
        preguntasExamen = [...bancoPreguntas].sort(() => 0.5 - Math.random());
    } else {
        // EXAMEN INDIVIDUAL: 20 preguntas aleatorias
        preguntasExamen = [...bancoPreguntas].sort(() => 0.5 - Math.random()).slice(0, 20);
    }
    
    respuestasUsuario = [];
    indiceActual = 0;
    currentStreak = 0;
    showScreen('quiz-screen');
    cargarPregunta();
}

// === FINALIZAR Y RESULTADOS ===
async function terminarQuiz(abandono = false) {
    clearInterval(intervaloTiempo);
    const btnReview = document.getElementById('btn-review');
    const btnInicio = document.getElementById('btn-inicio-final');
    
    // BLOQUEAR BOTONES INICIALMENTE
    btnReview.disabled = true;
    btnInicio.disabled = true;
    btnReview.classList.add('hidden'); // Ocultar revisión inicialmente

    if(currentMode === 'study' && !abandono) {
        await borrarProgresoEstudio();
    }

    let aciertos = 0;
    respuestasUsuario.forEach((r, i) => { 
        if(r === preguntasExamen[i].respuesta) aciertos++; 
    });
    
    showScreen('result-screen');
    document.getElementById('score-final').innerText = `${aciertos} / ${preguntasExamen.length}`;
    const msg = document.getElementById('custom-msg');
    
    if (currentMode === 'multiplayer' && currentSalaId) {
        // MODO BATALLA: Lógica de espera
        const jugadoresActualizados = await actualizarScoreEnSala(currentSalaId, aciertos);
        const pendientes = jugadoresActualizados.filter(j => !j.terminado).length;
        
        if (pendientes === 0) {
            // TODOS TERMINARON
            dibujarPodio(jugadoresActualizados);
            msg.innerHTML = "¡Batalla Terminada!";
            
            // HABILITAR BOTONES SOLO CUANDO TODOS TERMINEN
            btnReview.disabled = false;
            btnInicio.disabled = false;
            btnReview.classList.remove('hidden');
            
            // MOSTRAR AVATAR DEL JUGADOR ACTUAL
            const myPlayer = jugadoresActualizados.find(j => j.alias === currentAlias);
            if(myPlayer && myPlayer.avatar) {
                document.getElementById('final-avatar-display').src = myPlayer.avatar;
                document.getElementById('final-avatar-display').classList.remove('hidden');
            }
        } else {
            // ESPERANDO A OTROS JUGADORES
            msg.innerHTML = `Esperando a ${pendientes} jugador(es)...`;
            document.getElementById('room-results-box').classList.add('hidden');
            document.getElementById('final-avatar-display').classList.add('hidden');
            
            // MANTENER BOTONES BLOQUEADOS
            btnReview.disabled = true;
            btnInicio.disabled = true;
            
            // ESCUCHAR CAMBIOS EN LA SALA
            unsubscribeRoom = onSnapshot(doc(db, "salas_activas", currentSalaId), (snap) => {
                if(!snap.exists()) return;
                const data = snap.data();
                const nuevosPendientes = data.jugadores.filter(j => !j.terminado).length;
                
                if(nuevosPendientes === 0) {
                    // TODOS TERMINARON AHORA
                    dibujarPodio(data.jugadores);
                    msg.innerHTML = "¡Batalla Terminada!";
                    
                    // HABILITAR BOTONES
                    btnReview.disabled = false;
                    btnInicio.disabled = false;
                    btnReview.classList.remove('hidden');
                    
                    unsubscribeRoom();
                } else {
                    // ACTUALIZAR CONTADOR
                    msg.innerHTML = `Esperando a ${nuevosPendientes} jugador(es)...`;
                }
            });
        }
    } else {
        // MODO INDIVIDUAL (Examen y Estudio)
        if(aciertos === preguntasExamen.length) {
            msg.innerText = "¡Perfecto! Has acertado todas las preguntas.";
        } else if(aciertos >= preguntasExamen.length * 0.7) {
            msg.innerText = "¡Muy bien! Buen resultado.";
        } else {
            msg.innerText = "Examen finalizado. Puedes revisar tus respuestas.";
        }
        
        document.getElementById('room-results-box').classList.add('hidden');
        document.getElementById('final-avatar-display').classList.add('hidden');
        
        // HABILITAR BOTONES INMEDIATAMENTE EN MODO INDIVIDUAL
        btnReview.disabled = false;
        btnInicio.disabled = false;
        btnReview.classList.remove('hidden');
    }
}

function iniciarReloj() {
    intervaloTiempo = setInterval(() => {
        tiempoRestante--;
        let m = Math.floor(tiempoRestante / 60);
        let s = tiempoRestante % 60;
        document.getElementById('timer-display').innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
        if (tiempoRestante <= 0) { 
            clearInterval(intervaloTiempo); 
            terminarQuiz(); 
        }
    }, 1000);
}

// ==========================================================
// === LÓGICA MULTIJUGADOR COMPLETA ===
// ==========================================================

function iniciarBatalla() {
    showScreen('avatar-screen'); 
    renderizarAvatares();
}

function renderizarAvatares() {
    const grid = document.getElementById('avatar-grid-container');
    if (!grid) return;
    grid.innerHTML = '';
    
    AVATAR_CONFIG.forEach((conf, index) => {
        const url = `https://api.dicebear.com/7.x/${conf.style}/svg?seed=${conf.seed}&backgroundColor=${conf.bg}`;
        const img = document.createElement('img');
        img.src = url;
        img.className = 'avatar-option';
        img.onclick = () => {
            playClick();
            document.querySelectorAll('.avatar-option').forEach(a => a.classList.remove('avatar-selected'));
            img.classList.add('avatar-selected');
            currentAvatarUrl = url;
            document.getElementById('player-nickname').value = currentAlias;
        };
        if (index === 0 && !hasLoadedAvatars) {
            img.click();
        }
        grid.appendChild(img);
    });
    hasLoadedAvatars = true;
}

// Botón confirmar identidad
document.getElementById('btn-confirm-identity').onclick = () => {
    playClick();
    if(document.getElementById('player-nickname').value.length < 3) {
        alert("Por favor, selecciona un avatar.");
        return;
    }
    mostrarSelectorSalas();
};

// Botón volver al menú desde avatar
document.getElementById('back-to-setup').onclick = () => {
    playClick();
    showScreen('setup-screen');
};

// Botón volver a avatar desde salas
document.getElementById('back-to-avatar').onclick = () => {
    playClick();
    showScreen('avatar-screen');
};

// Botón volver al inicio desde resultados
document.getElementById('btn-inicio-final').onclick = async () => {
    playClick();
    if (currentSalaId) {
        await limpiarSala(currentSalaId);
    }
    location.reload();
};

// Botón revisar respuestas
document.getElementById('btn-review').onclick = () => {
    playClick();
    // Aquí iría la lógica para revisar respuestas
    alert("Función de revisión en desarrollo...");
};

// Prevenir salida sin limpiar sala
window.addEventListener('beforeunload', async (e) => {
    if(currentSalaId) {
        await limpiarSala(currentSalaId);
    }
});

async function mostrarSelectorSalas() {
    showScreen('rooms-screen'); 
    const container = document.getElementById('rooms-container'); 
    if (!container) return;
    
    container.innerHTML = '<p style="text-align:center;padding:20px;color:#666;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando salas...</p>';
    
    // Escuchar cambios en tiempo real
    onSnapshot(collection(db, "salas_activas"), (snapshot) => {
        container.innerHTML = '';
        
        if (snapshot.empty) {
            // Mostrar todas las salas vacías
            Object.keys(ROOM_ICONS).forEach(salaKey => {
                crearBotonSala(salaKey, container, 0);
            });
        } else {
            const salasActivas = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                salasActivas[doc.id] = {
                    count: data.jugadores ? data.jugadores.length : 0,
                    estado: data.estado || 'esperando',
                    maxPlayers: 6
                };
            });

            // Mostrar todas las salas, incluso las que no existen aún
            Object.keys(ROOM_ICONS).forEach(salaKey => {
                const info = salasActivas[salaKey] || { count: 0, estado: 'vacia' };
                crearBotonSala(salaKey, container, info.count, info.estado, info.maxPlayers);
            });
        }
    });
}

function crearBotonSala(salaId, container, numJugadores, estado = 'vacia', maxPlayers = 6) {
    const btn = document.createElement('div');
    btn.className = 'room-btn';
    
    let estadoText = '';
    let estadoColor = '#666';
    
    if (estado === 'vacia') {
        estadoText = 'Sala Vacía';
        estadoColor = '#666';
    } else if (estado === 'esperando') {
        estadoText = 'Esperando...';
        estadoColor = '#fbbc04';
    } else if (estado === 'jugando') {
        estadoText = 'En Batalla';
        estadoColor = '#ea4335';
    } else if (estado === 'iniciando') {
        estadoText = 'Iniciando...';
        estadoColor = '#1a73e8';
    }
    
    btn.innerHTML = `
        <i class="fa-solid ${ROOM_ICONS[salaId]} room-icon"></i>
        <span style="font-weight:700;font-size:1.1rem;">${salaId.replace('SALA_', '')}</span>
        <span class="room-count">${numJugadores}/${maxPlayers} Jugadores</span>
        <span style="font-size:0.75rem;color:${estadoColor};margin-top:5px;">${estadoText}</span>
    `;
    
    // Deshabilitar si está llena o en juego
    if (numJugadores >= maxPlayers || estado === 'jugando') {
        btn.style.opacity = '0.6';
        btn.style.cursor = 'not-allowed';
        btn.onclick = null;
    } else {
        btn.onclick = () => {
            playClick();
            unirseASala(salaId);
        };
    }
    
    container.appendChild(btn);
}

async function unirseASala(salaId) {
    currentSalaId = salaId;
    const roomRef = doc(db, "salas_activas", salaId);
    
    // Generar ID único para este jugador en esta sala
    myPlayerId = `${uidJugadorPermanente || 'temp'}_${Date.now()}`;
    
    const playerData = {
        id: myPlayerId,
        uid: uidJugadorPermanente || generarIDTemporal(),
        email: currentUserEmail,
        alias: currentAlias,
        avatar: currentAvatarUrl,
        score: 0,
        terminado: false,
        ready: false,
        isHost: false,
        joinedAt: new Date().toISOString(),
        lastPing: new Date().toISOString()
    };

    try {
        const docSnap = await getDoc(roomRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const jugadores = data.jugadores || [];
            
            // Verificar si ya está en la sala
            const yaEnSala = jugadores.some(j => j.email === currentUserEmail);
            if (yaEnSala) {
                alert("Ya estás en esta sala.");
                mostrarSelectorSalas();
                return;
            }
            
            // Verificar si soy el primero (anfitrión)
            if (jugadores.length === 0) {
                playerData.isHost = true;
                isHost = true;
            }
            
            // Verificar si la sala está llena
            if (jugadores.length >= 6) {
                alert("Esta sala está llena. Elige otra sala.");
                mostrarSelectorSalas();
                return;
            }
            
            await updateDoc(roomRef, {
                jugadores: arrayUnion(playerData),
                estado: 'esperando'
            });
            
        } else {
            // Primero en la sala = anfitrión
            playerData.isHost = true;
            isHost = true;
            await setDoc(roomRef, {
                jugadores: [playerData],
                estado: 'esperando',
                creado: new Date().toISOString(),
                tiempoElegido: document.getElementById('time-select').value,
                hostAlias: currentAlias,
                hostEmail: currentUserEmail,
                maxJugadores: 6
            });
        }
        
        esperarInicioJuego(salaId);
        
    } catch (e) {
        console.error("Error al unirse:", e);
        alert("Error al unirse a la sala. Intenta nuevamente.");
        mostrarSelectorSalas();
    }
}

function esperarInicioJuego(salaId) {
    showScreen('lobby-screen'); 
    document.getElementById('lobby-room-name').innerText = salaId.replace('SALA_', '');
    
    const listContainer = document.getElementById('lobby-player-list');
    const btnReady = document.getElementById('btn-lobby-ready');
    
    // Configurar botón según si soy anfitrión
    if (isHost) {
        btnReady.innerHTML = 'INICIAR BATALLA ⚔️';
        btnReady.style.background = 'var(--danger)';
        btnReady.style.fontWeight = '700';
    } else {
        btnReady.innerHTML = '¡ESTOY LISTO! ✓';
        btnReady.style.background = 'var(--primary)';
    }
    
    // Crear botón de salir de sala si no existe
    if (!document.getElementById('btn-exit-lobby')) {
        const exitBtn = document.createElement('button');
        exitBtn.id = 'btn-exit-lobby';
        exitBtn.className = 'btn-secondary';
        exitBtn.innerHTML = '<i class="fa-solid fa-door-open"></i> Salir de Sala';
        exitBtn.style.marginTop = '10px';
        exitBtn.onclick = async () => {
            playClick();
            await limpiarSala(currentSalaId);
            mostrarSelectorSalas();
        };
        document.querySelector('#lobby-screen .container').appendChild(exitBtn);
    }
    
    unsubscribeRoom = onSnapshot(doc(db, "salas_activas", salaId), async (docSnap) => {
        if (!docSnap.exists()) {
            // La sala fue eliminada
            alert("La sala ha sido cerrada.");
            mostrarSelectorSalas();
            return;
        }
        
        const data = docSnap.data();
        const jugadores = data.jugadores || [];
        playersInRoom = jugadores;
        
        // Actualizar lista de jugadores
        listContainer.innerHTML = '';
        jugadores.forEach(j => {
            const div = document.createElement('div');
            div.className = 'player-badge';
            div.innerHTML = `
                <img src="${j.avatar}" class="lobby-avatar-small" style="width:35px;height:35px;">
                <span style="flex:1;font-weight:600;">${j.alias}</span>
                ${j.isHost ? ' <i class="fa-solid fa-crown" style="color:var(--warning);"></i>' : ''}
                ${j.ready ? ' <i class="fa-solid fa-check-circle" style="color:var(--success);"></i>' : 
                          ' <i class="fa-solid fa-clock" style="color:#999;"></i>'}
            `;
            listContainer.appendChild(div);
        });

        // Actualizar título y contador
        const jugadoresListos = jugadores.filter(j => j.ready).length;
        document.querySelector('.auth-subtitle').innerHTML = 
            `Esperando jugadores... (${jugadores.length}/6)<br>
             <small>${jugadoresListos} listos, ${jugadores.length - jugadoresListos} pendientes</small>`;

        // Configurar botón listo/iniciar
        if (isHost) {
            // Anfitrión: habilitar solo si hay al menos 2 jugadores y todos listos
            const todosListos = jugadores.length >= 2 && jugadores.every(j => j.ready);
            btnReady.disabled = !todosListos;
            
            btnReady.onclick = async () => {
                if (todosListos) {
                    playClick();
                    // Anfitrión inicia la batalla
                    await updateDoc(doc(db, "salas_activas", salaId), {
                        estado: 'iniciando',
                        tiempoInicio: new Date().toISOString(),
                        tiempoLimite: data.tiempoElegido || '60'
                    });
                    
                    // Usar el tiempo del anfitrión para todos
                    const tiempoAnfitrion = data.tiempoElegido || '60';
                    document.getElementById('time-select').value = tiempoAnfitrion;
                    
                    // Iniciar juego
                    iniciarJuegoReal();
                }
            };
        } else {
            // Jugador normal: botón para marcarse como listo
            btnReady.disabled = false;
            
            btnReady.onclick = async () => {
                playClick();
                const myIndex = jugadores.findIndex(j => j.id === myPlayerId);
                if (myIndex !== -1 && !jugadores[myIndex].ready) {
                    jugadores[myIndex].ready = true;
                    await updateDoc(doc(db, "salas_activas", salaId), {
                        jugadores: jugadores
                    });
                }
            };
        }
        
        // Si la batalla ya está iniciando, unirse
        if (data.estado === 'iniciando' || data.estado === 'jugando') {
            const tiempoAnfitrion = data.tiempoElegido || '60';
            document.getElementById('time-select').value = tiempoAnfitrion;
            iniciarJuegoReal();
        }
    });
}

async function actualizarScoreEnSala(salaId, score) {
    if (!currentSalaId || !currentAlias) return [];
    
    const roomRef = doc(db, "salas_activas", salaId);
    
    try {
        const snap = await getDoc(roomRef);
        if (snap.exists()) {
            let jugadores = snap.data().jugadores;
            const myIndex = jugadores.findIndex(j => j.alias === currentAlias);
            
            if (myIndex !== -1) {
                jugadores[myIndex].score = score;
                jugadores[myIndex].terminado = true;
                jugadores[myIndex].finishedAt = new Date().toISOString();
                
                await updateDoc(roomRef, { 
                    jugadores: jugadores,
                    estado: 'jugando'
                });
            }
            return jugadores;
        }
    } catch (e) { 
        console.error("Error actualizando score:", e); 
    }
    return [];
}

async function limpiarSala(salaId) {
    if (!salaId) return;
    
    if (unsubscribeRoom) {
        unsubscribeRoom();
        unsubscribeRoom = null;
    }
    
    try {
        const roomRef = doc(db, "salas_activas", salaId);
        const snap = await getDoc(roomRef);
        
        if (snap.exists()) {
            let jugadores = snap.data().jugadores;
            const nuevosJugadores = jugadores.filter(j => j.alias !== currentAlias);
            
            if (nuevosJugadores.length === 0) {
                // Eliminar sala si está vacía
                await deleteDoc(roomRef);
            } else {
                // Actualizar sala
                await updateDoc(roomRef, { 
                    jugadores: nuevosJugadores,
                    estado: nuevosJugadores.length === 1 ? 'esperando' : snap.data().estado
                });
            }
        }
    } catch (e) { 
        console.error("Error limpiando sala:", e); 
    }
    
    currentSalaId = null;
    isHost = false;
    playersInRoom = [];
}

function dibujarPodio(jugadores) {
    const container = document.getElementById('podium-container');
    if (!container) return;
    
    // Ordenar por puntaje
    jugadores.sort((a, b) => b.score - a.score);
    const top3 = jugadores.slice(0, 3);
    
    container.innerHTML = '';
    
    // Orden visual: 2do, 1ro, 3ro
    let visualOrder = [];
    if (top3[1]) visualOrder.push(top3[1]); // 2do lugar
    if (top3[0]) visualOrder.push(top3[0]); // 1er lugar
    if (top3[2]) visualOrder.push(top3[2]); // 3er lugar
    
    visualOrder.forEach((j, index) => {
        const col = document.createElement('div');
        col.className = 'podium-column';
        
        // Alturas diferentes para cada posición
        let heightPercent = '60%';
        let podiumClass = '';
        
        if (index === 0) { // 2do lugar (posición media)
            heightPercent = '80%';
            podiumClass = 'second-place';
        } else if (index === 1) { // 1er lugar (más alto)
            heightPercent = '100%';
            podiumClass = 'first-place';
            // CREAR SERPENTINAS SOLO PARA EL GANADOR
            crearSerpentinas();
        } else { // 3er lugar (más bajo)
            heightPercent = '60%';
            podiumClass = 'third-place';
        }
        
        col.innerHTML = `
            <img src="${j.avatar}" class="podium-avatar">
            <div class="podium-name">${j.alias}</div>
            <div class="podium-bar ${podiumClass}" style="height:${heightPercent};">
                ${j.score}pts
            </div>
        `;
        container.appendChild(col);
    });
    
    document.getElementById('room-results-box').classList.remove('hidden');
}

function crearSerpentinas() {
    const confettiCount = 150;
    const colors = ['#1a73e8', '#28a745', '#ea4335', '#fbbc04', '#8e44ad', '#9b59b6'];
    
    for (let i = 0; i < confettiCount; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.width = Math.random() * 12 + 3 + 'px';
            confetti.style.height = Math.random() * 12 + 3 + 'px';
            confetti.style.animationDuration = Math.random() * 3 + 2 + 's';
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            
            document.body.appendChild(confetti);
            
            // Eliminar después de la animación
            setTimeout(() => {
                if (confetti.parentNode) {
                    confetti.parentNode.removeChild(confetti);
                }
            }, 5000);
        }, i * 20);
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    actualizarVolumen();
    
    // Asegurar que el loader se oculte
    setTimeout(() => {
        document.getElementById('app-loader').classList.add('hidden');
    }, 2000);
});
