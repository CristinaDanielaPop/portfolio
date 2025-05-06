import express from 'express'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import bodyParser from 'body-parser'
import authRoutes from './routes/authRoutes.js'
import scoreRoutes from './routes/scoreRoutes.js'
import dotenv from 'dotenv'
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Middleware pentru a parse JSON si URL-encoded data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.json())

// Middleware pentru a servi fisiere statice (HTML, CSS, JS, imagini, sunete, etc.)
app.use(express.static(path.join(__dirname, '../public')))
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'))
})

// Rute
app.use('/auth', authRoutes)
app.use('/score', scoreRoutes)

// Pornirea serverului
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})