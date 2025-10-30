# Povești magice

**Povești Magice** is an interactive web application designed for children aged 5-10 that generates and reads aloud AI-powered stories in Romanian.  
Developed as a bachelor’s degree project, it combines advanced language models with speech synthesis to create an engaging and educational experience.

---

## Features

- 🤖 **Story generation:** uses Meta Llama 3.1, a large language model, to generate creative and coherent stories based on user keywords and style choices.
- 🔊 **Text-to-Speech:** integrates Google Cloud Text-to-Speech with DeepMind technology for natural and clear audio playback in Romanian.
- 🔐 **User authentication:** secure login and registration system using bcryptjs for password hashing and JSON Web Tokens (JWT) for session management.
- 🗃️ **Data storage:** SQLite relational database storing users, stories, achievements, and relationships among them.
- 🎮 **Gamification:** achievement system with visual progress and rewards to motivate users.
- 🚫 **Content safety:** real-time filtering of inappropriate language to ensure a safe environment for children.

---

## Technologies used

- **Frontend:** HTML, CSS, Bootstrap, JavaScript
- **Backend:** Node.js, Express.js
- **Database:** SQLite
- **AI integration:** Meta Llama 3.1 via OpenRouter API
- **Text-to-Speech:** Google Cloud Text-to-Speech API
- **Authentication:** bcryptjs, jsonwebtoken

---

## Installation & running locally

1. Clone the repository:

   ```bash
   git clone https://github.com/CristinaDanielaPop/portfolio.git
   ```

2. Navigate to the project folder:
   ```bash
   cd portfolio/povesti-magice
   ```

3. Install dependencies:
   
   ```bash
   npm install
   ```

4. Create a .env file in the project root with your API keys and environment variables. Example:
   
   ```bash
   PORT=3000
   JWT_SECRET=your_jwt_secret
   GOOGLE_TTS_API_KEY=your_google_api_key
   OPENROUTER_API_KEY=your_openrouter_api_key
   ```

5. Start the application:
   
   ```bash
   npm start
   ```

 6. Open your browser and go to http://localhost:3000

---

## Usage
- Visitors can generate and listen to AI stories without logging in.  
- Registered users can save, edit, and manage their own stories.  
- Gamification elements reward progress and encourage engagement.

## Acknowledgments
- Special thanks to professor Ovidiu Cosma for guidance during development.  
- Thanks to the young testers Sofia and Dragoș for their invaluable feedback.  

