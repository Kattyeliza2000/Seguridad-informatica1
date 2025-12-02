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
const correosUnDispositivo = ["cnavarretem4@unemi.edu.ec", "iastudillol@unemi.edu.ec", "gorellanas2@unemi.edu.ec", "ehidalgoc4@unemi.edu.ec", "lbrionesg3@unemi.edu.ec", "xsalvadorv@unemi.edu.ec", "nbravop4@unemi.edu.ec", "jmoreirap6@unemi.edu.ec", "jcastrof8@unemi.edu.ec", "jcaleroc3@unemi.edu.ec"];
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

// CORRECCIÓN VOLUMEN: playClick ahora lee el volumen actual
function playClick() {
    const sfx = document.getElementById('click-sound');
    if(sfx) { 
        // Obtener volumen actual del slider
        const vol = parseFloat(document.getElementById('volume-slider').value);
        sfx.volume = vol;
        sfx.currentTime = 0; 
        sfx.play().catch(()=>{}); 
    }
}

// --- 5. FUNCIÓN: OBTENER ID ÚNICO DEL DISPOSITIVO ---
function obtenerDeviceId() {
    let deviceId = localStorage.getItem('device_id_seguro');
    if (!deviceId) {
        deviceId = 'dev_' + Math.random().toString(36).substr(2, 9) + Date.now();
        localStorage.setItem('device_id_seguro', deviceId);
    }
    return deviceId;
}

