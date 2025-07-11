// Verificare status login
function checkLoginStatus() {
  let loggedIn = localStorage.getItem('token') !== null

  function showElem(id) {
    const elem = document.getElementById(id)
    if (elem) elem.style.display = 'inline-block'
  }

  function hideElem(id) {
    const elem = document.getElementById(id)
    if (elem) elem.style.display = 'none'
  }

  const avatar = localStorage.getItem('avatar')
  const avatarImg = document.getElementById('user-avatar')
  const avatarContainer = document.getElementById('avatar-container')

  if (loggedIn) {
    hideElem('login-btn')
    showElem('navbar-brand')
    showElem('realizari-btn')
    showElem('descopera-btn')
    showElem('stories-btn')
    showElem('logout-btn')

    // Afișează avatarul
    if (avatar && avatarImg && avatarContainer) {
      avatarImg.src = `avatars/${avatar || 'default-avatar'}.png`
      avatarContainer.classList.remove('hidden')
    }
  } else {
    showElem('navbar-brand')
    hideElem('realizari-btn')
    hideElem('descopera-btn')
    hideElem('stories-btn')
    hideElem('logout-btn')
    showElem('login-btn')

    // Ascunde avatarul
    if (avatarContainer) {
      avatarContainer.classList.add('hidden')
    }
  }
}
export { checkLoginStatus }