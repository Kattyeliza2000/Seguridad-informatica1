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

let currentAvatarUrl = null;
let currentStreak = 0;
let startTime = 0; 
let selectedGender = 'male'; // Default

// 64 PREGUNTAS 
const bancoPreguntas = [
    { texto: "¿Cuál es un ejemplo de amenaza técnica según el documento?", opciones: ["Phishing", "Baja tensión eléctrica", "Inyección SQL", "Insider"], respuesta: 1, explicacion: "Respuesta correcta: Baja tensión eléctrica." },
    // ... (MANTEN EL BANCO COMPLETO) ...
];
// NOTA: ASEGÚRATE DE COPIAR EL ARRAY COMPLETO DE 64 PREGUNTAS DE LA RESPUESTA ANTERIOR
if(bancoPreguntas.length < 64) console.log("Recuerda pegar todas las preguntas.");

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

// --- SONIDOS AUXILIARES ---
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
            playClick(); // Sonido click
            document.querySelectorAll('.avatar-option').forEach(x => x.classList.remove('avatar-selected'));
            img.classList.add('avatar-selected');
            currentAvatarUrl = url;
        };
        grid.appendChild(img);
    });
}

// --- SELECTOR DE GÉNERO ---
document.querySelectorAll('.gender-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedGender = btn.getAttribute('data-gender');
        playClick();
    });
});

// --- VOZ DEL SISTEMA (INVERSA) ---
function hablar(texto, callback) {
    const synth = window.speechSynthesis;
    if (!synth) { if(callback) callback(); return; }
    
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'es-ES';
    utterance.rate = 1.0;

    // BUSCAR VOZ OPUESTA
    const voices = synth.getVoices();
    let targetVoice = null;

    if (selectedGender === 'male') {
        // Usuario Hombre -> Buscar Voz Mujer
        targetVoice = voices.find(v => v.lang.includes('es') && (v.name.includes('Female') || v.name.includes('Google') || v.name.includes('Sabina') || v.name.includes('Monica')));
    } else {
        // Usuario Mujer -> Buscar Voz Hombre
        targetVoice = voices.find(v => v.lang.includes('es') && (v.name.includes('Male') || v.name.includes('Pablo') || v.name.includes('Jorge') || v.name.includes('Enrique')));
    }

    if (targetVoice) utterance.voice = targetVoice;
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
                
                const nombre = user.email.split('@')[0];
                document.getElementById('user-display').innerText = nombre;
                document.getElementById('player-nickname').value = nombre;
                
                if (user.photoURL) {
                    const profilePic = document.getElementById('user-google-photo');
                    profilePic.src = user.photoURL;
                    profilePic.classList.remove('hidden');
                    const headerPic = document.getElementById('header-photo');
                    if(headerPic) {
                        headerPic.src = user.photoURL;
                        // Se mantiene oculto hasta empezar
                    }
                }
                toggleHeaderButtons();
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

// --- BOTON EMPEZAR (VOZ) ---
document.getElementById('btn-start').addEventListener('click', () => {
    const nombre = document.getElementById('user-display').innerText;
    
    // Hablar primero (Usando el género seleccionado)
    hablar(`Buena suerte ${nombre}, que empiece el juego.`, () => {
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
        preguntasExamen = [...bancoPreguntas].sort(() => 0.5 - Math.random());
        iniciarInterfazQuiz();
    } 
    else {
        currentMode = 'exam';
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
    const btn = document.getElementById('btn-stats');
    if(btn.classList.contains('locked-btn')) return;
    
    await cargarGraficoFirebase();
    document.getElementById('stats-modal').classList.remove('hidden'); 
});

document.getElementById('btn-ranking').addEventListener('click', async () => {
    const btn = document.getElementById('btn-ranking');
    if(btn.classList.contains('locked-btn')) return;

    document.getElementById('ranking-modal').classList.remove('hidden');
    await cargarRankingGlobal();
});

document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.add('hidden');
        }
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
        if(config) {
            tiempoDeLaSala = config;
            alert(`Tiempo sincronizado con la sala: ${tiempoDeLaSala == 'infinity' ? 'Sin límite' : tiempoDeLaSala + ' min'}.`);
        }
    } else {
        await setDoc(salaRef, { configTiempo: tiempoDeLaSala }, { merge: true });
    }

    if (tiempoDeLaSala !== 'infinity') { tiempoRestante = parseInt(tiempoDeLaSala) * 60; } 
    else { tiempoRestante = -1; }

    const nick = document.getElementById('player-nickname').value || currentUserEmail.split('@')[0];
    const jugadorData = { name: nick, avatar: currentAvatarUrl };

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

document.getElementById('btn-leave-lobby').addEventListener('click', async () => {
    if (confirm("¿Abandonar escuadrón?")) {
        if (currentRoomId) location.reload();
    }
});

document.getElementById('btn-start-war').addEventListener('click', async () => {
    const salaRef = doc(db, "salas_activas", currentRoomId);
    await updateDoc(salaRef, { estado: 'jugando' });
});

function iniciarQuizMultiplayer() {
    if (unsubscribeRoom) unsubscribeRoom();
    preguntasExamen = [...bancoPreguntas].sort(() => 0.5 - Math.random());
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
    
    if (currentMode === 'study') mostrarResultadoInmediato(index);
    else document.getElementById('btn-next-question').classList.remove('hidden');
}

function mostrarResultadoInmediato(sel) {
    const correcta = preguntasExamen[indiceActual].respuesta;
    const btns = document.getElementById('options-container').querySelectorAll('button');
    btns.forEach(b => b.disabled = true);
    btns[correcta].classList.add('ans-correct', 'feedback-visible');
    if(sel !== correcta) btns[sel].classList.add('ans-wrong', 'feedback-visible');
    
    const div = document.createElement('div');
    div.className = 'explanation-feedback';
    div.innerHTML = `<strong>Explicación:</strong> ${pregunta.explicacion}`;
    document.getElementById('options-container').appendChild(div);
    
    respuestasUsuario.push(sel);
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
    const msg = currentMode === 'multiplayer' ? "¿Rendirse? Se registrará tu nota actual en la batalla." : "¿Rendirse? Se guardará tu intento.";
    if(confirm(msg)) terminarQuiz(true);
});

