import express from 'express'
import db from '../db.js'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import authMiddleware from '../middleware/authMiddleware.js'

const router = express.Router()

// Setare folder pentru upload imagini
const uploadFolder = './uploads'
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder)
}

// Configurare multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadFolder)
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname)
    const baseName = path.basename(file.originalname, ext)
    // Nume fișier unic
    cb(null, baseName + '-' + Date.now() + ext)
  }
})

const upload = multer({ storage })

// Endpoint pentru salvarea poveștii create cu imagini
router.post('/create', authMiddleware, upload.array('images', 10), (req, res) => {
  try {
    const { title, style, story } = req.body
    const userId = req.userId

    if (!userId || !title || !style || !story) {
      return res.status(400).json({ error: 'Lipsesc datele necesare.' })
    }

    // Extrage căile imaginilor în array
    let imagesPaths = []
    if (req.files && req.files.length > 0) {
      imagesPaths = req.files.map(file => file.path.replace(/\\/g, '/')) 
    }

    // Inserează povestea cu imaginile în baza de date
    const insertStory = db.prepare(`INSERT INTO stories (user_id, style, title, story, images) VALUES (?, ?, ?, ?, ?)`)
    const result = insertStory.run(userId, style, title, story, JSON.stringify(imagesPaths))
    const storyId = result.lastInsertRowid

    res.json({ id: storyId, message: 'Povestea a fost salvată cu succes!' })

  } catch (err) {
    console.error('Eroare salvare poveste creator:', err)
    res.status(500).json({ error: 'Eroare la salvarea poveștii.' })
  }
})

// Endpoint afișare listă povești salvate
router.get('/stories', authMiddleware, (req, res) => {
  const userId = req.userId // Obține userId din token-ul JWT

  // Obține toate poveștile salvate de utilizator
  const getAllStories = db.prepare(`SELECT * FROM stories WHERE user_id = ? order by created_at desc`)
  const stories = getAllStories.all(userId)

  // Trimite poveștile salvate ca răspuns
  res.json({ stories: stories })

})

// Endoint pentru citirea unei povești salvate
router.get('/story/:id', authMiddleware, (req, res) => {
  const storyId = req.params.id
  const userId = req.userId

  try {
    // Obține povestea din DB
    const getStory = db.prepare(`SELECT * FROM stories WHERE id = ? AND user_id = ?`)
    const story = getStory.get(storyId, userId)

    if (!story) {
      return res.status(404).json({ message: 'Povestea nu a fost gasită!' })
    }

    // Trimite răspunsul
    res.json({ story })

  } catch (error) {
    console.error('Eroare la preluarea poveștii:', error)
    res.status(500).json({ message: 'Eroare internă!' })
  }
})

// Endpoint pentru update/editează poveste
router.post('/story/update/:id', authMiddleware, upload.array('images'), (req, res) => {
  const storyId = req.params.id
  const userId = req.userId
  const { title, style, story } = req.body
  const images = req.files

  if (!title || !style || !story) {
    return res.status(400).json({ message: 'Toate câmpurile sunt obligatorii!' })
  }

  try {
    // Verifică dacă povestea aparține userului
    const existing = db.prepare('SELECT * FROM stories WHERE id = ? AND user_id = ?').get(storyId, userId)
    if (!existing) {
      return res.status(404).json({ message: 'Povestea nu a fost găsită sau nu îți aparține.' })
    }

    // Salvează noile imagini și le păstrează pe cele existente
    let imagesPaths = []

    // Încarcă imaginile vechi, dacă există și sunt valide
    if (existing.images && existing.images !== 'null') {
      try {
        const existingPaths = JSON.parse(existing.images)
        if (Array.isArray(existingPaths)) {
          imagesPaths = existingPaths
        }
      } catch (e) {
        console.warn('Imagini existente corupte sau goale', existing.images)
      }
    }

    // Adaugă noile imagini la listă
    if (images && images.length > 0) {
      const newImagePaths = images.map(file => file.path.replace(/\\/g, '/'))
      imagesPaths = imagesPaths.concat(newImagePaths)
    }

    // Log pentru confirmare
    console.log('Imagini salvate:', imagesPaths)

    // Actualizează în baza de date
    const update = db.prepare(`
      UPDATE stories
      SET title = ?, style = ?, story = ?, images = ?
      WHERE id = ? AND user_id = ?
    `)

    update.run(title, style, story, JSON.stringify(imagesPaths), storyId, userId)

    res.json({ message: 'Povestea a fost actualizată cu succes!' })

  } catch (error) {
    console.error('Eroare la actualizare:', error)
    res.status(500).json({ message: 'Eroare internă la actualizare!' })
  }
})

// Endpoint pentru a șterge poveștile salvate
router.delete('/delete/:id', authMiddleware, (req, res) => {
  const storyId = req.params.id
  const userId = req.userId

  try {
    // Preia imaginile din coloana images înainte de ștergere
    const getStory = db.prepare(`SELECT images FROM stories WHERE id = ? AND user_id = ?`)
    const story = getStory.get(storyId, userId)

    if (!story) {
      return res.status(404).json({ message: 'Povestea nu a fost găsită.' })
    }

    // Ștergem fișierele imaginilor
    if (story.images) {
      try {
        const imagesArray = JSON.parse(story.images)  // images e stocat ca JSON array în DB
        imagesArray.forEach(imagePath => {

          // Curățăm calea - dacă începe cu 'uploads/', o eliminăm
          let cleanImagePath = imagePath
          if (imagePath.startsWith('uploads/') || imagePath.startsWith('uploads\\')) {
            cleanImagePath = imagePath.substring(8) 
          }

          // Construim calea absolută spre fișier
          const absolutePath = path.join(process.cwd(), 'uploads', cleanImagePath)

          if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath) // Ștergem fișierul
            console.log('Imagine ștearsă cu succes:', imagePath) // Debug
          }
        })
      } catch (err) {
        console.warn('Format invalid la imaginile din DB, nu s-au putut șterge fișierele:', err)
      }
    }

    // Ștergem povestea din baza de date
    const deleteStory = db.prepare(`DELETE FROM stories WHERE id = ? AND user_id = ?`)
    const result = deleteStory.run(storyId, userId)

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Povestea nu a fost găsită.' })
    }

    res.json({ message: 'Poveste ștearsă cu succes.' })
  } catch (error) {
    console.error('Eroare la ștergerea poveștii:', error)
    res.status(500).json({ message: 'Eroare la ștergerea poveștii!' })
  }
})

export default router