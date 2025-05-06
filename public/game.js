const buttonColours = ["red", "blue", "green", "yellow"]
let gamePattern = []
let userClickedPattern = []
let started = false
let level = 0

// Functie pentru pornirea jocului
$(document).keydown(function () { 
  if (!started) {
    $("#level-title").text("Level " + level)
    nextSequence()
    started = true
  }
})

// Functie pentru a gestiona apasarea butoanelor
$(".btn").click(function () { 
  let userChosenColour = $(this).attr("id")
  userClickedPattern.push(userChosenColour)

  playSound(userChosenColour)
  animatePress(userChosenColour)
  checkAnswer(userClickedPattern.length-1)
})

// Functie pentru a verifica raspunsul utilizatorului
function checkAnswer(currentLevel) {
  if (gamePattern[currentLevel] === userClickedPattern[currentLevel]) {
    console.log("success")

    if (userClickedPattern.length === gamePattern.length) {
      setTimeout(function () {
        nextSequence()
      }, 1000)
    }

  } else {
    console.log("wrong")
    playSound("wrong")

    $("body").addClass("game-over")
    setTimeout(function () { 
      $("body").removeClass("game-over")
     }, 200)

    $("#level-title").text("Game Over, Press any key to restart")

    saveScore(level)

    // Reset the game variables
    startOver()
  }
}

// Functie pentru a salva scorul in baza de date
function saveScore(level) {
  // Verificam daca scorul este 0 si nu il trimitem pentru salvare
  if (level === 0) {
    console.log("Your score is 0, it won't be saved.")
    showToast("Your score is 0, it won't be saved.", true) // Afiseaza mesaj de eroare
    return // Oprire functie daca scorul este 0
  }

  const token = localStorage.getItem('token')

  fetch('http://localhost:3000/score/saveScore', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ score: level })
  })
  .then(async response => {
    if (!response.ok) {
      const text = await response.text()
      console.error("Server status", response.status)
      console.error("Server response:", text)
      throw new Error('Error saving score!')
    }
    return response.json()
  })
  .then(data => {
    console.log('Score saved:', data)
    showToast("Score saved!") // Afiseaza mesaj de succes
  })
  .catch(error => {
    console.error('Error:', error)
    showToast("Error saving score!", true) // Afiseaza mesaj de eroare
  })
}

// Functie pentru a genera urmatoarea secventa
function nextSequence() {
  userClickedPattern = []
  level++
  $("#level-title").text("Level " + level)

  let randomNumber = Math.floor(Math.random() * 4)
  let randomChosenColour = buttonColours[randomNumber]
  gamePattern.push(randomChosenColour)

  $("#" + randomChosenColour).fadeIn(100).fadeOut(100).fadeIn(100)
  playSound(randomChosenColour)
}

// Functie pentru a reda sunetul corespunzator culorii
function playSound(name) {
  let audio = new Audio("sounds/" + name + ".mp3")
  audio.play()
}

// Functie pentru a anima butonul apasat
function animatePress(currentColour) {
  $("#" + currentColour).addClass("pressed")
  setTimeout(function () {
    $("#" + currentColour).removeClass("pressed")
  }, 100)
}

// Functie pentru a reseta jocul
function startOver() { 
  level = 0
  gamePattern = []
  started = false
}

// Functie pentru a afisa mesajul de toast
function showToast(message, isError = false) {
  const toastEl = document.getElementById('scoreToast')
  const toastBody = document.getElementById('toastMessage')

  toastBody.textContent = message

  // Schimba culoarea toastului in functie de succes/eroare
  if (isError) {
    toastEl.classList.remove("bg-success")
    toastEl.classList.add("bg-danger")
  } else {
    toastEl.classList.remove("bg-danger")
    toastEl.classList.add("bg-success")
  }

  const toast = new bootstrap.Toast(toastEl)
  toast.show()
}