// CORRECCIÓN VOLUMEN: hablar ahora aplica el volumen del slider
function hablar(texto) {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    
    const utterance = new SpeechSynthesisUtterance(texto);
    
    // Obtener volumen actual del slider
    const vol = parseFloat(document.getElementById('volume-slider').value);
    
    utterance.lang = 'es-ES';
    utterance.rate = 1.0;
    utterance.volume = vol; // Aplicar volumen a la voz
    
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
            unirseASala(salaId); 
        };
        list.appendChild(btn);
    });
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

            const salaVieja = diferenciaMinutos > 10;
            const partidaAbandonada = (data.estado === 'jugando' && jugadores.filter(j => !j.terminado).length === 0);
            const hayZombies = jugadores.some(j => j.terminado === true);

            if (salaVieja || partidaAbandonada || hayZombies || jugadores.length === 0) {
                 console.log("Limpiando sala fantasma/vieja...");
                 await updateDoc(salaRef, { 
                     jugadores: [],
                     estado: "esperando",
                     fechaCreacion: new Date()
                 });
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
                }
            } 
        }
        
        if (data.estado === 'jugando') {
             if(unsubscribeRoom) unsubscribeRoom(); 
             
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
            if (listaDispositivos.length >= limiteDispositivos) {
                alert(`⛔ ACCESO DENEGADO ⛔\n\nHas excedido tu límite de ${limiteDispositivos} dispositivos registrados. Debes cerrar sesión en otro equipo para continuar.`);
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
            
            let nombre = user.displayName || user.email.split('@')[0];
            const partes = nombre.toLowerCase().split(' ');
            const nombreCompletoCorregido = partes.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
            
            const nombreCorto = nombreCompletoCorregido.split(' ')[0];
            
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
                    hablar(`Bienvenido ${nombreCorto}, elija la opción que necesite.`);
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

// --- 10. LÓGICA DEL JUEGO / SETUP ---
document.getElementById('btn-start').addEventListener('click', () => {
    const modo = modeSelect.value;
    
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
        iniciarBatalla(); 
    } else {
        hablar(`Magnífico, has seleccionado el modo ${modo}. Buena suerte.`);
        iniciarJuegoReal();
    }
    
    const bgMusic = document.getElementById('bg-music');
    if(bgMusic) { bgMusic.volume = obtenerVolumen(); bgMusic.play().catch(()=>{}); }
});

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

document.addEventListener('DOMContentLoaded', () => {
    const btnConfirmIdentity = document.getElementById('btn-confirm-identity');
    
    if (btnConfirmIdentity) {
        btnConfirmIdentity.addEventListener('click', () => {
            const nick = document.getElementById('player-nickname').value.trim();
            
            if (nick.length < 3) {
                 hablar("Por favor, introduce un apodo de al menos tres letras.");
                 return;
            }
            
            mostrarSelectorSalas();
        });
    }
    
    const backToSetup = document.getElementById('back-to-setup');
    const backToAvatar = document.getElementById('back-to-avatar');
    
    if(backToSetup) backToSetup.addEventListener('click', () => showScreen('setup-screen'));
    if(backToAvatar) backToAvatar.addEventListener('click', () => showScreen('avatar-screen'));
});


// =========================================================
// === INICIAR JUEGO (CON MODAL PERSONALIZADO) ===
// =========================================================
async function iniciarJuegoReal() {
    const tiempo = document.getElementById('time-select').value;
    const modo = document.getElementById('mode-select').value;

    // Configuración del reloj
    if (tiempo !== 'infinity') {
        tiempoRestante = parseInt(tiempo) * 60;
        iniciarReloj();
    } else {
        document.getElementById('timer-display').innerText = "--:--";
    }

    // --- LÓGICA DE RECUPERACIÓN PARA MODO ESTUDIO ---
    if (modo === 'study') {
        const progresoGuardado = await verificarProgresoEstudio();
        
        // Si hay progreso guardado, MOSTRAMOS EL MODAL PROPIO
        if (progresoGuardado) {
            const total = progresoGuardado.indicesPreguntas.length;
            const vasEn = progresoGuardado.indiceActual + 1;
            
            // 1. Mostrar el modal (YA NO USA confirm())
            const resumeModal = document.getElementById('resume-modal');
            const resumeText = document.getElementById('resume-text');
            const btnYes = document.getElementById('btn-resume-yes');
            const btnNo = document.getElementById('btn-resume-no');
            
            resumeText.innerHTML = `Has completado ${vasEn} de ${total} preguntas.<br>¿Deseas continuar?`;
            resumeModal.classList.remove('hidden');
            
            // 2. Definir acciones de los botones
            
            // OPCIÓN SI: RECUPERAR
            btnYes.onclick = () => {
                playClick();
                resumeModal.classList.add('hidden'); // Cerrar modal
                
                // Cargar datos
                preguntasExamen = progresoGuardado.indicesPreguntas.map(i => bancoPreguntas[i]);
                respuestasUsuario = progresoGuardado.respuestasUsuario || [];
                indiceActual = progresoGuardado.indiceActual;
                
                hablar("Recuperando tu sesión de estudio. ¡Adelante!");
                
                // Iniciar UI
                setupScreen.classList.add('hidden');
                quizScreen.classList.remove('hidden');
                cargarPregunta();
            };

            // OPCIÓN NO: BORRAR Y EMPEZAR
            btnNo.onclick = async () => {
                playClick();
                resumeModal.classList.add('hidden'); // Cerrar modal
                
                await borrarProgresoEstudio(); // Borrar BD
                
                // Empezar de cero
                preguntasExamen = [...bancoPreguntas].sort(() => 0.5 - Math.random());
                respuestasUsuario = [];
                indiceActual = 0;
                
                // Iniciar UI
                setupScreen.classList.add('hidden');
                quizScreen.classList.remove('hidden');
                cargarPregunta();
            };
            
            // IMPORTANTE: Detenemos la ejecución aquí. El juego sigue SOLO cuando el usuario pulsa un botón.
            return; 

        } else {
            // Si no había nada guardado, iniciamos normal directo
            preguntasExamen = [...bancoPreguntas].sort(() => 0.5 - Math.random());
            respuestasUsuario = [];
            indiceActual = 0;
        }
    } else {
        // --- MODOS EXAMEN / MULTIPLAYER (No guardan progreso, lógica normal) ---
        preguntasExamen = [...bancoPreguntas].sort(() => 0.5 - Math.random()).slice(0, 20);
        respuestasUsuario = [];
        indiceActual = 0;
    }
    
    // Cambiar pantallas (Este bloque solo corre si NO entramos al if del modal)
    setupScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');
    cargarPregunta();
}

// --- 11. FUNCIONES DE QUIZ ---
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

    if (isStudyMode && seleccionTemporal !== null) {
        return;
    }
    
    seleccionTemporal = index;
    const botones = document.getElementById('options-container').querySelectorAll('button');
    botones.forEach(b => b.classList.remove('option-selected'));
    btnClickeado.classList.add('option-selected');
    
    if (isStudyMode) {
        mostrarResultadoInmediato(index);
        
        // === GUARDAR AUTOMÁTICAMENTE AL RESPONDER (MODO ESTUDIO) ===
        setTimeout(() => { guardarProgresoEstudio(); }, 500); 
    } else {
        btnNextQuestion.classList.remove('hidden');
    }
}

