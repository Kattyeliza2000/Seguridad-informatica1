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
let jugadorActualData = null; // REFERENCIA GLOBAL CRITICA

// --- 64 PREGUNTAS ---
const bancoPreguntas = [
    { texto: "¿Cuál es un ejemplo de amenaza técnica según el documento?", opciones: ["Phishing", "Baja tensión eléctrica", "Inyección SQL", "Insider"], respuesta: 1, explicacion: "Respuesta correcta: Baja tensión eléctrica." },
    // ... (MANTEN AQUÍ TUS 64 PREGUNTAS, CÓPIALAS DEL SCRIPT ANTERIOR) ...
    { texto: "Un objetivo clave de la seguridad de bases de datos es mantener la:", opciones: ["Confidencialidad, integridad y disponibilidad (CIA)", "Fragmentación", "Redundancia excesiva", "Compresión"], respuesta: 0, explicacion: "Respuesta correcta: Confidencialidad, integridad y disponibilidad (CIA)." }
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

function showScreen(screenId) {
    document.querySelectorAll('.container').forEach(el => el.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
}

async function validarDispositivo(user) {
    const email = user.email;
    currentUserEmail = email;
    // (Lógica de validación normal...)
    return true; 
}

function toggleHeaderButtons() {
    const modo = document.getElementById('mode-select').value;
    const btnRanking = document.getElementById('btn-ranking');
    // Eliminado btn-stats
    if (modo === 'exam') btnRanking.classList.remove('hidden');
    else btnRanking.classList.add('hidden');
}

document.getElementById('mode-select').addEventListener('change', toggleHeaderButtons);

onAuthStateChanged(auth, async (user) => {
    if (user) {
        if (correosPermitidos.includes(user.email)) {
            // Validación simplificada para este ejemplo
            showScreen('setup-screen');
            document.getElementById('btn-logout').classList.remove('hidden');
            const nombreReal = user.displayName ? user.displayName.split(' ')[0] : user.email.split('@')[0];
            document.getElementById('user-display').innerText = nombreReal;
            document.getElementById('player-nickname').value = nombreReal;
            if (user.photoURL) {
                document.getElementById('user-google-photo').src = user.photoURL;
                document.getElementById('user-google-photo').classList.remove('hidden');
                document.getElementById('header-photo').src = user.photoURL;
            }
            toggleHeaderButtons();
            setTimeout(() => hablar(`Bienvenido ${nombreReal}, elija la opción que necesite.`), 500);
        } else {
            alert("No autorizado."); signOut(auth);
        }
    } else {
        showScreen('auth-screen');
        document.getElementById('btn-ranking').classList.add('hidden');
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
    document.getElementById('header-user-info').classList.remove('hidden');
    document.getElementById('header-username').innerText = document.getElementById('user-display').innerText;

    const tiempo = document.getElementById('time-select').value;
    if (tiempo !== 'infinity') { tiempoRestante = parseInt(tiempo) * 60; } else { tiempoRestante = -1; }

    if (modo === 'multiplayer') {
        showScreen('avatar-screen');
        initAvatars(); 
        currentMode = 'multiplayer';
    } 
    else if (modo === 'study') {
        currentMode = 'study';
        preguntasExamen = [...bancoPreguntas].sort(() => 0.5 - Math.random()); // 64 preguntas aleatorias
        iniciarInterfazQuiz();
    } 
    else {
        currentMode = 'exam';
        preguntasExamen = [...bancoPreguntas].sort(() => 0.5 - Math.random()).slice(0, 20); // 20 aleatorias
        iniciarInterfazQuiz();
    }
}

document.getElementById('btn-confirm-identity').addEventListener('click', () => { playClick(); mostrarSelectorSalas(); });
document.getElementById('back-to-setup').addEventListener('click', () => showScreen('setup-screen'));
document.getElementById('back-to-avatar').addEventListener('click', () => showScreen('avatar-screen'));

document.getElementById('btn-ranking').addEventListener('click', async () => {
    const btn = document.getElementById('btn-ranking');
    if(btn.classList.contains('locked-btn')) return;
    document.getElementById('ranking-modal').classList.remove('hidden');
    await cargarRankingGlobal();
});

// CORRECCIÓN DE CIERRE DE MODALES
document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.target.closest('.modal-overlay').classList.add('hidden');
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
        btn.innerHTML = `
            <div class="room-icon"><i class="fa-solid ${ROOM_ICONS[salaId]}"></i></div>
            <strong>${salaId.replace('SALA_', '').replace(/_/g, ' ')}</strong>
            <span class="room-count" id="count-${salaId}">...</span>`;
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
    const nick = document.getElementById('player-nickname').value || currentUserEmail.split('@')[0];
    const jugadorData = { name: nick, avatar: currentAvatarUrl };
    
    jugadorActualData = jugadorData; // Referencia global para borrar luego

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
                listDiv.innerHTML += `<div class="player-badge"><img src="${p.avatar}" class="lobby-avatar-small"> ${p.name}</div>`; 
            });
            if (data.estado === 'jugando') iniciarQuizMultiplayer();
        }
    });
}

