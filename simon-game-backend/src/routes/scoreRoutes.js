import express from 'express'
import authMiddleware from '../middleware/authMiddleware.js'
import db from '../db.js'

const router = express.Router()

// Endpoint salvare scor
router.post('/saveScore', authMiddleware, (req, res) => {
  const { score } = req.body
  const userId = req.userId // Obtine userId din token-ul JWT

  // Log pentru a verifica scorul salvat
  if (!userId || score === null ) {
    console.error("Error saving score: Missing userId or score")
    return res.status(400).send("Missing userId or score")
  }
  
  const insertScore = db.prepare(`INSERT INTO scores (user_id, score) VALUES (?, ?)`)
  const result = insertScore.run(req.userId, score)

  res.json({id: result.lastInsertRowid, score, message: 'Score saved!'})

})

// Afisare scoruri
router.get('/scores', authMiddleware, (req, res) => {
  const getScores = db.prepare(`SELECT * FROM scores WHERE user_id = ? ORDER BY score DESC`)
  const scores = getScores.all(req.userId)
  res.json(scores)

  // Log pentru a verifica scorurile
  if (!scores) {
    return res.status(404).json({ error: 'No scores found!' })
  }
})

export default router