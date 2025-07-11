import { checkLoginStatus } from './session.js'
import { stopAllAudio, redaPoveste } from './audio.js'
import { contineCuvinteObscene, getCuvinteObsceneGasite } from './filtruLimbaj.js'
import { loadRealizari, showNotification } from './realizari.js'

// Constante globale
const apiBase = 'http://localhost:3000/'
const token = localStorage.getItem('token')

// Verifică statusul de login la încărcarea paginii
checkLoginStatus()

//
// Logica pentru formularul de generare a poveștii
//

// Se așteaptă încărcarea completă a paginii
document.addEventListener('DOMContentLoaded', () => {
  // Se preiau elementele necesare din DOM
  const form = document.getElementById('storyForm')
  const output = document.getElementById('storyOutput')
  const storyTitle = document.getElementById('storyTitle')
  const storyText = document.getElementById('storyText')
  const saveBtn = document.getElementById('saveBtn')
  const playBtn = document.getElementById('playBtn')

  // Obiect pentru stocarea poveștii curente ( pentru salvare sau redare )
  let currentStory = {
    title: '',
    text: '',
    keywords: '',
    style: ''
  }

  // Adaugă evenimentul de submit pentru formularul de generare a poveștii
  form.addEventListener('submit', async (e) => {
    e.preventDefault() // Previne reîncărcare paginii
    const keywords = document.getElementById('keywords').value
    const style = document.getElementById('storyStyle').value

    // Verifică dacă cuvintele cheie introduse conțin cuvinte obscene
    if (contineCuvinteObscene(keywords)) {
      const cuvinte = getCuvinteObsceneGasite()
      storyText.innerText = `Te rugăm să folosești un limbaj adecvat! Cuvinte obscene găsite: "${cuvinte.join(', ')}".`
      output.hidden = false
      return
    }

    // Efect de loading pe buton
    generateBtn.disabled = true
    generateBtnText.innerHTML = `
      <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...
    `

    // Afișează containerul pentru poveste
    output.hidden = false
    storyTitle.innerText = ''
    storyText.innerText = 'Se generează povestea...'
    saveBtn.style.display = 'none'

    // Cerere POST către server pentru generarea poveștii
    try {
      const response = await fetch(apiBase + 'story/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, style })
      })

      // Așteaptă răspunsul serverului
      const data = await response.json()
      if (data.story) {

        // Afișează povestea generată
        storyTitle.innerText = data.title
        storyText.innerText = data.story //linii noi

        // Afișează butonul pentru salvarea poveștii după ce a fost generată
        saveBtn.style.display = 'inline-block'

        // Dacă butonul de redare audio există, îl afișează și setează acțiunea de click
        if (playBtn) {
          playBtn.style.display = 'inline-block'
          playBtn.onclick = () => redaPoveste(data.title, data.story)
        }

        // Salvează datele actuale ale poveștii într-un obiect pentru folosire ulterioară
        currentStory = { 
          title: data.title,
          text: data.story,
          keywords: keywords,
          style: style
        }

      } else {
        // Dacă nu s-a generat povestea, afișează un mesaj de eroare
        storyText.innerText = 'Nu s-a putut genera povestea.'
      }
    } catch (err) {
      // În caz de eroare de rețea sau server, afișează mesaj de eroare
      storyText.innerText = 'Eroare la comunicarea cu serverul.'
    }

    // Revenire buton la normal
    generateBtn.disabled = false
    generateBtnText.innerText = 'Generează poveste'
  })

  // Evenimentul pentru butonul de salvare
  saveBtn.addEventListener('click', async () => { 

    // Verifică dacă utilizatorul este autentificat (are token)
    if(!token) {
      // Afișează mesaj și redirecționează către pagina de autentificare
      if (confirm('Pentru a salva povestea trebuie să fii logat. Vrei să te autentifici acum?')) {
        // Salvează povestea curentă în localStorage pentru a o păstra după login
        localStorage.setItem('pendingStory', JSON.stringify(currentStory))
        // Redirecționează către pagina de login
        window.location.href = 'auth.html' 
      }
      return
    }

    // Cerere POST către server pentru a salva povestea
    try {
      const response = await fetch(apiBase + 'story/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          keywords: currentStory.keywords,
          style: currentStory.style,
          title: currentStory.title,
          story: currentStory.text
        })
      })

      // Așteaptă răspunsul serverului
      const data = await response.json()

      // Dacă salvarea a fost cu succes, afișează mesaj de succes și ascunde butonul de salvare
      if (response.ok) {
        showToast(data.message || 'Poveste salvată cu succes!', 'success')
        saveBtn.style.display = 'none'

        const noiRealizari = data.realizari || []
        noiRealizari.forEach(showNotification)
        loadRealizari()

      } else {
        // Dacă salvarea nu a fost efectuată, afișează un mesaj de eroare
        showToast(data.error || 'Nu s-a putut salva povestea.', 'error')
      }
    } catch (err) {
      // În caz de eroare la comunicarea cu serverul afișează un mesaj de eroare
      console.error('Eroare la salvare:', err)
      showToast('Eroare la conectarea cu serverul.', 'error')
    }
  })

  // Verifică dacă există o poveste salvată în localStorage (după login)
  const pendingStory = localStorage.getItem('pendingStory')
  if (pendingStory && token) {
    try {
      const story = JSON.parse(pendingStory)
      // Afișează povestea salvată
      output.hidden = false
      storyTitle.innerText = story.title
      storyText.innerText = story.text
      saveBtn.style.display = 'inline-block'
      
      // Setează valorile în formular
      document.getElementById('keywords').value = story.keywords
      document.getElementById('storyStyle').value = story.style
      
      currentStory = story
      
      // Șterge povestea din localStorage
      localStorage.removeItem('pendingStory')
      
      // Afișează mesaj că utilizatorul poate salva povestea acum
      showToast('Acum poți salva povestea generată anterior!', 'success')
      
    } catch (err) {
      console.error('Eroare la încărcarea poveștii salvate:', err)
      localStorage.removeItem('pendingStory')
    }
  }
})
 
