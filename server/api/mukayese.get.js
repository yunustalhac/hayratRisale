import fs from 'fs'
import path from 'path'

export default defineEventHandler((event) => {
  // Örnek: public/mukayese.json dosyasını oku
  const filePath = path.join(process.cwd(), 'public', 'mukayese.json')
  const data = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(data)
})