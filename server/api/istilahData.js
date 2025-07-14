import { MongoClient } from 'mongodb'

let client = null;

export default defineEventHandler(async (event) => {
    // Tüm verileri çekmek için query parametrelerini kaldırdık
    const uri = "mongodb+srv://yunustalha:yunus9590@ticaret.0eu40.mongodb.net/?retryWrites=true&w=majority&appName=ticaret"

    try {
        // Eğer client bağlı değilse yeni bağlantı oluştur
        if (!client) {
            client = new MongoClient(uri)
            await client.connect()
            console.log('MongoDB bağlantısı başarılı')
        }

        const db = client.db('istilah')
        const collection = db.collection('istilah')

        // Filtre kullanılmadan tüm veriler çekiliyor
        const eserler = await collection.find({}).toArray()


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
        client = null
        return {
            success: false,
            error: 'Veri çekilemedi',
            details: err.message,
            data: []
        }
    }
})