// Eveniment pentru butonul "Șterge"
document.addEventListener('click', async e => {
  if (e.target.classList.contains('stergeBtn')) {
    const storyId = e.target.getAttribute('data-id')
    const confirmDelete = confirm('Ești sigur că vrei să ștergi această poveste?')

    if (!confirmDelete) return

    try {
      const deleteResponse = await fetch(apiBase + 'story/delete/' + storyId, {
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

      showToast('✔️ Povestea a fost ștearsă cu succes!', 'success')

      // Reîncarcă listă de povești după ștergere
      fetchStories()
    } catch (err) {
      console.error('Eroare la ștergere:', err)
    }
  }
})

//
// Gestionare povești utilizator
//

// Funcție pentru a afișa în modal poveștile salvate în baza de date
async function fetchStories() {
  try {
    // Oprește orice audio în curs
    stopAllAudio()

    const response = await fetch(apiBase + 'story/stories', {
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
            <button class="btn btn-sm citesteBtn px-3 py-2" data-id="${s.id}">Citește</button>
            <button class="btn btn-sm btn-danger px-3 py-2 stergeBtn" data-id="${s.id}">Șterge</button>
          </div>
        </li>`).join('')
      : '<li class="list-group-item text-center">Nu ai povești salvate!</li>'

    // Afișează modalul cu poveștile salvate
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('povestiModal'))
    modal.show()

  } catch (error) {
    console.error('Fetch error:', error)
  }
}

// Eveniment pentru butonul "Poveștile mele"
document.getElementById('stories-btn').addEventListener('click', async e => {
  e.preventDefault()
  await fetchStories()
})

// Funcție pentru a afișa/citi povestea din baza de date
async function citestePoveste(storyId) {
  document.getElementById('storyOutput').hidden = true
  document.getElementById('citirePoveste').style.display = 'none'
  
  try {
    console.log('Token trimis:', token);  // Verifică token-ul
    const response = await fetch(apiBase + 'story/story/' + storyId, {
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
    const playBtn = document.getElementById('playBtn')

    // Închide modalul cu lista de povești
    const modal = bootstrap.Modal.getInstance(document.getElementById('povestiModal'))
    modal.hide()

    // Afișează povestea în secțiunea principală
    document.getElementById('storyTitle').innerText = story.title
    document.getElementById('storyText').innerText = story.story

    // Configurează butonul de redare audio
    if (playBtn) {
      playBtn.style.display = 'inline-block'
      playBtn.onclick = () => redaPoveste(story.title, story.story)
    }

    document.getElementById('storyOutput').hidden = false

    // Ascunde butonul de "Salvează", pentru că povestea e deja salvată
    document.getElementById('saveBtn').style.display = 'none'
  } catch (error) {
    console.error('Fetch error:', error)
  }
}

// Eveniment pentru butonul "Citește"
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('storiesList').addEventListener('click', async e => {
    if (e.target && e.target.classList.contains('citesteBtn')) {
      const storyId = e.target.getAttribute('data-id')
      if (storyId) {
        await citestePoveste(storyId)
      }
    }
  })
})

//
// Gestionare povești de la creatori
//

// Funcție pentru a afișa în modal poveștile salvate de creatori în baza de date
async function fetchCreatorStories() {
  try {
    // Oprește orice audio în curs
    stopAllAudio()

    const response = await fetch(apiBase + 'story/creatorStories', {
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
    const stories = storiesData.stories

    const list = document.getElementById('storiesList')

    // Actualizează titlul modalului
    document.getElementById('povestiModalLabel').textContent = 'Povești de la creatori'

    // Verifică dacă poveștile sunt disponibile și le afișează
    list.innerHTML = stories.length
      ? stories.map(s => `
        <li class="list-group-item">
          <div class="story-text flex-grow-1">
            Povestea: <strong>${s.title}</strong><br>
            <small class="text-muted fst-italic">Stil: ${s.style}</small>
          </div>
          <div>
            <button class="btn btn-sm citeste-btn px-3 py-2" data-id="${s.id}">Citește</button>
          </div>
        </li>
      `).join('')
      : '<li class="list-group-item">Nu sunt povești de la creatori!</li>'

    // Afișează modalul cu poveștile salvate
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('povestiModal'))
    modal.show()

  } catch (error) {
    console.error('Fetch error:', error)
  }
}

// Eveniment pentru butonul "Descoperă"
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('descopera-btn')
  if (btn) {
    btn.addEventListener('click', async e => {
      e.preventDefault()
      await fetchCreatorStories()
    })
  }
})

// Funcție pentru a afișa/citi povestea creatorului din baza de date
async function citestePovesteCreator(storyId) {
  document.getElementById('storyOutput').hidden = true
  document.getElementById('citirePoveste').style.display = 'none' 

  try {
    const response = await fetch(apiBase + 'story/creatorStory/' + storyId, {
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

    const playBtn = document.getElementById('playBtnCreator')

    // Închide modalul cu lista de povești
    const modal = bootstrap.Modal.getInstance(document.getElementById('povestiModal'))
    modal.hide()

    // Afișează povestea în secțiunea de citire 
    document.getElementById('storyTitleAfisat').innerText = story.title
    document.getElementById('storyContentAfisat').innerText = story.story
    
    // Configurează butonul de redare audio
    if (playBtn) {
      playBtn.style.display = 'inline-block'
      playBtn.onclick = () => {
        console.log('Buton asculta povestea creatorului apasat')
        redaPoveste(story.title, story.story, 'playBtnCreator', 'seekBarCreator')
      }
    }

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
    document.getElementById('formTitle').style.display = 'none'
    document.getElementById('storyForm').style.display = 'none'
    document.getElementById('citirePoveste').style.display = 'block'

  } catch (error) {
    console.error('Eroare fetch:', error)
  }
}

// Eveniment pentru butonul "Citește"
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('storiesList').addEventListener('click', async e => {
    if (e.target && e.target.classList.contains('citeste-btn')) {
      const storyId = e.target.getAttribute('data-id')
      if (storyId) {
        await citestePovesteCreator(storyId)
      }
    }
  })
})