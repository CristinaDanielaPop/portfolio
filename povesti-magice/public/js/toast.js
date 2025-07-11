// Funcție pentru a afișa un mesaj în toast
function showToast(message, type = 'success') {
  const toastMessage = document.getElementById('toastMessage')
  const toastElement = document.getElementById('storyToast')

  toastMessage.innerText = message

  // Adaugă clasa corespunzatoare tipului
  if (type === 'success') {
    toastElement.classList.add('toast-success')
  } else if (type === 'error') {
    toastElement.classList.add('toast-error')
  }

  // Afișează toastul
  const toast = new bootstrap.Toast(toastElement)
  toast.show()
}