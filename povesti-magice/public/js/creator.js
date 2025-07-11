import { contineCuvinteObscene, getCuvinteObsceneGasite } from './filtruLimbaj.js'
import { checkLoginStatus } from './session.js'

// Constante globale
const apiBase = 'http://localhost:3000/'
const token = localStorage.getItem('token')

// Variabilă globală
let storyIdEditare = null

// Verifică statusul de login la încărcarea paginii
checkLoginStatus()

// Funcție pentru a salva povestea creată sau editată
document.getElementById('storyForm').addEventListener('submit', async (e) => {
  e.preventDefault()

  const title = document.getElementById('storyTitle').value.trim()
  const style = document.getElementById('storyStyle').value
  const storyText = document.getElementById('storyText').value.trim()
  const imagesInput = document.getElementById('storyImages')

  // Verifică dacă titlul sau conținutul conțin cuvinte obscene
  if (contineCuvinteObscene(title) || contineCuvinteObscene(storyText)) {
    const cuvinte = getCuvinteObsceneGasite()
    showToast(`❌ Titlul sau conținutul poveștii conține cuvinte neadecvate: "${cuvinte.join(', ')}". Te rugăm să reformulezi!`, 'error')
    return
  }

  // Construire obiect FormData pentru upload imagini
  const formData = new FormData()
  formData.append('title', title)
  formData.append('style', style)
  formData.append('story', storyText)

  for (const file of imagesInput.files) {
    formData.append('images', file)
  }

  try {
    const endpoint = storyIdEditare
      ? `${apiBase}creator/story/update/${storyIdEditare}`
      : `${apiBase}creator/create`

    const method = 'POST'

    const response = await fetch(endpoint, {
      method: method,
      headers: {
        'Authorization': 'Bearer ' + token
      },
      body: formData
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'A apărut o eroare la salvare.')
    }

    const successMsg = storyIdEditare
    ? '✔️ Povestea a fost actualizată cu succes!'
    : '✔️ Povestea a fost salvată cu succes!'

    showToast(successMsg, 'success')

    storyForm.reset()
    document.querySelector('#storyForm h1').textContent = 'Scrie o poveste'
    storyIdEditare = null
    document.querySelector('#storyForm button[type="submit"]').textContent = 'Salvează povestea'

    const textarea = document.getElementById('storyText')
    textarea.style.height = 'auto'
  } catch (err) {
    showToast('❌ ' + err.message, 'error')
  }
})

// Funcție pentru a afișa în modal poveștile salvate în baza de date
async function fetchStories() {
  try {
    const response = await fetch(apiBase + 'creator/stories', {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token 
      }
    })

    if (!response.ok) {
      console.error('Eroare la preluarea poveștilor:', response.statusText)
      return
    }

    const storiesData = await response.json()
    const stories = storiesData.stories || []

    const list = document.getElementById('storiesList')

    // Verifică dacă poveștile sunt disponibile și le afișează
    list.innerHTML = stories.length
      ? stories.map(s => `
        <li class="list-group-item">
          <div class="story-text flex-grow-1">
            Povestea: <strong>${s.title}</strong><br>
            <small class="text-muted fst-italic">Stil: ${s.style}</small>
          </div>
          <div>
            <button class="btn btn-sm editeazaBtn px-3 py-2" data-id="${s.id}">Editează</button>
            <button class="btn btn-sm citesteBtn px-3 py-2" data-id="${s.id}">Citește</button>
            <button class="btn btn-sm btn-danger px-3 py-2 stergeBtn" data-id="${s.id}">Șterge</button>
          </div>
        </li>
      `).join('')
      : '<li class="list-group-item">Nu ai povești create!</li>'

    // Afișează modalul cu poveștile salvate
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('povestiModal'))
    modal.show()

  } catch (error) {
    console.error('Fetch error:', error)
  }
}

// Eveniment pentru butonul "Povești"
document.getElementById('stories-btn').addEventListener('click', async e => {
  e.preventDefault()
  await fetchStories()
})

