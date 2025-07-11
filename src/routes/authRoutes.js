import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from '../db.js'
import dotenv from 'dotenv'
dotenv.config()

const router = express.Router()

// Endpoint pentru creare cont /auth/register
router.post('/register', (req, res) => {
  const { username, password, role, avatar } = req.body

  // Verificare că toate câmpurile sunt completate
  if (!username || !password || !role || !avatar) {
    return res.status(400).json({ error: 'Toate câmpurile sunt obligatorii!' })
  }

  const roluriPermise = ['user', 'creator']

  if (!roluriPermise.includes(role)) {
  return res.status(400).json({ error: 'Rol invalid!' })
  }

  const hashedPassword = bcrypt.hashSync(password, 8) // Criptare parolă

  try {
    // Verifică dacă userul există deja
    const checkUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
    if (checkUser) {
      return res.status(409).json({ error: '❌ Acest email este deja folosit. Încearcă să te loghezi.' })
    }

    // Înregistrăm userul în baza de date
    const insertUser =  db.prepare(`INSERT INTO users (username, password, role, avatar) VALUES (?, ?, ?, ?)`)
    const result = insertUser.run(username, hashedPassword, role, avatar)

    // Obține user din db pe baza ID-ului nou
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid)

    // Creare token 
    const token = jwt.sign({id: result.lastInsertRowid}, process.env.JWT_SECRET,  
      { expiresIn: '24h' })
    res.json({ token: token, role: user.role, avatar: user.avatar })
    
  } catch (err) {
    console.error('Eroare la crearea contului:', err)
    res.status(500).json({ error: 'Eroare la crearea contului' })
  }
})

// Endpoint pentru login /auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body

  try {
    const getUser = db.prepare('SELECT * FROM users WHERE username = ?')
    const user = getUser.get(username)

    // Verifică dacă utilizatorul există
    if (!user) {
      return res.status(401).send({ message: 'Contul nu a fost găsit!' })
    }

    const passwordIsValid = bcrypt.compareSync(password, user.password)
    // Verifică dacă parola este corectă
    if (!passwordIsValid) {
      return res.status(401).send({ message: 'Parolă invalidă!' })
    }
    console.log(user)

    // Creare token JWT
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, 
      { expiresIn: '24h'})
    res.json({ token: token, role: user.role, avatar: user.avatar })

  } catch (err) {
    console.error(err)
    res.sendStatus(503)
  }
})

export default router