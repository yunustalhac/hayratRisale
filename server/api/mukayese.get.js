import { MongoClient } from 'mongodb'

let client = null;

export default defineEventHandler(async (event) => {
  const { eser = '', sayfa = '' } = await getQuery(event)
  // Eğer eser veya sayfa parametreleri eksikse hata döndür
  if (!eser || !sayfa) {
    return {
      success: false,
      error: 'Eser ve sayfa parametreleri gereklidir',
      data: []
    }
  }

  const uri = process.env.MONGO_URI

  try {
    // Eğer client bağlı değilse yeni bağlantı oluştur
    if (!client) {
      client = new MongoClient(uri)
      await client.connect()
      console.log('MongoDB bağlantısı başarılı')
    }

    const db = client.db('eserler')
    const collection = db.collection('eserler')

    const eserler = await collection.find({
      eser: eser,
      sayfa: sayfa
    }).toArray()


    // Veri bulunamadığında boş dizi döndür
    if (!eserler || eserler.length === 0) {
      console.warn('Eserler koleksiyonu boş veya veri bulunamadı')
      return {
        success: true,
        data: [],
        count: 0
      }
    }

    return {
      success: true,
      data: eserler,
      count: eserler.length
    }

  } catch (err) {
    console.error('MongoDB hatası:', err)
    // Hata durumunda client'ı sıfırla
    client = null
    return {
      success: false,
      error: 'Veri çekilemedi',
      details: err.message,
      data: []
    }
  }
})