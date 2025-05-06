import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
dotenv.config()

// Middleware pentru a verifica token-ul JWT
function authMiddleware (req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1] // Extrage token-ul din header-ul Authorization

  if (!token) {
    return res.status(401).json({ message: 'No token provided!' })
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('Eroare la verificarea token-ului:', err)
      return res.status(401).json({ message: 'Invalid token' })
    }
    req.userId = decoded.id
    next() // Trece la urmatorul endpoint
  })
}

export default authMiddleware
