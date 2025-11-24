// Base de datos de preguntas de Seguridad Informática
const preguntas = [
    {
        texto: "¿Cuál de los siguientes NO es un pilar de la triada CIA?",
        opciones: ["Confidencialidad", "Integridad", "Autenticación", "Disponibilidad"],
        respuesta: 2 // El índice de la respuesta correcta (empieza en 0)
    },
    {
        texto: "¿Qué tipo de ataque utiliza ingeniería social para engañar a usuarios?",
        opciones: ["DDoS", "Phishing", "SQL Injection", "Man-in-the-Middle"],
        respuesta: 1
    },
    {
        texto: "¿Qué herramienta se usa comúnmente para el análisis de paquetes de red?",
        opciones: ["Photoshop", "Wireshark", "Excel", "Visual Studio"],
        respuesta: 1
    },
    {
        texto: "¿Qué puerto utiliza por defecto el protocolo HTTPS?",
        opciones: ["80", "21", "443", "22"],
        respuesta: 2
    },
    {
        texto: "En criptografía, ¿qué clave se comparte públicamente en un sistema asimétrico?",
        opciones: ["Clave Privada", "Clave Pública", "Clave Maestra", "Clave de Sesión"],
        respuesta: 1
    }
];

let indiceActual = 0;
let puntaje = 0;
let tiempoRestante = 0;
let intervaloTiempo;

// Referencias al HTML
const setupScreen = document.getElementById('setup-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const timerDisplay = document.getElementById('timer-display');

// Botón Empezar
document.getElementById('btn-start').addEventListener('click', () => {
    const tiempoSeleccionado = document.getElementById('time-select').value;
    
    // Configurar tiempo
    if (tiempoSeleccionado !== 'infinity') {
        tiempoRestante = parseInt(tiempoSeleccionado) * 60;
        iniciarReloj();
    } else {
        timerDisplay.innerText = "--:--";
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
    questionText.innerText = `${indiceActual + 1}. ${data.texto}`;
    optionsContainer.innerHTML = '';

    data.opciones.forEach((opcion, index) => {
        const btn = document.createElement('button');
        btn.innerText = opcion;
        btn.onclick = () => verificarRespuesta(index, btn);
        optionsContainer.appendChild(btn);
    });

    document.getElementById('progress-display').innerText = `Pregunta ${indiceActual + 1} de ${preguntas.length}`;
}

function verificarRespuesta(indiceSeleccionado, btn) {
    const correcta = preguntas[indiceActual].respuesta;
    const botones = optionsContainer.querySelectorAll('button');

    // Deshabilitar todos los botones para que no elija otra vez
    botones.forEach(b => b.disabled = true);

    if (indiceSeleccionado === correcta) {
        btn.classList.add('correct');
        puntaje++;
    } else {
        btn.classList.add('incorrect');
        // Mostrar cuál era la correcta
        botones[correcta].classList.add('correct');
    }

    // Esperar 1.5 segundos y pasar a la siguiente
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
        timerDisplay.innerText = `${minutos}:${segundos < 10 ? '0' : ''}${segundos}`;

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