import express from 'express'
import authMiddleware from '../middleware/authMiddleware.js'
import { checkRealizari } from './realizariRoutes.js'
import db from '../db.js'
import fetch from 'node-fetch'

const router = express.Router()

// Endpoint generare poveste
router.post('/generate', async (req, res) => {
  const { keywords, style } = req.body

  console.log('Cuvinte cheie primite:', keywords) // Log pentru a verifica datele primite

  if (!keywords || !style) {
    return res.status(400).json({ error: 'Toate câmpurile sunt necesare.' })
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-405b-instruct',
        messages: [
          {
            role: 'system',
            content: `Ești un povestitor expert care creează povești captivante pentru copii în limba română. 
            Răspunde întotdeauna în formatul specificat: Titlu, apoi Poveste.
            Asigură-te că povestea este completă și are un final satisfăcător.
            
            Titlul trebuie să respecte următoarea regulă:
            - Doar prima literă a primului cuvânt să fie cu majusculă, cu excepția cazurilor când apar nume proprii (ex: Marte, Ana etc.), care trebuie scrise cu majusculă.`
          },
          {
            role: 'user',
            content: `Scrie o poveste pentru copii în limba română care include: ${keywords}. 
            Stilul poveștii trebuie să fie de tipul: ${style}.
            FĂRĂ să folosești caractere de formatare ca ** sau "" în jurul titlurilor sau secțiunilor.
            
            FORMATUL RĂSPUNSULUI TREBUIE SĂ FIE:
            
            Titlu: [un titlu original și captivant, potrivit conținutului]
            Poveste: [Povestea trebuie sa fie completă cu introducere, punct culminant și sfârșit satisfăcător]
            
            CERINȚE:
            - Limbaj simplu și clar pentru copii
            - Include toate cuvintele cheie în mod natural
            - Încheie povestea cu un mesaj educativ pozitiv, dar NU folosi cuvântul „Morala” sau etichete de tipul „Concluzie” - mesajul trebuie să fie parte naturală din poveste
            - Încheiere completă și satisfăcătoare
            - Fără conținut înspăimântător
            - Folosește o gramatică corectă în limba română, evitând greșeli de exprimare
            - Evită structuri forțate sau traduceri literale din engleză
            - Povestea trebuie să pară scrisă natural, ca de un autor nativ român, cu acorduri corecte și fraze fluente
            `
          }
        ],
        temperature: 0.8, // Controlul creativității răspunsului
        max_tokens: 1000, // Limita maximă de tokeni pentru răspuns
        top_p: 0.9, // Controlul diversității răspunsului
        frequency_penalty: 0.1, // Penalizează repetarea frecventă a aceluiași cuvânt
        presence_penalty: 0.1 // Încurajează introducerea de noi concepte în text
      })
    })

    const data = await response.json()
    console.log('Raspuns OpenRouter:', data) // Log pentru a verifica răspunsul de la OpenRouter

    if (data.error) {
      return res.status(500).json({ error: data.error })
    }

    const content = data.choices?.[0]?.message?.content || 'Nu s-a generat povestea.'

    const titluMatch = content.match(/Titlu:\s*(.*)/i)
    const title = titluMatch ? titluMatch[1].trim() : 'Poveste fără titlu'

    const povesteMatch = content.match(/Poveste:\s*([\s\S]*)/i)
    const story = povesteMatch ? povesteMatch[1].trim() : 'Nu s-a generat povestea.'

    res.json({ title, story })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Eroare la generarea poveștii.' })
  }
})

// Endpoint salvare poveste
router.post('/save', authMiddleware, (req, res) => {
  const { keywords, style, title, story} = req.body
  const userId = req.userId // Obține userId din token-ul JWT 

  if (!userId || !keywords || !story) {
    return res.status(400).json({ error: 'Lipsesc datele necesare.' })
  }

  const insertStory = db.prepare(`INSERT INTO stories (user_id, keywords, style, title, story) VALUES (?, ?, ?, ?, ?)`)
  const result = insertStory.run(userId, keywords, style, title, story)

  // Verifică realizările noi
  const noiRealizari = checkRealizari(userId, story, style, keywords)

  res.status(200).json({ id: result.lastInsertRowid, message: 'Povestea a fost salvată!', realizari: noiRealizari })
})

// Endpoint afișare povești salvate
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

  console.log('ID-ul poveștii:', storyId)  // Log pentru debugging
  console.log('ID-ul utilizatorului:', userId)  // Log pentru debugging

  try {
    const getStory = db.prepare(`SELECT * FROM stories WHERE id = ? AND user_id = ?`)
    const story = getStory.get(storyId, userId)
    if (!story) {
      return res.status(404).json({ message: 'Povestea nu a fost gasită!' })
    }

    res.json({ story })

  } catch (error) {
    console.error('Eroare la preluarea poveștii:', error)
    res.status(500).json({ message: 'Eroare internă!' })
  }
})

// Endpoint pentru a șterge poveștile salvate
router.delete('/delete/:id', authMiddleware, (req, res) => {
  const storyId = req.params.id
  const userId = req.userId

  try {
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

// Endpoint afișare povești salvate de creatori
router.get('/creatorStories', authMiddleware, (req, res) => {
  try {
    const getCreatorStories = db.prepare(`
      SELECT s.id, s.title, s.style, s.created_at, u.username 
      FROM stories s
      JOIN users u ON s.user_id = u.id
      WHERE u.role = 'creator'
      ORDER BY s.created_at DESC
    `)

    const stories = getCreatorStories.all()

    if (stories.length === 0) {
      return res.status(404).json({ error: 'Nu există povești de la creatori!' })
    }

    res.json({ stories })
  } catch (err) {
    console.error('Eroare la preluarea poveștilor creatorilor:', err)
    res.status(500).json({ error: 'Eroare internă server' })
  }
})

// Endpoint pentru a citi o poveste a unui creator
router.get('/creatorStory/:id', authMiddleware, (req, res) => {
  const storyId = req.params.id
  try {
    const getStory = db.prepare(`
      SELECT *
      FROM stories s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ? AND u.role = 'creator'
    `)
    const story = getStory.get(storyId)

    if (!story) {
      return res.status(404).json({ error: 'Povestea nu a fost gasita' })
    }

    res.json({ story })
  } catch (err) {
    console.error('Eroare la preluarea poveștii:', err)
    res.status(500).json({ error: 'Eroare internă server' })
  }
})

export default router