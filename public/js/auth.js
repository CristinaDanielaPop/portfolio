let token = localStorage.getItem('token')

let isLoading = false
let isAuthenticating = false
let isRegistration = false

const apiBase = 'http://localhost:3000/'

// Elemente DOM
const authContent = document.getElementById('auth')
const textError = document.getElementById('error')
const email = document.getElementById('emailInput')
const password = document.getElementById('passwordInput')
const roleSelect = document.getElementById('roleSelect')
const avatar = document.getElementById('avatarSelection')
const avatarInput = document.getElementById('userAvatar')
const authBtn = document.getElementById('authBtn')
const registerBtn = document.getElementById('registerBtn')
const authTitle = document.getElementById('authTitle')
const authSubtext = document.getElementById('authSubtext')
const toggleText = document.getElementById('toggleText')

// Logica pentru a schimba textul între autentificare și înregistrare
async function toggleIsRegister() {
  isRegistration = !isRegistration  

  registerBtn.innerText = isRegistration ? 'Log in' : 'Sign up'
  authTitle.innerText = isRegistration ? 'Sign up' : 'Log in'
  authSubtext.innerText = isRegistration ? 'Creaza cont!' : 'Intra in cont!'
  toggleText.innerText = isRegistration ? 'Ai deja un cont?' : 'Nu ai un cont?'
  roleSelect.style.display = isRegistration ? 'block' : 'none'
  avatar.style.display = isRegistration ? 'block' : 'none'
}

// Selectarea avatarului
const avatarOptions = document.querySelectorAll('.avatar-option')
avatarOptions.forEach(option => {
  option.addEventListener('click', () => {
    // Scoate clasa selected de la toate
    avatarOptions.forEach(o => o.classList.remove('selected'))
    // Adaugă clasa selected la cel ales
    option.classList.add('selected')
    // Pune valoarea în inputul ascuns
    const selectedAvatar = option.getAttribute('data-avatar')
    document.getElementById('userAvatar').value = selectedAvatar
    textError.style.display = 'none'
  })
})

// Funcție helper pentru afișarea erorilor cu scroll automat
function showError(message) {
  textError.innerText = message
  textError.style.display = 'block'
  
  // Scroll automat la elementul de eroare
  textError.scrollIntoView({ 
    behavior: 'smooth', 
    block: 'center' 
  })
}

validateStrongPassword()

// Funcție pentru validarea parolei puternice
function validateStrongPassword(password) {
  // Verifică lungimea minimă
  if (password.length < 8) {
    return { isValid: false, message: '❌ Parola trebuie să aibă minim 8 caractere!' }
  }

  // Verifică să conțină cel puțin o literă mică
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: '❌ Parola trebuie să conțină cel puțin o literă mică!' }
  }

  // Verifică să conțină cel puțin o literă mare
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: '❌ Parola trebuie să conțină cel puțin o literă mare!' }
  }

  // Verifică să conțină cel puțin o cifră
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: '❌ Parola trebuie să conțină cel puțin o cifră!' }
  }

  // Verifică să conțină cel puțin un caracter special
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    return { isValid: false, message: '❌ Parola trebuie să conțină cel puțin un caracter special (!@#$%^&* etc.)!' }
  }

  return { isValid: true, message: '✓ Parolă puternică!' }
}

// Autentificare sau înregistrare
async function authenticate() {
  const emailVal = email.value
  const passVal = password.value
  const roleVal = roleSelect.value.trim()
  const avatarVal = document.getElementById('userAvatar').value.trim()

  // Verificări de validare pentru email
  if (isLoading || isAuthenticating || !emailVal || !emailVal.includes('@')) {
    showError('❌ Introdu o adresă de email validă!')
    textError.style.display = 'block'
    return
  }

  // Validare parolă îmbunătățită
  if (!passVal) {
    showError('❌ Parola este obligatorie!')
    textError.style.display = 'block'
    return
  }

  // Pentru înregistrare, folosim validarea strictă a parolei
  if (isRegistration) {
    const passwordValidation = validateStrongPassword(passVal)
    if (!passwordValidation.isValid) {
      showError(passwordValidation.message)
      return
    }
  } else {
    // Pentru login, verificăm doar lungimea minimă
    if (passVal.length < 6) {
      showError('❌ Parola trebuie să aibă minim 6 caractere!')
      textError.style.display = 'block'
      return
    }
  }

  // Verificare rol pentru înregistrare
  if (isRegistration && !roleVal) {
    showError('❌ Te rugăm să selectezi un rol!')
    textError.style.display = 'block'
    return
  }

  // Verificare avatar pentru înregistrare
  if (isRegistration && !avatarVal) {
    showError('❌ Te rugam sa alegi un avatar!')
    textError.style.display = 'block'
    return
  }

  // Resetează mesajul de eroare
  textError.style.display = 'none'
  isAuthenticating = true
  authBtn.innerText = 'Autentificare...'

  try {
    let data
    let response

    if (isRegistration) {
      // Creare cont
      response = await fetch(apiBase + 'auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: emailVal, password: passVal, role: roleVal, avatar: avatarVal})
      })

    } else {
      // Logare
      response = await fetch(apiBase + 'auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: emailVal, password: passVal })
      })
    }

    data = await response.json()

    // Verifică răspunsul serverului
    if (!response.ok) {
      const serverError = data.error || '❌ Ceva nu a mers bine...'
      throw new Error(serverError)
    }

    if (data.token) {
      token = data.token
      localStorage.setItem('token', token)
      localStorage.setItem('role', data.role)
      localStorage.setItem('avatar', data.avatar)

      // Afișează mesaj de succes și "Se încarcă..."  după login/înregistrare
      authBtn.innerText = 'Se încarcă...'
      authSubtext.innerText = isRegistration 
        ? '✔️ Cont creat cu succes!' 
        : '✔️ Logare reușită!'
      authSubtext.style.color = 'green'

      // Redirecționare la pagina principală după 1 secundă
      setTimeout(() => {
        if (data.role === 'creator') {
          window.location.href = 'indexCreator.html'
        } else {
          window.location.href = 'index.html'
        } 
      }, 1000)

    } else {
      throw Error('❌ Autentificare nereușită...')
    }

  // În caz de eroare, afișează mesajul corespunzător
  } catch (err) {
    console.error('Eroare la înregistrare:', err)
    const errorMessage = err.message.includes('❌ Acest email este deja folosit. Încearcă să te loghezi.')
      ? '❌ Acest email este deja folosit. Încearcă să te loghezi.'
      : err.message || '❌ Autentificare nereușită...'
    showError(errorMessage)
  } finally {
    authBtn.innerText = 'Submit'
    isAuthenticating = false
  }
}
