import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, query, orderBy, limit, updateDoc, getDocs, arrayUnion, onSnapshot, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// === IMPORTAR LAS PREGUNTAS ===
import { bancoPreguntas } from './preguntas.js'; 

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

// *** AQUÍ ESTABA EL ERROR: FALTABA LA COMA DESPUÉS DE IASTUDILLOL ***
const correosUnDispositivo = [
    "cnavarretem4@unemi.edu.ec", 
    "iastudillol@unemi.edu.ec", // <--- COMA AGREGADA AQUÍ
    "gorellanas2@unemi.edu.ec", 
    "ehidalgoc4@unemi.edu.ec", 
    "lbrionesg3@unemi.edu.ec", 
    "xsalvadorv@unemi.edu.ec", 
    "nbravop4@unemi.edu.ec", 
    "jmoreirap6@unemi.edu.ec", 
    "jcastrof8@unemi.edu.ec", 
    "jcaleroc3@unemi.edu.ec"
];

const correosPermitidos = [...correosDosDispositivos, ...correosUnDispositivo];

// --- 3. VARIABLES GLOBALES ---
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
const roomsScreen = document.getElementById('rooms-screen');
const avatarScreen = document.getElementById('avatar-screen');


function showScreen(screenId) {
    document.querySelectorAll('.container').forEach(el => el.classList.add('hidden'));
    const screenElement = document.getElementById(screenId);
    if(screenElement) {
        screenElement.classList.remove('hidden');
    }
}

function playClick() {
    const sfx = document.getElementById('click-sound');
    if(sfx) { 
        const vol = parseFloat(document.getElementById('volume-slider').value);
        sfx.volume = vol;
        sfx.currentTime = 0; 
        sfx.play().catch(()=>{}); 
    }
}

// --- 5. FUNCIÓN: OBTENER ID ÚNICO DEL DISPOSITIVO ---
function obtenerDeviceId() {
    // GENERAR HUELLA SIMPLE
    const nav = window.navigator;
    const screen = window.screen;
    const rawString = `${nav.userAgent}||${nav.language}||${screen.colorDepth}||${screen.width}x${screen.height}||${new Date().getTimezoneOffset()}`;
    let hash = 0;
    for (let i = 0; i < rawString.length; i++) {
        const char = rawString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; 
    }
    const fingerprint = "DEV_" + Math.abs(hash).toString(36);

    // Guardamos y retornamos
    localStorage.setItem('device_id_seguro', fingerprint);
    return fingerprint;
}

function hablar(texto) {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    
    const utterance = new SpeechSynthesisUtterance(texto);
    const vol = parseFloat(document.getElementById('volume-slider').value);
    
    utterance.lang = 'es-ES';
    utterance.rate = 1.0;
    utterance.volume = vol; 
    
    synth.speak(utterance);
}

function generarIDTemporal() {
    return 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

// --- FUNCIONES PARA GUARDAR/CARGAR PROGRESO (MODO ESTUDIO) ---
async function guardarProgresoEstudio() {
    if (!uidJugadorPermanente || modeSelect.value !== 'study') return;
    const indicesOrdenados = preguntasExamen.map(p => bancoPreguntas.indexOf(p));
    const progreso = {
        uid: uidJugadorPermanente,
        indiceActual: indiceActual,
        respuestasUsuario: respuestasUsuario,
        indicesPreguntas: indicesOrdenados,
        fecha: new Date()
    };
    try {
        await setDoc(doc(db, "progreso_estudio", uidJugadorPermanente), progreso);
    } catch (e) {
        console.error("Error guardando progreso:", e);
    }
}

async function borrarProgresoEstudio() {
    if (!uidJugadorPermanente) return;
    try {
        await deleteDoc(doc(db, "progreso_estudio", uidJugadorPermanente));
    } catch (e) {
        console.error("No se pudo borrar progreso:", e);
    }
}

async function verificarProgresoEstudio() {
    if (!uidJugadorPermanente) return null;
    const docRef = doc(db, "progreso_estudio", uidJugadorPermanente);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data();
    }
    return null;
}

// --- FUNCIONES DE BATALLA ---
const salasActivasRef = collection(db, 'salas_activas');

