import express from 'express'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import bodyParser from 'body-parser'
import authRoutes from './routes/authRoutes.js'
import storyRoutes from './routes/storyRoutes.js'
import creatorRoutes from './routes/creatorRoutes.js'
import ttsRoutes from './routes/tts.js'
import realizariRoutes from './routes/realizariRoutes.js'
import cors from 'cors'
import dotenv from 'dotenv'
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Middleware pentru a parsa JSON și URL-encoded data
app.use(cors({ origin: 'http://localhost:3000', credentials: true }))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.json())

// Middleware pentru a servi fișiere statice (HTML, CSS, JS, imagini)
app.use(express.static(path.join(__dirname, '../public')))
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'))
})
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Rute
app.use('/auth', authRoutes)
app.use('/story', storyRoutes)
app.use('/creator', creatorRoutes)
app.use('/tts', ttsRoutes)
app.use('/realizari', realizariRoutes)

// Pornirea serverului
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})