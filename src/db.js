import { DatabaseSync } from 'node:sqlite'
const db = new DatabaseSync('stories.db')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user', 
  avatar TEXT
)`)

db.exec(`CREATE TABLE IF NOT EXISTS stories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  keywords TEXT,
  style TEXT,
  title TEXT,
  story TEXT,
  images TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
)`)

db.exec(`CREATE TABLE IF NOT EXISTS realizari (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  required_count INTEGER DEFAULT 1,
  type TEXT NOT NULL DEFAULT 'count' CHECK (type IN ('count', 'keyword', 'style', 'style_count', 'complex')),
  keyword TEXT,
  CHECK (
    (type = 'count' AND keyword IS NULL) OR 
    (type = 'keyword' AND keyword IS NOT NULL) OR
    (type = 'style' AND keyword IS NOT NULL) OR
    (type = 'style_count' AND keyword IS NOT NULL) OR
    (type = 'complex')
  )
)`)

db.exec(`CREATE TABLE IF NOT EXISTS user_realizari (
  user_id INTEGER,
  realizare_id INTEGER,
  unlocked_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, realizare_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (realizare_id) REFERENCES realizari(id)
)`)

export default db