async function iniciarBatalla() {
    console.log("Modo Batalla iniciado: Flujo real-time.");
    tempBattleID = generarIDTemporal();
    currentMode = 'multiplayer';
    
    document.getElementById('header-user-info').classList.remove('hidden'); 
    
    showScreen('avatar-screen'); 
    initAvatars(); 
    
    const playerNicknameInput = document.getElementById('player-nickname');
    if (playerNicknameInput && currentAlias) {
        playerNicknameInput.value = currentAlias;
    }
    if (playerNicknameInput) {
        playerNicknameInput.disabled = true;
        playerNicknameInput.style.backgroundColor = '#f1f3f4';
        playerNicknameInput.style.color = '#555';
    }
}

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
    const playerNicknameInput = document.getElementById('player-nickname');

    if (playerNicknameInput) {
        playerNicknameInput.value = currentAlias || currentName;
    }
}

// === FUNCIÓN DE LIMPIEZA AUTOMÁTICA ===
async function limpiarSalasViejasAutomaticamente() {
    try {
        const salasSnapshot = await getDocs(collection(db, "salas_activas"));
        const ahora = new Date();
        
        salasSnapshot.forEach(async (docSnap) => {
            const data = docSnap.data();
            let fechaCreacion = data.fechaCreacion;
            
            if (fechaCreacion && typeof fechaCreacion.toDate === 'function') {
                fechaCreacion = fechaCreacion.toDate();
            } else {
                fechaCreacion = new Date(0); 
            }
            
            const diferenciaMinutos = (ahora - fechaCreacion) / 1000 / 60;
            const jugadores = data.jugadores || [];
            
            const esLobbyViejo = (data.estado === 'esperando' && diferenciaMinutos > 10);
            const esJuegoMuyViejo = (data.estado === 'jugando' && diferenciaMinutos > 60);
            const estaVacia = jugadores.length === 0;

            if (esLobbyViejo || esJuegoMuyViejo || estaVacia) {
                await deleteDoc(doc(db, "salas_activas", docSnap.id));
            }
        });
    } catch(e) { console.error("Error en limpieza automática", e); }
}

function mostrarSelectorSalas() {
    showScreen('rooms-screen');
    limpiarSalasViejasAutomaticamente();

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
            unirseASala(salaId); 
        };
        list.appendChild(btn);
    });
}

async function forzarReinicioSala(salaId) {
    if(!salaId) return;
    if(confirm("¿Seguro que quieres eliminar a todos y reiniciar esta sala? Úsalo si el Host no responde.")) {
        const salaRef = doc(db, "salas_activas", salaId);
        await updateDoc(salaRef, { 
            jugadores: [],
            estado: "esperando",
            fechaCreacion: new Date()
        });
        setTimeout(() => unirseASala(salaId), 500);
    }
}