function mostrarResultadoInmediato(seleccionada) {
    const pregunta = preguntasExamen[indiceActual];
    const correcta = pregunta.respuesta;
    const cont = document.getElementById('options-container');
    const botones = cont.querySelectorAll('button');
    
    const esCorrecta = (seleccionada === correcta);
    if (esCorrecta) {
        document.getElementById('correct-sound').play().catch(()=>{});
    } else {
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

document.getElementById('btn-quit-quiz').addEventListener('click', () => {
    if (confirm("¿Estás seguro que deseas rendirte? Tu progreso actual se guardará.")) {
        terminarQuiz(true); 
    }
});


// --- ACTUALIZAR SCORE ---
async function actualizarScoreEnSala(salaId, aciertos) {
    if (!salaId || !tempBattleID) return;

    const salaRef = doc(db, "salas_activas", salaId);
    const scoreFinal = aciertos; 

    try {
        const snap = await getDoc(salaRef);
        if (snap.exists()) {
            let jugadores = snap.data().jugadores || [];
            
            const indiceJugador = jugadores.findIndex(j => j.id === tempBattleID);
            
            if (indiceJugador !== -1) {
                jugadores[indiceJugador].score = scoreFinal;
                jugadores[indiceJugador].terminado = true; 
            } else {
                return [];
            }

            await updateDoc(salaRef, { jugadores: jugadores });
            
            return jugadores; 
        }
        return [];
    } catch (e) {
        console.error("Error actualizando score en sala:", e);
        return [];
    }
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

// --- 13. FUNCIÓN TERMINAR QUIZ ---
async function terminarQuiz(abandono = false) {
    const bgMusic = document.getElementById('bg-music');
    if(bgMusic) { bgMusic.pause(); bgMusic.currentTime = 0; }
    clearInterval(intervaloTiempo);

    const btnReview = document.getElementById('btn-review');
    const btnInicio = document.getElementById('btn-inicio-final'); 
    
    if (btnReview) btnReview.disabled = true;
    if (btnInicio) btnInicio.disabled = true;

    // --- LOGICA DE BORRADO DE PROGRESO DE ESTUDIO ---
    if (modeSelect.value === 'study' && !abandono) {
        await borrarProgresoEstudio();
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
    
    // --- LÓGICA MULTIPLAYER PARA CUALQUIER SALA ---
    if (currentMode === 'multiplayer' && currentSalaId) {
        
        const jugadoresActualizados = await actualizarScoreEnSala(currentSalaId, aciertos);

        const jugadoresActivos = jugadoresActualizados.filter(j => j.estado === 'activo' || j.terminado === true);
        
        const jugadoresFaltantes = jugadoresActivos.filter(j => j.terminado === false);
        const countFaltantes = jugadoresFaltantes.length;

        const todosTerminados = countFaltantes === 0;

        if (todosTerminados) {
            dibujarPodio(jugadoresActualizados);
            msg.innerHTML = '<i class="fa-solid fa-star moving-icon-win"></i> ¡BATALLA TERMINADA! Vea el Podio.'; 
            msg.style.color = "#1a73e8";
            hablar("La batalla ha terminado. Revisa el podio.");
            
            if (btnReview) btnReview.disabled = false;
            if (btnInicio) btnInicio.disabled = false;

        } else {
            
            roomResultsBox.classList.add('hidden'); 
            document.getElementById('btn-review').classList.add('hidden');
            
            const mensajeEspera = countFaltantes > 1 
                ? `Esperando a ${countFaltantes} agentes que siguen en juego...` 
                : `Esperando a 1 agente que sigue en juego...`;

            msg.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${mensajeEspera}`;
            msg.style.color = "#fbbc04";
            
            if (finalAvatarDisplay && currentAvatarUrl) {
                finalAvatarDisplay.src = currentAvatarUrl;
                finalAvatarDisplay.classList.remove('hidden');
            }

            const salaRef = doc(db, "salas_activas", currentSalaId);
            unsubscribeRoom = onSnapshot(salaRef, (docSnap) => {
                const jugadoresEsperando = docSnap.data().jugadores || [];
                const jugadoresActivosEnEspera = jugadoresEsperando.filter(j => j.id !== tempBattleID);
                
                const countFaltantesListener = jugadoresActivosEnEspera.filter(j => j.terminado === false).length;
                const todosHanTerminado = countFaltantesListener === 0;
                
                if (!todosHanTerminado) {
                    const msgEspera = countFaltantesListener > 1 
                        ? `Esperando a ${countFaltantesListener} agentes que siguen en juego...` 
                        : `Esperando a 1 agente que sigue en juego...`;
                    msg.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${msgEspera}`;
                }
                
                if (todosHanTerminado) {
                    if (unsubscribeRoom) unsubscribeRoom(); 
                    
                    dibujarPodio(jugadoresEsperando);
                    msg.innerHTML = '<i class="fa-solid fa-star moving-icon-win"></i> ¡BATALLA TERMINADA! Vea el Podio.'; 
                    msg.style.color = "#1a73e8";
                    document.getElementById('btn-review').classList.remove('hidden');
                    hablar("Todos los agentes han completado su misión.");
                    
                    if (btnReview) btnReview.disabled = false;
                    if (btnInicio) btnInicio.disabled = false;
                }
            });
        }

    } else { 
        // LÓGICA INDIVIDUAL
        if (abandono) {
            msg.innerText = "Finalizado por usuario. Se registraron las respuestas completadas."; 
            msg.style.color = "#ea4335";
            
        } else if (aciertos === totalPreguntas) { 
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
        
        if (btnInicio) btnInicio.disabled = false;
        if (btnReview) btnReview.disabled = false;

        roomResultsBox.classList.add('hidden');
        finalAvatarDisplay.classList.add('hidden');
    }

    if (modeSelect.value === 'study') {
        document.getElementById('btn-review').classList.add('hidden');
    } else {
        if (currentMode !== 'multiplayer' || abandono) {
             document.getElementById('btn-review').classList.remove('hidden');
        }
    }
}

btnNextQuestion.addEventListener('click', () => {
    const isStudyMode = modeSelect.value === 'study';
    
    // Si estamos en modo estudio, guardamos cada vez que avanza
    if (isStudyMode && seleccionTemporal !== null) {
        indiceActual++;
        cargarPregunta();
        guardarProgresoEstudio(); 
        return; 
    }
    
    if (seleccionTemporal !== null) {
        respuestasUsuario.push(seleccionTemporal);
        indiceActual++;
        cargarPregunta();
    }
});


// --- 15. FUNCIONES AUXILIARES DE TIEMPO Y ANIMACIÓN ---
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

// --- 16. REVISIÓN Y MÁS FUNCIONES AUXILIARES ---
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

// --- 17. INICIALIZACIÓN Y EVENTOS DE VOLUMEN (CORREGIDO) ---

function obtenerVolumen() {
    return parseFloat(document.getElementById('volume-slider').value);
}

function actualizarVolumen() {
    const vol = obtenerVolumen();
    // Actualizar audio tags
    document.querySelectorAll('audio').forEach(a => {
        a.volume = vol;
        a.muted = (vol === 0);
    });

    // Actualizar ícono
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

// --- Funciones de Ranking/Historial ---
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


// --- 18. GESTIÓN DE SALA AL CERRAR VENTANA/PESTAÑA ---
// CORRECCIÓN: ELIMINADO EL EVENTO DE VISIBILIDAD PARA EVITAR SALIDAS POR MINIMIZAR

window.addEventListener('beforeunload', (e) => {
    // Limpieza de emergencia al CERRAR el navegador totalmente (no minimizar)
    if (currentSalaId && tempBattleID) {
        limpiarSala(currentSalaId); 
    }
});
