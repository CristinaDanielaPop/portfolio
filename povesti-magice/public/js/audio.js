// Constante globale
const apiBase = 'http://localhost:3000/'
const token = localStorage.getItem('token')

// Variabile globale 
let currentAudio = null
let isPaused = false

function stopAllAudio() {
  // Oprește audio dacă este în redare
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }
  
  // Resetează starea
  isPaused = false
  
  // Resetează toate butoanele de play și seek bar-urile
  const playButtons = document.querySelectorAll('.btn-play, #playBtn, #playBtnCreator')
  playButtons.forEach(btn => {
    if (btn) {
      btn.textContent = '🔊 Ascultă povestea'
      btn.disabled = false
    }
  })
  
  // Ascunde seek bar-urile
  const seekBars = document.querySelectorAll('#seekBar, #seekBarCreator')
  seekBars.forEach(bar => {
    if (bar) {
      bar.style.display = 'none'
      bar.value = 0
    }
  })
}

// Funcție pentru redare audio a poveștii
function redaPoveste(title, text, playBtnId = 'playBtn', seekBarId = 'seekBar') {
  const btn = document.getElementById(playBtnId)
  const seekBar = document.getElementById(seekBarId)

  // Dacă butonul nu există, se iese din funcție
  if (!btn) {
    console.error('Butonul de redare nu a fost găsit!', playBtnId)
    return
  }

  // Dacă audio-ul este deja încărcat pentru aceeași poveste
  if (currentAudio) {
    if (!currentAudio.paused) {
      currentAudio.pause()
      isPaused = true
      btn.innerText = '▶️ Reia povestea'
      return
    } else if (isPaused) {
      currentAudio.play()
      isPaused = false
      btn.innerText = '⏸️ Pauză'
      return
    }
  }

  // Oprește orice audio anterior
  stopAllAudio()

  // Schimbă textul butonului pentru a indica că se încarcă
  btn.innerText = '⏳ Se încarcă...'
  btn.disabled = true // Dezactivează butonul pentru a preveni clicuri multiple

  // Cerere pentru generarea audio
  fetch(apiBase + 'tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, text })
  })
  .then(response => response.blob())
  .then(audioBlob => {
    const audioUrl = URL.createObjectURL(audioBlob)
    currentAudio = new Audio(audioUrl)

    // Event listeners pentru audio
    currentAudio.addEventListener('canplay', () => {
      btn.disabled = false
      btn.innerText = '⏸️ Pauză'
    })

    // Când e încărcat audio-ul, setează durata maximă
    currentAudio.addEventListener('loadedmetadata', () => {
      if (seekBar) {
        seekBar.max = Math.floor(currentAudio.duration)
        seekBar.style.display = 'block'
      }
    })

    // Actualizează bara când se redă
    currentAudio.addEventListener('timeupdate', () => {
      if (seekBar) {
        seekBar.value = Math.floor(currentAudio.currentTime)
      }
    })

    // Când audio-ul se termină
    currentAudio.addEventListener('ended', () => {
      btn.innerText = '🔊 Ascultă povestea'
      btn.disabled = false
      isPaused = false
      if (seekBar) {
        seekBar.value = 0
      }
    })

    // Permite utilizatorului să caute în audio
    if (seekBar && !seekBar.hasAttribute('data-listener-added')) {
      seekBar.addEventListener('input', () => {
        if (currentAudio) {
          currentAudio.currentTime = seekBar.value
        }
      })
      seekBar.setAttribute('data-listener-added', 'true')
    }

    // Gestionează erorile de redare
    currentAudio.addEventListener('error', (e) => {
      console.error('Eroare la redarea audio:', e)
      btn.innerText = '🔊 Ascultă povestea'
      btn.disabled = false
      isPaused = false
    })

    currentAudio.play()
    isPaused = false

  })
  .catch(err => {
    console.error('Eroare la redare:', err)
    btn.innerText = '🔊 Ascultă povestea'
    btn.disabled = false
    isPaused = false
  })
}

export { stopAllAudio, redaPoveste }