// Funcție pentru a afișa/citi povestea din baza de date
async function citestePoveste(storyId) {
  try {
    const response = await fetch(apiBase + 'creator/story/' + storyId, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      }
    })

    if (!response.ok) {
      console.error('Eroare la preluarea poveștii:', response.statusText)
      return
    }

    const storyData = await response.json()
    const story = storyData.story

    let images = []
    try {
      images = story.images ? JSON.parse(story.images) : []
    } catch (e) {
      images = []
    }

    // Închide modalul cu lista de povești
    const modal = bootstrap.Modal.getInstance(document.getElementById('povestiModal'))
    modal.hide()

    // Afișează povestea în secțiunea principală
    document.getElementById('storyTitleAfisat').innerText = story.title
    document.getElementById('storyContentAfisat').innerText = story.story

    // Afișează imaginile atașate
    const carouselContainer = document.getElementById('carouselContainer')
    const carouselInner = document.getElementById('carouselInner')
    const carouselThumbnails = document.getElementById('carouselThumbnails')

    carouselInner.innerHTML = '' // Golim imaginile anterioare
    carouselThumbnails.innerHTML = '' // Golim miniaturile anterioare

    if (Array.isArray(images) && images.length > 0) {
      images.forEach((path, index) => {
        const imageUrl = apiBase + path.replace(/\\/g, '/').replace(/^.*?uploads\//, 'uploads/')

        // Imagine mare
        const img = document.createElement('img')
        img.src = imageUrl
        img.classList.add('d-block', 'w-100', 'img-carousel')
        img.alt = 'Imagine poveste ' + (index + 1)

        const carouselItem = document.createElement('div')
        carouselItem.classList.add('carousel-item')
        if (index === 0) carouselItem.classList.add('active')
        carouselItem.appendChild(img)
        carouselInner.appendChild(carouselItem)

        // Thumbnail
        const thumbnail = document.createElement('img')
        thumbnail.src = imageUrl
        thumbnail.classList.add('thumbnail-img')
        thumbnail.alt = 'Thumbnail ' + (index + 1)
        thumbnail.style.cursor = 'pointer'

        thumbnail.addEventListener('click', () => {
          const carousel = bootstrap.Carousel.getOrCreateInstance(document.getElementById('storyCarousel'))
          carousel.to(index)
        })

        carouselThumbnails.appendChild(thumbnail)
      })

      carouselContainer.style.display = 'block'
    } else {
      carouselContainer.style.display = 'none'
    }

    // Ascunde formularul și afișează povestea
    document.getElementById('storyForm').style.display = 'none'
    document.getElementById('citirePoveste').style.display = 'block'
  } catch (error) {
    console.error('Fetch error:', error)
  }
}

// Eveniment pentru butonul "Citește"
document.getElementById('storiesList').addEventListener('click', function (e) {
  if (e.target.classList.contains('citesteBtn')) {
    const storyId = e.target.getAttribute('data-id')
    citestePoveste(storyId)
  }
})

// Funcție pentru editare poveste
async function editeazaPoveste(id) {
  try {
    const response = await fetch(apiBase + 'creator/story/' + id, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      }
    })

    if (!response.ok) {
      const errorText = await response.json()
      console.error('Eroare la preluarea poveștii:', errorText)
      return
    }

    const storyData = await response.json()
    const story = storyData.story

    // Ascunde modalul
    const modal = bootstrap.Modal.getInstance(document.getElementById('povestiModal'))
    modal.hide()

    // Completează formularul cu datele poveștii
    document.getElementById('storyTitle').value = story.title
    document.getElementById('storyStyle').value = story.style
    document.getElementById('storyText').value = story.story

    // Schimbă textul secțiunii
    document.querySelector('#storyForm h1').textContent = 'Editează povestea'

    // Setează variabila globală pentru ID-ul poveștii
    storyIdEditare = story.id

    // Schimbă textul butonului
    document.querySelector('#storyForm button[type="submit"]').textContent = 'Actualizează povestea'

    // Afișează formularul, ascunde citirea poveștii
    document.getElementById('citirePoveste').style.display = 'none'
    document.getElementById('storyForm').style.display = 'flex'

  } catch (error) {
    console.error('Fetch error:', error)
  }
}

// Eveniment pentru butonul "Editează"
document.getElementById('storiesList').addEventListener('click', function (e) {
  if (e.target.classList.contains('editeazaBtn')) {
    const storyId = e.target.getAttribute('data-id')
    editeazaPoveste(storyId)
  }
})

// Eveniment pentru butonul "Șterge"
document.addEventListener('click', async e => {
  if (e.target.classList.contains('stergeBtn')) {
    const storyId = e.target.getAttribute('data-id')
    const confirmDelete = confirm('Ești sigur că vrei să ștergi această poveste?')

    if (!confirmDelete) return

    try {
      const deleteResponse = await fetch(apiBase + 'creator/delete/' + storyId, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        }
      })

      if (!deleteResponse.ok) {
        console.error('Eroare la ștergerea poveștii:', deleteResponse.statusText)
        return
      }

      showToast('Povestea a fost ștearsă cu succes!', 'success')

      // Reîncarcă listă de povești după ștergere
      fetchStories()
    } catch (err) {
      console.error('Eroare la ștergere:', err)
    }
  }
})