// --- FUNCIÓN UNIRSE A SALA ---
async function unirseASala(salaId) {
    if (!uidJugadorPermanente || !currentAlias) return; 

    if (unsubscribeRoom) unsubscribeRoom();
    currentSalaId = salaId;

    const salaRef = doc(db, "salas_activas", salaId);
    
    const prepararSalaParaIngreso = async () => {
        const snap = await getDoc(salaRef);
        if (snap.exists()) {
            const data = snap.data();
            let jugadores = data.jugadores || [];

            jugadores = jugadores.filter(j => j.uid !== uidJugadorPermanente);

            let fechaCreacion = data.fechaCreacion;
            if (fechaCreacion && typeof fechaCreacion.toDate === 'function') {
                fechaCreacion = fechaCreacion.toDate();
            } else {
                fechaCreacion = new Date();
            }
            const ahora = new Date();
            const diferenciaMinutos = (ahora - fechaCreacion) / 1000 / 60;

            const esLobbyViejo = (data.estado === 'esperando' && diferenciaMinutos > 10);
            const esJuegoMuyViejo = (data.estado === 'jugando' && diferenciaMinutos > 60);

            if (esLobbyViejo || esJuegoMuyViejo) {
                 console.log("Sala expirada detectada al unirse. Reseteando...");
                 await updateDoc(salaRef, { jugadores: [], estado: "esperando", fechaCreacion: new Date() });
                 return [];
            } else {
                 await updateDoc(salaRef, { jugadores: jugadores });
                 return jugadores;
            }
        }
        return [];
    };

    await prepararSalaParaIngreso(); 

    const jugadorData = { 
        id: tempBattleID, 
        uid: uidJugadorPermanente, 
        name: currentAlias, 
        avatar: currentAvatarUrl,
        score: 0,
        terminado: false, 
        estado: 'activo'
    };

    const snapCheck = await getDoc(salaRef);
    let payload = { 
        jugadores: arrayUnion(jugadorData),
        estado: "esperando"
    };
    
    if (!snapCheck.exists() || (snapCheck.data().jugadores || []).length === 0) {
        payload.fechaCreacion = new Date(); 
    }

    await setDoc(salaRef, payload, { merge: true });

    showScreen('lobby-screen');
    if (lobbyTitle) lobbyTitle.innerText = `SALA: ${salaId.replace('SALA_', '').replace(/_/g, ' ')}`;
    
    const existingResetBtn = document.getElementById('btn-manual-reset');
    if(existingResetBtn) existingResetBtn.remove();
    if(ghostHostTimer) clearTimeout(ghostHostTimer);

    unsubscribeRoom = onSnapshot(salaRef, async (docSnap) => {
        if (!docSnap.exists()) {
             if(unsubscribeRoom) unsubscribeRoom(); 
             currentSalaId = null; 
             showScreen('setup-screen');
             hablar("La sala fue cerrada.");
             return;
        }

        const data = docSnap.data();
        let jugadores = data.jugadores || [];
        
        const esHost = jugadores.length > 0 && jugadores[0].uid === uidJugadorPermanente;

        const spinner = document.querySelector('.lobby-status .spinner');
        if(spinner && jugadores.length > 0) spinner.classList.add('hidden');

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
        
        if (btnStartWar) {
            if (data.estado === 'esperando') {
                if (esHost) {
                    const resetBtn = document.getElementById('btn-manual-reset');
                    if(resetBtn) resetBtn.remove();

                    if (jugadores.length >= 2) {
                        btnStartWar.classList.remove('hidden');
                        lobbyStatusText.innerText = `¡Oponente(s) encontrado(s) (${jugadores.length} de 2). Presiona INICIAR BATALLA.`;
                        btnStartWar.style.background = '#28a745'; 
                    } else {
                        btnStartWar.classList.add('hidden'); 
                        lobbyStatusText.innerText = `Esperando oponente real (1 de 2)...`; 
                    }
                } else {
                    btnStartWar.classList.add('hidden');
                    const hostName = jugadores.length > 0 ? jugadores[0].name : 'Host Desconocido';
                    lobbyStatusText.innerText = `Esperando al Host (${hostName}) para iniciar...`;

                    if (!document.getElementById('btn-manual-reset')) {
                        ghostHostTimer = setTimeout(() => {
                            const container = document.getElementById('lobby-screen');
                            const btnReset = document.createElement('button');
                            btnReset.id = 'btn-manual-reset';
                            btnReset.className = 'btn-secondary';
                            btnReset.innerText = '¿El Host no responde? Reiniciar Sala';
                            btnReset.style.marginTop = '10px';
                            btnReset.style.borderColor = '#ea4335';
                            btnReset.style.color = '#ea4335';
                            btnReset.onclick = () => forzarReinicioSala(salaId);
                            
                            const leaveBtn = document.getElementById('btn-leave-lobby');
                            container.insertBefore(btnReset, leaveBtn);
                        }, 4000);
                    }
                }
            } 
        }
        
        if (data.estado === 'jugando') {
             if(unsubscribeRoom) unsubscribeRoom(); 
             if(ghostHostTimer) clearTimeout(ghostHostTimer);
             
             roomsScreen.classList.add('hidden');
             document.getElementById('lobby-screen').classList.add('hidden');
             
             iniciarJuegoReal();
        }
    });

    if (btnStartWar) {
        btnStartWar.onclick = async () => {
            const salaActualRef = doc(db, "salas_activas", salaId);
            const snap = await getDoc(salaActualRef);
            
            if (snap.exists() && snap.data().jugadores[0].uid === uidJugadorPermanente && snap.data().jugadores.length >= 2) {
                await updateDoc(salaActualRef, { estado: 'jugando' });
                hablar("Iniciando la secuencia de examen. ¡Que gane el mejor agente!");
            } else {
                 hablar("Necesitas al menos dos agentes para iniciar la batalla.");
            }
        };
    }

    document.getElementById('btn-leave-lobby').onclick = async () => {
        if (confirm("¿Seguro que quieres abandonar la sala?")) {
            await limpiarSala(salaId); 
            if(unsubscribeRoom) unsubscribeRoom();
            if(ghostHostTimer) clearTimeout(ghostHostTimer);
            currentSalaId = null; 
            showScreen('setup-screen'); 
        }
    };
}

