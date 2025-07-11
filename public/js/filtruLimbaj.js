const badWords = [
  'pula', 'pulă', 'muie', 'futu-ți', 'fut', 'futut', 'futută', 'panarama',
  'cur', 'căcat', 'cacat', 'coaie', 'sex', 'porno', 'târfă', 'tarfa', 
  'proasta', 'proastă', 'prost', 'idiot', 'idiota', 'idiotă', 'dobitoc', 
  'nesimtit', 'ma-ta', 'mă-ta', 'mătii', 'sugi', 'suge', 'sugă', 'sugeți', 
  'pul@', 'pizda', 'pizdă', 'țâțe', 'tate', 'm#ta', 'm**e', 'm**a', 
  'jigodie', 'du-te dracului', 'du-te naibii'
]


let cuvinteObsceneDetectate = [] // Lista tuturor cuvintelor detectate

export function contineCuvinteObscene(text) {
  const lowerText = text.toLowerCase()
  cuvinteObsceneDetectate = [] // Resetăm lista

  for (const cuvant of badWords) {
    // expresie regulată care prinde doar cuvinte izolate
    const pattern = new RegExp(`(^|[^a-zăîâșț])${cuvant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[^a-zăîâșț]|$)`, 'gi')

    if (pattern.test(lowerText)) {
      cuvinteObsceneDetectate.push(cuvant)
    }
  }

  return cuvinteObsceneDetectate.length > 0
}

export function getCuvinteObsceneGasite() {
  return cuvinteObsceneDetectate
}

