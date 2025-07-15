import fs from 'fs'
import path from 'path'

export default defineEventHandler(() => {
  const filePath = path.join(process.cwd(), 'public', 'istilahData.json')
  const data = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(data)
})