async function limpiarSala(salaId) {
    if (!salaId) return;
    const salaRef = doc(db, "salas_activas", salaId);
    
    try {
        const snap = await getDoc(salaRef);
        if(snap.exists()) {
            const jugadores = snap.data().jugadores || [];
            const jugadoresActualizados = jugadores.filter(j => j.id !== tempBattleID);
            
            await updateDoc(salaRef, { jugadores: jugadoresActualizados });
            
            if(jugadoresActualizados.length === 0) {
                 await deleteDoc(salaRef);
            }
        }
    } catch (e) { 
        console.error("Error limpiando sala:", e); 
    }
}


// --- 7. LÓGICA DE SEGURIDAD AVANZADA ---
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
            // BLOQUEO ESTRICTO
            if (listaDispositivos.length >= limiteDispositivos) {
                alert(`⛔ ACCESO DENEGADO ⛔\n\nTu cuenta ya está activa en ${limiteDispositivos} dispositivo(s) registrados.\n\nSi borraste la caché o cambiaste de equipo, contacta al administrador.`);
                await signOut(auth);
                location.reload();
                return false;
            } else {
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

// --- 8. MONITOR DE AUTENTICACIÓN ---
onAuthStateChanged(auth, async (user) => {
    document.getElementById('app-loader').classList.add('hidden');

    if (user) {
        if (correosPermitidos.includes(user.email)) {
            
            if (user.email === 'kholguinb2@unemi.edu.ec') {
                const btnAdmin = document.getElementById('btn-admin-settings');
                if(btnAdmin) {
                    btnAdmin.classList.remove('hidden');
                    btnAdmin.onclick = () => {
                        document.getElementById('admin-modal').classList.remove('hidden');
                    };
                }
            }

            let nombre = user.displayName || user.email.split('@')[0];
            const partes = nombre.toLowerCase().split(' ');
            const nombreCompletoCorregido = partes.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
            
            uidJugadorPermanente = user.uid;
            currentUserEmail = user.email;

            const dispositivoValido = await validarDispositivo(user);
            
            if (dispositivoValido) {
                authScreen.classList.add('hidden');
                setupScreen.classList.remove('hidden');
                btnLogout.classList.remove('hidden');

                document.getElementById('user-display').innerText = nombreCompletoCorregido;
                if (user.photoURL) {
                    document.getElementById('user-google-photo').src = user.photoURL;
                    document.getElementById('user-google-photo').classList.remove('hidden');
                }
                
                document.getElementById('header-user-info').classList.add('hidden'); 

                setTimeout(() => {
                    hablar(`Bienvenido ${nombreCompletoCorregido.split(' ')[0]}, elija la opción que necesite.`);
                }, 500);
            }
        } else {
            alert("ACCESO RESTRINGIDO: Tu correo no está autorizado.");
            signOut(auth);
        }
    } else {
        authScreen.classList.remove('hidden');
        setupScreen.classList.add('hidden');
        document.getElementById('header-user-info').classList.add('hidden');
    }
});

// EVENTOS ADMIN
const closeAdminBtn = document.getElementById('close-admin');
if(closeAdminBtn) {
    closeAdminBtn.onclick = () => document.getElementById('admin-modal').classList.add('hidden');
}

const btnCleanRooms = document.getElementById('btn-admin-clean-rooms');
if(btnCleanRooms) {
    btnCleanRooms.onclick = async () => {
        if(confirm("¿Limpiar TODAS las salas?")) {
            const snapshot = await getDocs(collection(db, "salas_activas"));
            snapshot.forEach(async (doc) => await deleteDoc(doc.ref));
            alert("Salas limpiadas.");
            document.getElementById('admin-modal').classList.add('hidden');
        }
    };
}

const btnResetUser = document.getElementById('btn-admin-reset-user');
if(btnResetUser) {
    btnResetUser.onclick = async () => {
        const input = document.getElementById('admin-user-email');
        const emailToReset = input ? input.value.trim() : null;
        if (emailToReset && emailToReset.includes("@")) {
            if(confirm(`¿Desbloquear a ${emailToReset}?`)) {
                try {
                    await deleteDoc(doc(db, "usuarios_seguros", emailToReset));
                    alert("Usuario desbloqueado.");
                    input.value = "";
                } catch (error) { alert("Error: " + error.message); }
            }
        } else { alert("Correo inválido."); }
    };
}

const btnAddUser = document.getElementById('btn-admin-add-user');
if (btnAddUser) {
    btnAddUser.onclick = async () => {
        const emailInput = document.getElementById('admin-new-email');
        const email = emailInput.value.trim();
        const limitOptions = document.getElementsByName('device-limit');
        let selectedLimit = 1;
        for(let opt of limitOptions) { if(opt.checked) selectedLimit = parseInt(opt.value); }
        if(email && email.includes('@')) {
            // Agregar lógica para persistir en DB si quisieras a futuro, por ahora solo avisa
            alert("Funcionalidad de agregar permanente requiere backend DB. Por ahora usa el código.");
        }
    };
}

// --- 9. EVENTOS DE AUTENTICACIÓN ---
document.getElementById('btn-google').addEventListener('click', () => {
    signInWithPopup(auth, new GoogleAuthProvider()).catch(e => {
        console.error("Error Google:", e);
        alert("Error de inicio de sesión.");
    });
});

btnLogout.addEventListener('click', async () => {
    if(confirm("¿Cerrar sesión?")) {
        if (currentSalaId && tempBattleID) await limpiarSala(currentSalaId); 
        await signOut(auth);
        location.reload();
    }
});

// ... (RESTO DEL CÓDIGO DE JUEGO IGUAL) ...
// Para no cortar, asegúrate de mantener todo el bloque de iniciarJuegoReal, cargarPregunta, etc. 
// tal como estaba en la versión anterior, ya que esa parte funcionaba bien.

// =========================================================
// === INICIAR JUEGO (CON MODAL PERSONALIZADO) ===
// =========================================================
async function iniciarJuegoReal() {
    const tiempo = document.getElementById('time-select').value;
    const modo = document.getElementById('mode-select').value;

    if (tiempo !== 'infinity') {
        tiempoRestante = parseInt(tiempo) * 60;
        iniciarReloj();
    } else {
        document.getElementById('timer-display').innerText = "--:--";
    }

    if (modo === 'study') {
        const progresoGuardado = await verificarProgresoEstudio();
        
        if (progresoGuardado) {
            const total = progresoGuardado.indicesPreguntas.length;
            const vasEn = progresoGuardado.indiceActual + 1;
            
            const resumeModal = document.getElementById('resume-modal');
            const resumeText = document.getElementById('resume-text');
            const btnYes = document.getElementById('btn-resume-yes');
            const btnNo = document.getElementById('btn-resume-no');
            
            resumeText.innerHTML = `Has completado ${vasEn} de ${total} preguntas.<br>¿Deseas continuar?`;
            resumeModal.classList.remove('hidden');
            
            btnYes.onclick = () => {
                playClick();
                resumeModal.classList.add('hidden');
                preguntasExamen = progresoGuardado.indicesPreguntas.map(i => bancoPreguntas[i]);
                respuestasUsuario = progresoGuardado.respuestasUsuario || [];
                indiceActual = progresoGuardado.indiceActual;
                hablar("Recuperando tu sesión de estudio. ¡Adelante!");
                setupScreen.classList.add('hidden');
                quizScreen.classList.remove('hidden');
                cargarPregunta();
            };

            btnNo.onclick = async () => {
                playClick();
                resumeModal.classList.add('hidden');
                await borrarProgresoEstudio();
                preguntasExamen = [...bancoPreguntas].sort(() => 0.5 - Math.random());
                respuestasUsuario = [];
                indiceActual = 0;
                setupScreen.classList.add('hidden');
                quizScreen.classList.remove('hidden');
                cargarPregunta();
            };
            return; 

        } else {
            preguntasExamen = [...bancoPreguntas].sort(() => 0.5 - Math.random());
            respuestasUsuario = [];
            indiceActual = 0;
        }
    } else {
        preguntasExamen = [...bancoPreguntas].sort(() => 0.5 - Math.random()).slice(0, 20);
        respuestasUsuario = [];
        indiceActual = 0;
    }
    
    setupScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');
    cargarPregunta();
}

function cargarPregunta() {
    seleccionTemporal = null; 
    btnNextQuestion.classList.add('hidden'); 
    
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
    const isMultiplayer = currentMode === 'multiplayer';

    if ((isStudyMode || isMultiplayer) && seleccionTemporal !== null) {
        return;
    }
    
    seleccionTemporal = index;
    const botones = document.getElementById('options-container').querySelectorAll('button');
    botones.forEach(b => b.classList.remove('option-selected'));
    btnClickeado.classList.add('option-selected');
    
    if (isStudyMode || isMultiplayer) {
        mostrarResultadoInmediato(index);
        if (isStudyMode) setTimeout(() => { guardarProgresoEstudio(); }, 500); 
        if (isMultiplayer) currentStreak++;
    } else {
        btnNextQuestion.classList.remove('hidden');
    }
}

function mostrarResultadoInmediato(seleccionada) {
    const pregunta = preguntasExamen[indiceActual];
    const correcta = pregunta.respuesta;
    const cont = document.getElementById('options-container');
    const botones = cont.querySelectorAll('button');
    const comboDisplay = document.getElementById('combo-display');
    
    const esCorrecta = (seleccionada === correcta);
    if (esCorrecta) {
        document.getElementById('correct-sound').play().catch(()=>{});
        if (currentMode === 'multiplayer' && currentStreak > 1) {
            comboDisplay.innerText = `¡RACHA x${currentStreak}! 🔥`;
            comboDisplay.classList.remove('hidden');
            comboDisplay.style.animation = 'none';
            comboDisplay.offsetHeight; 
            comboDisplay.style.animation = 'popIn 0.5s';
        }
    } else {
        document.getElementById('fail-sound').play().catch(()=>{}); 
        currentStreak = 0;
        if(comboDisplay) comboDisplay.classList.add('hidden');
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

document.getElementById('btn-quit-quiz').addEventListener('click', () => {
    if (confirm("¿Estás seguro que deseas rendirte? Tu progreso actual se guardará.")) {
        terminarQuiz(true); 
    }
});

async function actualizarScoreEnSala(salaId, aciertos) {
    if (!salaId || !tempBattleID) return;
    const salaRef = doc(db, "salas_activas", salaId);
    try {
        const snap = await getDoc(salaRef);
        if (snap.exists()) {
            let jugadores = snap.data().jugadores || [];
            const indiceJugador = jugadores.findIndex(j => j.id === tempBattleID);
            if (indiceJugador !== -1) {
                jugadores[indiceJugador].score = aciertos;
                jugadores[indiceJugador].terminado = true; 
            } else return [];
            await updateDoc(salaRef, { jugadores: jugadores });
            return jugadores; 
        }
        return [];
    } catch (e) { return []; }
}

function dibujarPodio(jugadores) {
    if (!podiumContainer) return;
    const ranking = jugadores.sort((a, b) => b.score - a.score);
    podiumContainer.innerHTML = '';
    roomResultsBox.classList.remove('hidden');
    const maxScore = ranking.length > 0 ? ranking[0].score : 1;
    const minAltura = 40; 
    
    ranking.forEach((jugador, i) => {
        const alturaPorcentaje = maxScore > 0 ? (jugador.score / maxScore) * (100 - minAltura) + minAltura : minAltura;
        let puesto = i + 1;
        let cssOrder = puesto === 1 ? 2 : (puesto === 2 ? 1 : (puesto === 3 ? 3 : 4));
        
        const columna = document.createElement('div');
        columna.className = `podium-column`;
        columna.style.order = cssOrder;
        columna.innerHTML = `
            <img src="${jugador.avatar}" class="podium-avatar" />
            <span class="podium-name">${jugador.name}</span>
            <div class="podium-bar" style="height: ${alturaPorcentaje}%; min-height: ${minAltura}px;">${jugador.score}</div>
        `;
        podiumContainer.appendChild(columna);
    });
    
    if (finalAvatarDisplay && currentAvatarUrl) {
          finalAvatarDisplay.src = currentAvatarUrl;
          finalAvatarDisplay.classList.remove('hidden');
    }
}

async function terminarQuiz(abandono = false) {
    const bgMusic = document.getElementById('bg-music');
    if(bgMusic) { bgMusic.pause(); bgMusic.currentTime = 0; }
    clearInterval(intervaloTiempo);

    const btnReview = document.getElementById('btn-review');
    const btnInicio = document.getElementById('btn-inicio-final'); 
    if (btnReview) btnReview.disabled = true;
    if (btnInicio) btnInicio.disabled = true;

    if (modeSelect.value === 'study' && !abandono) await borrarProgresoEstudio();

    let aciertos = 0;
    respuestasUsuario.forEach((r, i) => { if (r === preguntasExamen[i].respuesta) aciertos++; });
    
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

    if (currentMode === 'multiplayer' && currentSalaId) {
        const jugadoresActualizados = await actualizarScoreEnSala(currentSalaId, aciertos);
        const jugadoresActivos = jugadoresActualizados.filter(j => j.estado === 'activo' || j.terminado === true);
        const countFaltantes = jugadoresActivos.filter(j => j.terminado === false).length;
        
        if (countFaltantes === 0) {
            dibujarPodio(jugadoresActualizados);
            msg.innerHTML = '<i class="fa-solid fa-star moving-icon-win"></i> ¡BATALLA TERMINADA!'; 
            msg.style.color = "#1a73e8";
            hablar("La batalla ha terminado. Revisa el podio.");
            if (btnReview) btnReview.disabled = false;
            if (btnInicio) btnInicio.disabled = false;
        } else {
            roomResultsBox.classList.add('hidden'); 
            document.getElementById('btn-review').classList.add('hidden');
            msg.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Esperando a ${countFaltantes} agentes...`;
            msg.style.color = "#fbbc04";
            
            const salaRef = doc(db, "salas_activas", currentSalaId);
            unsubscribeRoom = onSnapshot(salaRef, (docSnap) => {
                if(!docSnap.exists()) return;
                const jugadores = docSnap.data().jugadores || [];
                const activos = jugadores.filter(j => j.id !== tempBattleID);
                const pendientes = activos.filter(j => j.terminado === false).length;
                
                if (pendientes === 0) {
                    if (unsubscribeRoom) unsubscribeRoom(); 
                    dibujarPodio(jugadores);
                    msg.innerHTML = '<i class="fa-solid fa-star moving-icon-win"></i> ¡BATALLA TERMINADA!'; 
                    msg.style.color = "#1a73e8";
                    document.getElementById('btn-review').classList.remove('hidden');
                    hablar("Todos han terminado.");
                    if (btnReview) btnReview.disabled = false;
                    if (btnInicio) btnInicio.disabled = false;
                }
            });
        }
    } else { 
        if (abandono) {
            msg.innerText = "Finalizado por usuario."; 
            msg.style.color = "#ea4335";
        } else if (aciertos === totalPreguntas) { 
            msg.innerHTML = '<i class="fa-solid fa-trophy moving-icon-win"></i> ¡PERFECTO! 💯'; 
            msg.style.color = "#28a745"; 
            if (typeof createConfetti === 'function') createConfetti(); 
            if (sfxWin) sfxWin.play().catch(()=>{});
            hablar("¡Increíble! Puntaje perfecto."); 
        } else { 
            msg.innerHTML = '<i class="fa-solid fa-check-circle moving-icon-win"></i> ¡Finalizado!'; 
            msg.style.color = "#fbbc04";
            if (sfxWin) sfxWin.play().catch(()=>{});
        }
        if (btnInicio) btnInicio.disabled = false;
        if (btnReview) btnReview.disabled = false;
        roomResultsBox.classList.add('hidden');
        finalAvatarDisplay.classList.add('hidden');
    }
}

const btnInicioFinal = document.getElementById('btn-inicio-final');
if(btnInicioFinal) {
    btnInicioFinal.onclick = async () => {
        if (currentSalaId && tempBattleID) await limpiarSala(currentSalaId); 
        location.reload();
    };
}

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

// --- 18. GESTIÓN DE SALA AL CERRAR VENTANA/PESTAÑA ---
window.addEventListener('beforeunload', (e) => {
    if (currentSalaId && tempBattleID) limpiarSala(currentSalaId); 
});
