import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from '../db.js'
import dotenv from 'dotenv'
dotenv.config()

const router = express.Router()

// Endpoint pentru creare cont /auth/register
router.post('/register', (req, res) => {
  const { username, password } = req.body
  const hashedPassword = bcrypt.hashSync(password, 8) // Criptare parola

  try {
    // Verificam daca userul exista deja
    const checkUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
    if (checkUser) {
      return res.status(409).json({ error: 'Email deja folosit' })
    }

    // Inregistram userul in baza de date
    const insertUser =  db.prepare(`INSERT INTO users (username, password) VALUES (?, ?)`)
    const result = insertUser.run(username, hashedPassword)

    // Creare token 
    const token = jwt.sign({id: result.lastInsertRowid}, process.env.JWT_SECRET, 
      { expiresIn: '24h' })
    res.status(201).json({ message: 'User created successfully', token })

  } catch (err) {
    res.status(500).json({ error: 'Eroare la crearea contului' })
  }
})

// Endpoint pentru login /auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body

  try {
    const getUser = db.prepare('SELECT * FROM users WHERE username = ?')
    const user = getUser.get(username)

    // Verificam daca userul exista
    if (!user) {
      return res.status(401).send({ message: 'User not found' })
    }

    const passwordIsValid = bcrypt.compareSync(password, user.password)
    // Verificam daca parola este corecta
    if (!passwordIsValid) {
      return res.status(401).send({ message: 'Invalid password' })
    }
    console.log(user)

    // Creare token JWT
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, 
      { expiresIn: '24h'})
    res.json({ token: token })

  } catch (err) {
    console.error(err)
    res.sendStatus(503)
  }
})

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy() // Distrugem sesiunea utilizatorului
  res.status(200).json({ message: 'Logout successful' })
})

export default router