async function limpiarSala(salaId) {
    if(!salaId || !jugadorActualData) return;
    const salaRef = doc(db, "salas_activas", salaId);
    try {
        await updateDoc(salaRef, { jugadores: arrayRemove(jugadorActualData) });
    } catch (e) { console.error(e); }
}

document.getElementById('btn-leave-lobby').addEventListener('click', async () => {
    await limpiarSala(currentRoomId);
    location.reload();
});

document.getElementById('btn-start-war').addEventListener('click', async () => {
    const salaRef = doc(db, "salas_activas", currentRoomId);
    await updateDoc(salaRef, { estado: 'jugando' });
});

function iniciarQuizMultiplayer() {
    if (unsubscribeRoom) unsubscribeRoom();
    preguntasExamen = [...bancoPreguntas].sort(() => 0.5 - Math.random()); // 64 aleatorias
    iniciarInterfazQuiz();
}

function iniciarInterfazQuiz() {
    if(currentMode === 'exam') {
        document.getElementById('btn-ranking').classList.add('locked-btn');
    }
    respuestasUsuario = [];
    indiceActual = 0;
    currentStreak = 0;
    startTime = Date.now();
    if(tiempoRestante > 0) iniciarReloj(); else document.getElementById('timer-display').innerText = "--:--";
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
    
    // --- CORRECCIÓN MODO ESTUDIO: FEEDBACK INMEDIATO ---
    if (currentMode === 'study') {
        mostrarResultadoInmediato(index);
    } else {
        document.getElementById('btn-next-question').classList.remove('hidden');
    }
}

function mostrarResultadoInmediato(sel) {
    const correcta = preguntasExamen[indiceActual].respuesta;
    const btns = document.getElementById('options-container').querySelectorAll('button');
    
    btns.forEach(b => b.disabled = true);
    btns[correcta].classList.add('ans-correct', 'feedback-visible');
    if(sel !== correcta) btns[sel].classList.add('ans-wrong', 'feedback-visible');
    
    const div = document.createElement('div');
    div.className = 'explanation-feedback';
    div.innerHTML = `<strong>Explicación:</strong> ${preguntasExamen[indiceActual].explicacion}`;
    document.getElementById('options-container').appendChild(div);
    
    respuestasUsuario.push(sel);
    // SIEMPRE MOSTRAR BOTON SIGUIENTE EN ESTUDIO
    document.getElementById('btn-next-question').classList.remove('hidden');
}

document.getElementById('btn-next-question').addEventListener('click', () => {
    // Solo guardar si no es modo estudio (porque en estudio ya se guardó arriba)
    if(currentMode !== 'study' && seleccionTemporal !== null) {
        if(currentMode === 'multiplayer') {
             if (seleccionTemporal === preguntasExamen[indiceActual].respuesta) {
                currentStreak++;
                if(currentStreak >= 2) mostrarRacha(currentStreak);
            } else currentStreak = 0;
        }
        respuestasUsuario.push(seleccionTemporal);
    }
    indiceActual++;
    cargarPregunta();
});

function mostrarRacha(n) {
    const d = document.getElementById('combo-display');
    d.innerText = `¡RACHA x${n}! 🔥`;
    d.classList.remove('hidden');
    setTimeout(() => d.classList.add('hidden'), 1500);
}

function iniciarReloj() {
    intervaloTiempo = setInterval(() => {
        tiempoRestante--;
        let m = Math.floor(tiempoRestante / 60), s = tiempoRestante % 60;
        document.getElementById('timer-display').innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
        if (tiempoRestante <= 0) { clearInterval(intervaloTiempo); terminarQuiz(); }
    }, 1000);
}

document.getElementById('btn-quit-quiz').addEventListener('click', () => {
    if(confirm("¿Rendirse?")) terminarQuiz(true);
});

