import express from 'express'
import authMiddleware from '../middleware/authMiddleware.js'
import db from '../db.js'

const router = express.Router()

// Ruta GET obține realizările utilizatorului
router.get('/realizari', authMiddleware, (req, res) => {
  try {
    const userId = req.userId

    // Verifică realizările înainte de a le afișa
    checkRealizari(userId)
    
    // Obține toate realizările cu statusul lor pentru utilizator
    const realizari = db.prepare(`
      SELECT 
        r.*,
        CASE WHEN ur.user_id IS NOT NULL THEN 1 ELSE 0 END as unlocked,
        ur.unlocked_at
      FROM realizari r
      LEFT JOIN user_realizari ur ON r.id = ur.realizare_id AND ur.user_id = ?
      ORDER BY unlocked DESC, r.id ASC
    `).all(userId)
    
    // Obține numărul de povești
    const storyCount = db.prepare('SELECT COUNT(*) as count FROM stories WHERE user_id = ?').get(userId).count
    
    // Adaugă progresul pentru realizări
    realizari.forEach(realizare => {
      if (realizare.type === 'count') {
        realizare.progress = Math.min(storyCount, realizare.required_count)
      }

      // Progres pentru style_count
      if (realizare.type === 'style_count' && realizare.keyword) {
        const styleCount = db.prepare(`
          SELECT COUNT(*) as count 
          FROM stories 
          WHERE user_id = ? AND style = ? COLLATE NOCASE
        `).get(userId, realizare.keyword).count

        realizare.progress = Math.min(styleCount, realizare.required_count)
      }

      // Progres pentru complex cu DISTINCT(...)
      if (realizare.type === 'complex' && realizare.keyword?.includes('DISTINCT(')) {
        const match = realizare.keyword.match(/DISTINCT\((.*?)\)\s*>=\s*(\d+)/)
        if (match) {
          const field = match[1].trim()
          const required = parseInt(match[2])

          try {
            const count = db.prepare(`
              SELECT COUNT(DISTINCT ${field}) as count 
              FROM stories 
              WHERE user_id = ?
            `).get(userId).count

            realizare.progress = Math.min(count, required)
          } catch (error) {
            console.error('Eroare la calculul progresului pentru complex:', error)
          }
        }
      }
      
    })
    
    res.json(realizari)
    
  } catch (error) {
    console.error('Eroare ruta GET /realizari:', error)
    res.status(500).json({ error: 'Eroare la obținerea realizărilor' })
  }
})

