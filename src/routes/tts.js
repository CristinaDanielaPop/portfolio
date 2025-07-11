import { Router } from 'express'
import { TextToSpeechClient } from '@google-cloud/text-to-speech'

const router = Router()
const client = new TextToSpeechClient()

router.post('/', async (req, res) => {
  const { title, text } = req.body
  if (!text) return res.status(400).json({ error: 'Text lipsă' })

  // Elimină steluțele și spațiile în plus
  const cleanText = text.replace(/\*\*/g, '').trim()
  const cleanTitle = title.replace(/\*\*/g, '').trim()
  const fullText = `${cleanTitle}. ${cleanText}`

  const request = {
    input: { text: fullText },
    voice: {
      languageCode: 'ro-RO',
      name: 'ro-RO-Standard-A',
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 1.0, // viteza vorbirii (1.0 = normal)
      pitch: 2.0 // tonalitatea (0 = normal, -20 până la +20)
    },
  }

  try {
    const [response] = await client.synthesizeSpeech(request)
    res.set('Content-Type', 'audio/mpeg')
    res.send(response.audioContent)
  } catch (err) {
    console.error('Eroare Google TTS:', err)
    res.status(500).json({ error: 'Eroare la generarea vocii' })
  }
})

export default router