async function terminarQuiz(abandono = false) {
    const bgMusic = document.getElementById('bg-music');
    if(bgMusic) { bgMusic.pause(); bgMusic.currentTime = 0; }
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
        renderBattlePodium();
        document.getElementById('battle-results-modal').classList.remove('hidden');
    } else {
        document.getElementById('room-results-box').classList.add('hidden');
        document.getElementById('final-avatar-display').classList.add('hidden');
        
        if(currentMode === 'exam') {
            document.getElementById('btn-ranking').classList.remove('locked-btn');
            document.getElementById('btn-stats').classList.remove('locked-btn');
            
            await guardarHistorialFirebase(nota);
            await guardarPuntajeGlobal(nota);
        }
        showScreen('result-screen');
        document.getElementById('score-final').innerText = `${nota}/100`;
        
        const msg = document.getElementById('custom-msg');
        const sfxWin = document.getElementById('success-sound');
        const sfxFail = document.getElementById('fail-sound');
        const vol = document.getElementById('volume-slider').value;
        sfxWin.volume = vol; sfxFail.volume = vol;

        if (nota >= 70) sfxWin.play(); else sfxFail.play();

        msg.className = '';
        if (abandono) {
            msg.innerText = "Finalizado por usuario."; msg.style.color = "#ea4335";
        } else if (nota === 100) {
            msg.innerText = "¡LEGENDARIO! 🏆"; msg.style.color = "#28a745"; createConfetti();
        } else if (nota >= 70) {
            msg.innerText = "¡Misión Cumplida!"; msg.style.color = "#fbbc04";
        } else {
            msg.innerText = "Entrenamiento fallido."; msg.style.color = "#ea4335";
        }

        if (currentMode === 'study') document.getElementById('btn-review').classList.add('hidden');
        else document.getElementById('btn-review').classList.remove('hidden');
    }
}

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
            col.innerHTML = `
                <div class="podium-avatar" style="background-image: url('${p.avatar}'); background-size: cover;"></div>
                <div class="podium-name">${p.user}</div>
                <div class="podium-bar" style="height: ${height};">${p.score}</div>
            `;
            container.appendChild(col);
        });
    });
}

