// Constante globale
const apiBase = 'http://localhost:3000/'
const token = localStorage.getItem('token')

// Încarcă realizările
export async function loadRealizari() {
  try {
    const response = await fetch(apiBase + 'realizari/realizari', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (!response.ok) throw new Error('Eroare la încărcare')
    
    const realizari = await response.json()
    displayRealizari(realizari)
    
  } catch (error) {
    console.error('Eroare:', error)
    document.getElementById('realizariLista').innerHTML = 
      '<p class="text-danger">Eroare la încărcarea realizărilor.</p>'
  }
}

// Afișează realizările
function displayRealizari(realizari) {
  const container = document.getElementById('realizariLista')
  
  if (realizari.length === 0) {
    container.innerHTML = '<p class="text-muted">Nu ai încă realizări. Creează povești!</p>'
    return
  }
  
  const unlocked = realizari.filter(r => r.unlocked === 1).length
  
  let html = `
    <div class="mb-3">
      <h6>Progres: ${unlocked}/${realizari.length} realizări</h6>
      <div class="progress mb-3">
        <div class="progress-bar" style="width: ${(unlocked/realizari.length)*100}%"></div>
      </div>
    </div>
    <div class="row">
  `
  
  realizari.forEach(realizare => {
    const isUnlocked = Number(realizare.unlocked) === 1
    let progressHtml = ''
    
    if ((realizare.type === 'count' || realizare.type === 'style_count' || realizare.type === 'complex') && !isUnlocked) {
      progressHtml = `
        <small class="text-muted">Progres: ${realizare.progress || 0}/${realizare.required_count}</small>
        <div class="progress progress-sm">
          <div class="progress-bar bg-warning" style="width: ${((realizare.progress || 0) / realizare.required_count)*100}%"></div>
        </div>
      `
    }
    
    html += `
      <div class="col-12 mb-3">
        <div class="card shadow-sm ${isUnlocked ? 'border-success bg-light' : 'border-secondary bg-white'}">
          <div class="card-body text-center">
            <div style="font-size: 2rem; opacity: ${isUnlocked ? '1' : '0.3'}">${realizare.icon}</div>
            <h6 class="${isUnlocked ? 'text-success' : 'text-muted'}">${realizare.name}</h6>
            <p class="small ${isUnlocked ? 'text-dark' : 'text-muted'}">${realizare.description}</p>
            ${progressHtml}
            <span class="badge ${isUnlocked ? 'bg-success' : 'bg-secondary'}">
              ${isUnlocked 
                ? `Obtinut pe ${new Date(realizare.unlocked_at).toLocaleDateString('ro-RO')}` 
                : 'Blocat'}
            </span>
          </div>
        </div>
      </div>
    `
  })
  
  html += '</div>';
  container.innerHTML = html
}

// Afișează notificare pentru obțininerea unei realizări noi
export function showNotification(realizare) {
  const notification = document.createElement('div')
  notification.innerHTML = `
    <div class="alert alert-realizare alert-success position-fixed">
      <strong>🎉 Realizare nouă! 🎉</strong><br>
      ${realizare.icon} <strong>${realizare.name}</strong><br>
      <small>${realizare.description}</small>
    </div>
  `
  
  document.body.appendChild(notification)

  // Efect pentru ploaie de confetti pe tot ecranul
  let duration = 5000 // durata efectului de confetti
  let animationEnd = Date.now() + duration
  
  let defaults = { 
    startVelocity: 30, // viteza inițială a particulelor
    spread: 360, // direcție 360
    ticks: 60, // durata animației pentru fiecare particulă 
    zIndex: 9999 // afișează deasupra tuturor elementelor
  }

  // Pornește un interval care va rula la fiecare 200ms
  let interval = setInterval(() => {
    // Calculează timpul rămas până la finalul efectului
    let timeLeft = animationEnd - Date.now()

    // Dacă timpul s-a scurs, oprește efectul
    if (timeLeft <= 0) {
      clearInterval(interval)
      return
    }

    // Calculează numărul de particule în funcție de timpul rămas
    let particleCount = 50 * (timeLeft / duration)

    // Generează o ploaie de confetti dintr-o poziție aleatoare
    confetti(Object.assign({}, defaults, {
      particleCount,
      origin: { 
        x: Math.random(), // poziția orizontală
        y: Math.random() * 0.6 // poziția verticală
      }
    }))
  }, 200)
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove()
    }
  }, 6000)
}

// Eveniment pentru butonul "Realizări"
document.addEventListener('DOMContentLoaded', function() {
  const btn = document.getElementById('realizari-btn')
  if (btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault()
      loadRealizari()
      new bootstrap.Modal(document.getElementById('realizariModal')).show()
    })
  }
})