async function terminarQuiz(abandono = false) {
    clearInterval(intervaloTiempo);
    const tiempoFinal = Math.floor((Date.now() - startTime) / 1000);
    let aciertos = 0;
    respuestasUsuario.forEach((r, i) => {
        if (i < preguntasExamen.length && r === preguntasExamen[i].respuesta) aciertos++;
    });
    const nota = Math.round((aciertos / preguntasExamen.length) * 100);
    
    const nick = document.getElementById('player-nickname').value || currentUserEmail.split('@')[0];
    const finalAvatar = currentAvatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';

    if (currentMode === 'multiplayer' && currentRoomId) {
        await addDoc(collection(db, `salas_activas/${currentRoomId}/resultados`), {
            user: nick,
            avatar: finalAvatar,
            score: nota,
            correctas: aciertos,
            timeTaken: tiempoFinal,
            status: abandono ? "Retirado" : "Finalizado",
            date: new Date()
        });
        
        // --- LIMPIEZA DE SALA AL TERMINAR ---
        await limpiarSala(currentRoomId);
        
        renderBattlePodium();
        document.getElementById('battle-results-modal').classList.remove('hidden');
    } else {
        if(currentMode === 'exam') {
            document.getElementById('btn-ranking').classList.remove('locked-btn');
            await guardarRankingGlobal(nota);
        }
        showScreen('result-screen');
        document.getElementById('score-final').innerText = `${nota}/100`;
        if(currentMode === 'study') document.getElementById('btn-review').classList.add('hidden');
        else document.getElementById('btn-review').classList.remove('hidden');
    }
}

document.getElementById('btn-exit-war-modal').addEventListener('click', async () => { location.reload(); });

function renderBattlePodium() {
    const q = query(collection(db, `salas_activas/${currentRoomId}/resultados`), orderBy("score", "desc"));
    onSnapshot(q, (snap) => {
        const container = document.getElementById('podium-container');
        container.innerHTML = '';
        let players = [];
        snap.forEach(doc => players.push(doc.data()));
        players.slice(0, 5).forEach((p, index) => {
            const height = Math.max(20, p.score) + '%'; 
            const col = document.createElement('div');
            col.className = 'podium-column';
            col.innerHTML = `<div class="podium-avatar" style="background-image: url('${p.avatar}'); background-size: cover;"></div><div class="podium-name">${p.user}</div><div class="podium-bar" style="height: ${height};">${p.score}</div>`;
            container.appendChild(col);
        });
    });
}

// --- RANKING DIARIO (FILTRO POR FECHA) ---
async function guardarRankingGlobal(nota) {
    try {
        const today = new Date().toLocaleDateString();
        await addDoc(collection(db, "ranking_global"), {
            email: currentUserEmail,
            score: nota,
            dateString: today // Guardamos la fecha como string simple para filtrar
        });
    } catch (e) { console.error(e); }
}

async function cargarRankingGlobal() {
    try {
        const today = new Date().toLocaleDateString();
        // FILTRO: Solo documentos donde dateString sea hoy
        const q = query(collection(db, "ranking_global"), where("dateString", "==", today), orderBy("score", "desc"), limit(10));
        const querySnapshot = await getDocs(q);
        const list = document.getElementById('ranking-list');
        list.innerHTML = "";
        let pos = 1;
        querySnapshot.forEach((doc) => {
            const d = doc.data();
            list.innerHTML += `<div class="rank-row"><span class="rank-pos">#${pos}</span><span class="rank-name">${d.email.split('@')[0]}</span><span class="rank-score">${d.score} pts</span></div>`;
            pos++;
        });
        if(pos === 1) list.innerHTML = "<p style='text-align:center; padding:20px;'>Aún no hay puntajes hoy. ¡Sé el primero!</p>";
    } catch(e) { console.warn("Falta índice compuesto en Firebase. Crea uno para (dateString ASC, score DESC)."); }
}

document.getElementById('btn-review').addEventListener('click', () => {
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('review-screen').classList.remove('hidden');
    const c = document.getElementById('review-container'); c.innerHTML = '';
    preguntasExamen.forEach((p, i) => {
        const ok = respuestasUsuario[i] === p.respuesta;
        let ops = '';
        p.opciones.forEach((o, x) => {
            let cls = (x === p.respuesta) ? 'ans-correct' : (x === respuestasUsuario[i] && !ok ? 'ans-wrong' : '');
            ops += `<div class="review-answer ${cls}">${x === p.respuesta ? '✅' : (x===respuestasUsuario[i]?'❌':'')} ${o}</div>`;
        });
        c.innerHTML += `<div class="review-item"><div class="review-question">${i+1}. ${p.texto}</div>${ops}<div class="review-explanation">${p.explicacion}</div></div>`;
    });
});