async function guardarHistorialFirebase(nota) {
    try {
        await addDoc(collection(db, "historial_academico"), {
            email: currentUserEmail,
            score: nota,
            date: new Date()
        });
    } catch (e) { console.error(e); }
}

async function guardarPuntajeGlobal(nota) {
    try {
        await addDoc(collection(db, "ranking_global"), {
            email: currentUserEmail,
            score: nota,
            date: new Date()
        });
    } catch (e) { console.error(e); }
}

async function cargarGraficoFirebase() {
    const q = query(collection(db, "historial_academico"), where("email", "==", currentUserEmail), orderBy("date", "desc"), limit(10));
    const querySnapshot = await getDocs(q);
    
    let history = [];
    querySnapshot.forEach((doc) => {
        history.push(doc.data());
    });
    history.reverse();

    const ctx = document.getElementById('progressChart').getContext('2d');
    if(window.myChart) window.myChart.destroy();
    window.myChart = new Chart(ctx, {
        type: 'line',
        data: { 
            labels: history.map((_, i) => `Intento ${i+1}`), 
            datasets: [{ 
                label: 'Nota', 
                data: history.map(x => x.score), 
                borderColor: '#1a73e8', 
                tension: 0.3, 
                fill: true, 
                backgroundColor: 'rgba(26,115,232,0.1)' 
            }] 
        },
        options: { scales: { y: { beginAtZero: true, max: 100 } } }
    });
}

async function cargarRankingGlobal() {
    const q = query(collection(db, "ranking_global"), orderBy("score", "desc"), limit(10));
    const querySnapshot = await getDocs(q);
    
    const list = document.getElementById('ranking-list');
    list.innerHTML = "";
    let pos = 1;
    querySnapshot.forEach((doc) => {
        const d = doc.data();
        list.innerHTML += `
        <div class="rank-row">
            <span class="rank-pos">#${pos}</span>
            <span class="rank-name">${d.email.split('@')[0]}</span>
            <span class="rank-score">${d.score} pts</span>
        </div>`;
        pos++;
    });
}

function createConfetti() {
    const w = document.getElementById('confetti-wrapper'); w.classList.remove('hidden'); w.innerHTML = '';
    const c = ['#1a73e8', '#34a853', '#fbbc04', '#ea4335'];
    for(let i=0; i<100; i++) {
        const d = document.createElement('div');
        d.style.position='absolute'; d.style.width='10px'; d.style.height='10px';
        d.style.backgroundColor = c[Math.floor(Math.random()*c.length)];
        d.style.left = Math.random()*100+'vw';
        d.style.animation = `fall ${Math.random()*3+2}s linear forwards`;
        w.appendChild(d);
    }
}

document.getElementById('volume-slider').addEventListener('input', (e) => {
    document.querySelectorAll('audio').forEach(a => { a.volume = e.target.value; a.muted = (e.target.value == 0); });
});
document.getElementById('btn-mute').addEventListener('click', () => {
    const audios = document.querySelectorAll('audio');
    const isMuted = !audios[0].muted;
    audios.forEach(a => a.muted = isMuted);
});
document.getElementById('close-stats').addEventListener('click', () => document.getElementById('stats-modal').classList.add('hidden'));
document.getElementById('close-ranking').addEventListener('click', () => document.getElementById('ranking-modal').classList.add('hidden'));

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