// Funcție pentru verificarea realizărilor 
export function checkRealizari(userId, storyContent = '', storyStyle = '', keywordsInput = '') {
  const newUnlocks = []
  
  try {
    // Verifică realizările de tip count
    const storyCount = db.prepare('SELECT COUNT(*) as count FROM stories WHERE user_id = ?').get(userId).count
    
    const countRealizari = db.prepare(`
      SELECT r.* FROM realizari r 
      WHERE r.type = 'count' 
      AND r.id NOT IN (SELECT realizare_id FROM user_realizari WHERE user_id = ?)
    `).all(userId)
    
    countRealizari.forEach(realizare => {
      if (storyCount >= realizare.required_count) {
        try {
          db.prepare(`INSERT INTO user_realizari (user_id, realizare_id, unlocked_at) VALUES (?, ?, datetime('now'))`).run(userId, realizare.id)
          newUnlocks.push(realizare)
        } catch (error) {
          console.error('Eroare la salvarea realizării:', error)
        }
      }
    })
    
    // Verifică realizările de tip keyword
    if (storyContent) {
      const keywordRealizari = db.prepare(`
        SELECT r.* FROM realizari r 
        WHERE r.type = 'keyword' 
        AND r.id NOT IN (SELECT realizare_id FROM user_realizari WHERE user_id = ?)
      `).all(userId)
      
      keywordRealizari.forEach(realizare => {
        if (realizare.keyword && keywordsInput.toLowerCase().split(/[\s,]+/).includes(realizare.keyword.toLowerCase())) {
          try {
            db.prepare(`INSERT INTO user_realizari (user_id, realizare_id, unlocked_at) VALUES (?, ?, datetime('now'))`).run(userId, realizare.id)
            newUnlocks.push(realizare)
          } catch (error) {
            console.error('Eroare la salvarea realizării keyword:', error)
          }
        }
      })
    }

    // Verifică realizările de tip STYLE
    if (storyStyle) {
      const styleRealizari = db.prepare(`
        SELECT r.* FROM realizari r 
        WHERE r.type = 'style' 
        AND r.id NOT IN (SELECT realizare_id FROM user_realizari WHERE user_id = ?)
      `).all(userId)
      
      styleRealizari.forEach(realizare => {
        if (realizare.keyword && storyStyle.toLowerCase() === realizare.keyword.toLowerCase()) {
          try {
            db.prepare(`INSERT INTO user_realizari (user_id, realizare_id, unlocked_at) VALUES (?, ?, datetime('now'))`).run(userId, realizare.id)
            newUnlocks.push(realizare)
          } catch (error) {
            console.error('Eroare la salvarea realizării style:', error)
          }
        }
      })
    }

    // Verifică realizările de tip STYLE_COUNT
    const styleCountRealizari = db.prepare(`
      SELECT r.* FROM realizari r 
      WHERE r.type = 'style_count' 
      AND r.id NOT IN (SELECT realizare_id FROM user_realizari WHERE user_id = ?)
    `).all(userId)
    
    styleCountRealizari.forEach(realizare => {
      if (realizare.keyword) {
        const styleCount = db.prepare(`
          SELECT COUNT(*) as count FROM stories 
          WHERE user_id = ? AND style = ? COLLATE NOCASE
        `).get(userId, realizare.keyword).count
        
        if (styleCount >= realizare.required_count) {
          try {
            db.prepare(`INSERT INTO user_realizari (user_id, realizare_id, unlocked_at) VALUES (?, ?, datetime('now'))`).run(userId, realizare.id)
            newUnlocks.push(realizare)
          } catch (error) {
            console.error('Eroare la salvarea realizării style_count:', error)
          }
        }
      }
    })

    // Verifică realizările de tip COMPLEX
    const complexRealizari = db.prepare(`
      SELECT r.* FROM realizari r 
      WHERE r.type = 'complex' 
      AND r.id NOT IN (SELECT realizare_id FROM user_realizari WHERE user_id = ?)
    `).all(userId)
    
    complexRealizari.forEach(realizare => {
      let shouldUnlock = false

      if (realizare.keyword) {
        const match = realizare.keyword.match(/DISTINCT\((.*?)\)\s*>=\s*(\d+)/)
    
        if (match) {
          const field = match[1].trim() // DATE(created_at) sau style
          const minCount = parseInt(match[2])
    
          // interogarea dinamică
          const query = `
            SELECT COUNT(DISTINCT ${field}) as count 
            FROM stories 
            WHERE user_id = ?
          `
    
          try {
            const result = db.prepare(query).get(userId)
            shouldUnlock = result.count >= minCount
          } catch (error) {
            console.error('Eroare la evaluarea realizarii complexe:', error)
          }
        }
      }
      
      if (shouldUnlock) {
        try {
          db.prepare(`INSERT INTO user_realizari (user_id, realizare_id, unlocked_at) VALUES (?, ?, datetime('now'))`).run(userId, realizare.id)
          newUnlocks.push(realizare)
        } catch (error) {
          console.error('Eroare la salvarea realizării complexe:', error)
        }
      }
    })

    return newUnlocks
  } catch (error) {
    console.error('Eroare la verificarea realizărilor:', error)
    return []
  }
}

