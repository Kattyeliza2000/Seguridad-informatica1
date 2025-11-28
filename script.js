// --- FUNCIONES DE BATALLA (REAL-TIME IMPLEMENTATION) ---
const salasActivasRef = collection(db, 'salas_activas');

async function iniciarBatalla() {
    console.log("Modo Batalla iniciado: Flujo real-time.");
    tempBattleID = generarIDTemporal();
    currentMode = 'multiplayer';
    
    document.getElementById('header-user-info').classList.remove('hidden'); 
    
    // Va a la pantalla de Avatar/Alias
    showScreen('avatar-screen'); 
    initAvatars(); 
    
    // ** CORRECCIÓN UX: COPIAR ALIAS **
    // Asegurar que el alias ya introducido se muestre aquí automáticamente.
    const playerNicknameInput = document.getElementById('player-nickname');
    if (playerNicknameInput && currentAlias) {
        playerNicknameInput.value = currentAlias;
    }
}