// Inițializează realizările
export function initRealizari() {
  const realizari = [
    // număr de povești
    { name: 'Prima poveste', description: 'Ai creat și salvat prima poveste!', icon: '📖', required_count: 1, type: 'count' },
    { name: 'Povestitor înnăscut', description: 'Ai creat și salvat 5 povești!', icon: '✍️', required_count: 5, type: 'count' },
    { name: 'Maestru al poveștilor', description: 'Ai creat și salvat 10 povești!', icon: '👑', required_count: 10, type: 'count' },
    { name: 'Scriitor activ', description: 'Ai generat și salvat 15 povești!', icon: '📚', required_count: 15, type: 'count' },
    { name: 'Maratonistul de povești', description: 'Ai creat și salvat 25 de povești!', icon: '🏃‍♀️', required_count: 25, type: 'count' },
    { name: 'Legendarul povestitor', description: 'Ai creat și salvat 50 de povești!', icon: '🌟', required_count: 50, type: 'count' },
    // cuvinte cheie
    { name: 'Explorator de magie', description: 'Ai folosit cuvântul "magie"!', icon: '🪄', type: 'keyword', keyword: 'magie' },
    { name: 'Prietenos cu dragonii', description: 'Ai creat o poveste cu dragoni!', icon: '🐉', type: 'keyword', keyword: 'dragon' },
    { name: 'Prietenul animalelor', description: 'Ai creat o poveste cu un "urs"!', icon: '🐻', type: 'keyword', keyword: 'urs' },
    { name: 'Călător prin spațiu', description: 'Ai menționat "planeta" într-o poveste!', icon: '🪐', type: 'keyword', keyword: 'planeta' },
    { name: 'Inventator de personaje', description: 'Ai folosit cuvântul "robot" într-o poveste!', icon: '🤖', type: 'keyword', keyword: 'robot' },
    { name: 'Eroul zânelor', description: 'Ai folosit cuvântul "zână" într-o poveste!', icon: '🧚', type: 'keyword', keyword: 'zână' },
    { name: 'Călător în timp', description: 'Ai menționat cuvântul "timp" într-o poveste!', icon: '⏳', type: 'keyword', keyword: 'timp' },
    // stiluri
    { name: 'Curios în educație', description: 'Ai ales stilul „educativă”!', icon: '🎓', type: 'style', keyword: 'educativă' },
    { name: 'Detectiv în devenire', description: 'Ai ales stilul „mister”!', icon: '🧐', type: 'style', keyword: 'mister'},
    { name: 'Amuzant din fire', description: 'Ai ales stilul „comedie” de 3 ori!', icon: '😂', required_count: 3, type: 'style_count', keyword: 'comedie' },
    { name: 'Glumeț convins', description: 'Ai ales stilul „comedie” de 5 ori!', icon: '🤣', required_count: 5, type: 'style_count', keyword: 'comedie' },
    { name: 'Profesor în povești', description: 'Ai ales stilul „educativă” de 5 ori!', icon: '🧑‍🏫', required_count: 5, type: 'style_count', keyword: 'educativă' },
    { name: 'Suflet de Sherlock', description: 'Ai ales stilul „mister” de 5 ori!', icon: '🕵🏻', required_count: 5, type: 'style_count', keyword: 'mister' },
    { name: 'Curajos în fantezie', description: 'Ai ales stilul „fantezie” de 3 ori!', icon: '🧚‍♀️', required_count: 3, type: 'style_count', keyword: 'fantezie' },
    { name: 'Povestitor consecvent', description: 'Ai generat povești 3 zile diferite!', icon: '📅', required_count: 3, type: 'complex', keyword: 'DISTINCT(DATE(created_at)) >= 3' },
    { name: 'Povestitor lunar', description: 'Ai creat povești în 10 zile diferite!', icon: '📆', required_count: 10, type: 'complex', keyword: 'DISTINCT(DATE(created_at)) >= 10' },
    { name: 'Maratonist zilnic', description: 'Ai fost activ 20 de zile diferite!', icon: '📊', required_count: 20, type: 'complex', keyword: 'DISTINCT(DATE(created_at)) >= 20' },
    { name: 'Mix & Match', description: 'Ai folosit 3 stiluri diferite!', icon: '🎭', required_count: 3, type: 'complex', keyword: 'DISTINCT(style) >= 3' }
  ]

  realizari.forEach(r => {
    try {
      db.prepare(`INSERT OR IGNORE INTO realizari (name, description, icon, required_count, type, keyword) 
                 VALUES (?, ?, ?, ?, ?, ?)`).run(r.name, r.description, r.icon, r.required_count ?? 1, r.type, r.keyword ?? null)
    } catch (error) {
      console.error('Eroare la inserarea realizării:', r.name, error)
    }
  })
  console.log('Realizări inițializate')
}

// initRealizari()

export default router