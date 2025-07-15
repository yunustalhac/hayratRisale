<script setup>
// ==================================================
// 1. Imports & Utility Functions
// ==================================================
import {ref, computed, onMounted, watch, onBeforeUnmount, watchEffect} from 'vue'
import {useRoute, useRouter} from '#imports'
import IconBilgiCart from "~/components/iconBilgiCart.vue";

function safeGetItem(key) {
  return typeof window !== 'undefined' ? localStorage.getItem(key) : null
}

function safeSetItem(key, value) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, value)
  }
}

// ==================================================
// 2. Router, API & Device Selection
// ==================================================
const route = useRoute()
const router = useRouter()
const {data: data} = await useFetch('/api/data', {key: 'static-data', lazy: true})
console.log(data.value)

const esericerigiData = computed(() => {
  // fetchedData.value varsa, onun içindeki 'data' dizisini döndür, yoksa boş array
  return data.value?.data || []
})

// Mukayese verisi için ref oluştur
const mukayeseData = ref(null)

// Sayfa değişikliklerini izle ve mukayese verilerini güncelle
watch(
    [() => route.query.eser, () => route.query.sayfa],
    async ([newEser, newSayfa]) => {
      if (newEser && newSayfa) {
        const {data: mukayeseResponse} = await useFetch('/api/mukayese', {
          query: {
            eser: newEser,
            sayfa: newSayfa
          },
          default: () => ({
            success: true,
            data: [],
            count: 0
          })
        })
        mukayeseData.value = mukayeseResponse.value
      }
    },
    {immediate: true}
)

const deviceType = ref(safeGetItem("deviceType") || null)
const showDeviceModal = ref(!deviceType.value)
const selectDevice = (type) => {
  deviceType.value = type
  safeSetItem("deviceType", type)
  showDeviceModal.value = false
}
watchEffect(() => {
  if (deviceType.value) showDeviceModal.value = false
})

// ==================================================
// 3. Global State & Page Settings
// ==================================================
const controlPanel = ref(false)
const sideBar = ref(false)
const penMenuAcik = ref(false);

const eser = ref(route.query.eser || "mektubat")
const bolum = ref(route.query.bolum || "")
const slug = ref(route.query.slug || "")
const _sayfaNo = ref(Math.max(1, Number(route.query.sayfa) || 1))
const sayfaAc = ref("")


const secilenRenk = ref("#B0BEC5")
const cizgiGenisligi = ref(5)
const isDelete = ref(false)
// Osmanlıca (resim) modu için çizim dizisi
const osmLines = ref([])
// Latince (metin) modu için çizim dizisi
const latLines = ref([])
// Aktif çizim dizisini belirlemek için computed property
const lines = computed(() => dil.value ? osmLines.value : latLines.value)
const drawing = ref(false)
const lastPoint = ref(null)
const requestRef = ref()
const dil = ref(true)
const sidebarContent = ref(true)
const visible = ref(false)
const soru = ref(null)
const bildirimYazisi = ref("")
// Eraser radius (silgi boyutu)
const eraserRadius = ref(20)

// White Page Mode
const beyazSayfaAktif = ref(false)
const beyazSayfaLines = ref([])

// Renkler & Maksimum Sayfa Bilgileri
const renkler = [
  "#1E1E1E", // Koyu Gri
  "#FF6F61", // Mercan Kırmızısı
  "#FFB74D", // Açık Turuncu
  "#FFD54F", // Sarı
  "#66BB6A", // Yeşil
  "#26A69A", // Su Yeşili
  "#4FC3F7", // Açık Mavi
  "#42A5F5", // Mavi
  "#5C6BC0", // Mavi Mor
  "#AB47BC", // Mor
  "#FF8A65", // Açık Pembe
  "#A1887F", // Kahverengi
  "#B0BEC5", // Açık Gri
  "#DCE775", // Limon Yeşili
  "#FF7043", // Koyu Turuncu
  "#78909C"  // Gri Mavi
];


const maxPages = {
  "sozler": 379, "lemalar": 419, "sualar": 628, "mektubat": 515,
  "siracun-nur": 309, "zulfikar": 375, "asa-yi-musa": 318,
  "tilsimlar": 164, "isaratul-i-caz": 284, "mesnevi-i-nuriye": 294,
  "sikke-i-tasdik-i-gaybi": 248, "barla-lahikasi": 368, "kastamonu-lahikasi": 343,
  "emirdag-lahikasi-1": 464, "emirdag-lahikasi-2": 475, "emirdag-lahikasi-3": 460,
  "emirdag-lahikasi-4": 562, "bes-risale": 95, "hanimlar-rehberi": 162,
  "genclik-rehberi": 84
}
const sayfaNo = computed({
  get() {
    return _sayfaNo.value
  },
  set(value) {
    const maxPage = maxPages[eser.value] || Infinity
    _sayfaNo.value = Math.max(1, Math.min(maxPage, value))
  }
})


// Sidebar & Eser İlgili Değişkenler
const eserListesi = ref(false)
const bolumListesiBool = ref(false)
const maddeVeri = ref([])
const selectedEserIndex = ref(null)
const selectedMadde = ref(null)
const openEserIndices = ref([])

// LocalStorage Anahtarı, Kaydetme ve Temizleme
const localStorageKey = () => {
  if (beyazSayfaAktif.value) {
    return `${eser.value}-${sayfaNo.value}-beyaz-lines`
  } else {
    // Dil moduna göre farklı anahtarlar kullan
    return dil.value
        ? `${eser.value}-${sayfaNo.value}-osm-lines` // Osmanlıca (resim) modu
        : `${eser.value}-${sayfaNo.value}-lat-lines` // Latince (metin) modu
  }
}

function saveToLocalStorage() {
  const drawingData = beyazSayfaAktif.value
      ? {
        eser: eser.value,
        sayfa: sayfaNo.value,
        secilenRenk: secilenRenk.value,
        cizgiGenisligi: cizgiGenisligi.value,
        lines: beyazSayfaLines.value
      }
      : {
        eser: eser.value,
        sayfa: sayfaNo.value,
        secilenRenk: secilenRenk.value,
        cizgiGenisligi: cizgiGenisligi.value,
        lines: dil.value ? osmLines.value : latLines.value
      }
  safeSetItem(localStorageKey(), JSON.stringify(drawingData))
}

const temizle = () => {
  if (beyazSayfaAktif.value) {
    beyazSayfaLines.value = []
  } else {
    // Dil moduna göre ilgili çizim dizisini temizle
    if (dil.value) {
      osmLines.value = []
    } else {
      latLines.value = []
    }
  }
  localStorage.removeItem(localStorageKey())
  
  // Yazıları da temizle
  if (dil.value) {
    osmTexts.value = []
  } else {
    latTexts.value = []
  }
  localStorage.removeItem(textsLocalStorageKey())
}

// ==================================================
// 4. Touch & Pointer Action Settings
// ==================================================
const touchActionStyle = ref('auto')

function updateTouchAction() {
  if (deviceType.value === 'pen') touchActionStyle.value = 'auto'
  else if (deviceType.value === 'touch') touchActionStyle.value = 'none'
  else touchActionStyle.value = 'auto'
}

if (deviceType.value) updateTouchAction()

function shouldIgnoreInput(e) {
  if (deviceType.value === 'pen' && e.pointerType !== 'pen') return true
  if (deviceType.value === 'mouse' && e.pointerType !== 'mouse') return true
  if (deviceType.value === 'touch' && e.pointerType !== 'touch') return true
  return false
}

// ==================================================
// 5. Note Functionality
// ==================================================
const noteCreationMode = ref(false)
const noteBoxStart = ref(null)
const noteBoxEnd = ref(null)
const showNoteModal = ref(false)
const noteText = ref("")
const notePriority = ref("low")
// Osmanlıca (resim) modu için notlar dizisi
const osmNotes = ref([])
// Latince (metin) modu için notlar dizisi
const latNotes = ref([])
// Aktif notlar dizisini belirlemek için computed property
const notes = computed({
  get: () => dil.value ? osmNotes.value : latNotes.value,
  set: (val) => {
    if (dil.value) {
      osmNotes.value = val
    } else {
      latNotes.value = val
    }
  }
})
const activeNote = ref(null)
const dahaFazla = ref(false)

const currentNoteBox = computed(() => {
  if (!noteBoxStart.value || !noteBoxEnd.value) return null
  const {x: x1, y: y1} = noteBoxStart.value
  const {x: x2, y: y2} = noteBoxEnd.value
  return {
    left: Math.min(x1, x2),
    top: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1)
  }
})

function saveNote() {
  const box = currentNoteBox.value
  if (!box) return
  const priorityColors = {low: "#1E90FF", medium: "#FF8C00", high: "#DC143C"}
  const newNote = {
    id: Date.now() + Math.random(),
    left: box.left,
    top: box.top,
    width: box.width,
    height: box.height,
    text: noteText.value,
    priority: notePriority.value,
    color: priorityColors[notePriority.value]
  }

  // Dil moduna göre doğru notlar dizisine ekle
  if (dil.value) {
    osmNotes.value.push(newNote)
  } else {
    latNotes.value.push(newNote)
  }

  saveNotesToLocalStorage()
  activeNote.value = newNote.id
  noteBoxStart.value = null
  noteBoxEnd.value = null
  noteCreationMode.value = false
  showNoteModal.value = false
  noteText.value = ""
  notePriority.value = "low"
}

function closeNoteModal() {
  showNoteModal.value = false
  noteBoxStart.value = null
  noteBoxEnd.value = null
  noteCreationMode.value = false
}

function activateNoteCreation() {
  noteBoxStart.value = null
  noteBoxEnd.value = null
  showNoteModal.value = false
  noteText.value = ""
  notePriority.value = "low"
  noteCreationMode.value = !noteCreationMode.value
}

// Notlar için localStorage anahtarı
const notesLocalStorageKey = () => {
  return dil.value
      ? `${eser.value}-${sayfaNo.value}-osm-notes` // Osmanlıca (resim) modu
      : `${eser.value}-${sayfaNo.value}-lat-notes` // Latince (metin) modu
}

function loadNotes() {
  const storedNotes = typeof window !== 'undefined'
      ? localStorage.getItem(notesLocalStorageKey())
      : null

  if (storedNotes) {
    const parsedNotes = JSON.parse(storedNotes)
    if (dil.value) {
      osmNotes.value = parsedNotes
    } else {
      latNotes.value = parsedNotes
    }
  } else {
    // Veri yoksa ilgili diziyi temizle
    if (dil.value) {
      osmNotes.value = []
    } else {
      latNotes.value = []
    }
  }
}

function saveNotesToLocalStorage() {
  if (dil.value) {
    safeSetItem(notesLocalStorageKey(), JSON.stringify(osmNotes.value))
  } else {
    safeSetItem(notesLocalStorageKey(), JSON.stringify(latNotes.value))
  }
}

function deleteNote(noteId) {
  if (dil.value) {
    osmNotes.value = osmNotes.value.filter(n => n.id !== noteId)
  } else {
    latNotes.value = latNotes.value.filter(n => n.id !== noteId)
  }
  activeNote.value = null
  saveNotesToLocalStorage()
}

// ==================================================
// 6. Free Text Functionality
// ==================================================
const freeTextModeActive = ref(false)
// Osmanlıca (resim) modu için serbest metin
const osmFreeText = ref("")
// Latince (metin) modu için serbest metin
const latFreeText = ref("")
// Aktif serbest metni belirlemek için computed property
const freeText = computed({
  get: () => dil.value ? osmFreeText.value : latFreeText.value,
  set: (val) => {
    if (dil.value) {
      osmFreeText.value = val
    } else {
      latFreeText.value = val
    }
  }
})

// Serbest metin için localStorage anahtarı
const freeTextLocalStorageKey = () => {
  return dil.value
      ? `${eser.value}-${sayfaNo.value}-osm-freetext` // Osmanlıca (resim) modu
      : `${eser.value}-${sayfaNo.value}-lat-freetext` // Latince (metin) modu
}

function toggleFreeTextMode() {
  freeTextModeActive.value = !freeTextModeActive.value
  if (!freeTextModeActive.value) {
    safeSetItem(freeTextLocalStorageKey(), freeText.value)
  }
}

function loadFreeText() {
  const storedFreeText = safeGetItem(freeTextLocalStorageKey())
  if (storedFreeText) {
    if (dil.value) {
      osmFreeText.value = storedFreeText
    } else {
      latFreeText.value = storedFreeText
    }
  }
}

// ==================================================
// 6.1 Text Writing Functionality
// ==================================================
const textMode = ref(false)
const showTextModal = ref(false)
const textContent = ref("")
const textPosition = ref({ x: 100, y: 100 })
const textColor = ref("#000000")
const textSize = ref(16)
const textFont = ref("Arial")

// Yazı renkleri dizisi
const textColors = [
  "#000000", // Siyah
  "#FFFFFF", // Beyaz
  "#FF0000", // Kırmızı
  "#00FF00", // Yeşil
  "#0000FF", // Mavi
  "#FFFF00", // Sarı
  "#FF00FF", // Magenta
  "#00FFFF", // Cyan
  "#FFA500", // Turuncu
  "#800080", // Mor
  "#008000", // Koyu Yeşil
  "#000080", // Lacivert
  "#800000", // Bordo
  "#808080", // Gri
  "#FFC0CB", // Pembe
  "#A52A2A", // Kahverengi
  "#FFD700", // Altın
  "#4B0082"  // İndigo
]

// Osmanlıca (resim) modu için yazılar dizisi
const osmTexts = ref([])
// Latince (metin) modu için yazılar dizisi
const latTexts = ref([])
// Aktif yazılar dizisini belirlemek için computed property
const texts = computed({
  get: () => dil.value ? osmTexts.value : latTexts.value,
  set: (val) => {
    if (dil.value) {
      osmTexts.value = val
    } else {
      latTexts.value = val
    }
  }
})

// Yazılar için localStorage anahtarı
const textsLocalStorageKey = () => {
  return dil.value
      ? `${eser.value}-${sayfaNo.value}-osm-texts` // Osmanlıca (resim) modu
      : `${eser.value}-${sayfaNo.value}-lat-texts` // Latince (metin) modu
}

function activateTextMode() {
  textMode.value = !textMode.value
  if (!textMode.value) {
    showTextModal.value = false
    textContent.value = ""
  }
}

function saveText() {
  if (!textContent.value.trim()) {
    // Boş yazı için uyarı göster
    showCard("Lütfen bir yazı girin!")
    return
  }
  
  const newText = {
    id: Date.now() + Math.random(),
    content: textContent.value.trim(),
    x: textPosition.value.x,
    y: textPosition.value.y,
    color: textColor.value,
    size: textSize.value,
    font: textFont.value
  }

  // Dil moduna göre doğru yazılar dizisine ekle
  if (dil.value) {
    osmTexts.value.push(newText)
  } else {
    latTexts.value.push(newText)
  }

  saveTextsToLocalStorage()
  
  // Formu temizle
  textContent.value = ""
  textColor.value = "#000000"
  textSize.value = 16
  textFont.value = "Arial"
  textPosition.value = { x: 100, y: 100 }
  
  // Modalı kapat
  showTextModal.value = false
  textMode.value = false
  
  // Başarı mesajı göster
  showCard("Yazı başarıyla eklendi!")
}

function closeTextModal() {
  showTextModal.value = false
  textMode.value = false
  
  // Formu temizle
  textContent.value = ""
  textColor.value = "#000000"
  textSize.value = 16
  textFont.value = "Arial"
  textPosition.value = { x: 100, y: 100 }
}

function loadTexts() {
  const storedTexts = typeof window !== 'undefined'
      ? localStorage.getItem(textsLocalStorageKey())
      : null

  if (storedTexts) {
    const parsedTexts = JSON.parse(storedTexts)
    if (dil.value) {
      osmTexts.value = parsedTexts
    } else {
      latTexts.value = parsedTexts
    }
  } else {
    // Veri yoksa ilgili diziyi temizle
    if (dil.value) {
      osmTexts.value = []
    } else {
      latTexts.value = []
    }
  }
}

function saveTextsToLocalStorage() {
  if (dil.value) {
    safeSetItem(textsLocalStorageKey(), JSON.stringify(osmTexts.value))
  } else {
    safeSetItem(textsLocalStorageKey(), JSON.stringify(latTexts.value))
  }
}

function deleteText(textId) {
  console.log('deleteText çağrıldı, textId:', textId)
  if (dil.value) {
    osmTexts.value = osmTexts.value.filter(t => t.id !== textId)
  } else {
    latTexts.value = latTexts.value.filter(t => t.id !== textId)
  }
  saveTextsToLocalStorage()
  console.log('Yazı silindi, kalan yazılar:', dil.value ? osmTexts.value.length : latTexts.value.length)
}

function handleTextClick(e) {
  if (!textMode.value) return
  
  const rect = e.currentTarget.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  
  textPosition.value = { x, y }
  showTextModal.value = true
}

// ==================================================
// 7. Pointer Events & Drawing Functions
// ==================================================
const gizle = ref(false)

function pointerDown(e) {
  if (gizle.value) return
  if (!deviceType.value || showNoteModal.value || shouldIgnoreInput(e)) return
  if (showSsModal.value || showTextModal.value) return

  if (e.pointerType === 'touch') e.preventDefault()

  const rect = e.currentTarget.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  if (textMode.value) {
    handleTextClick(e)
    return
  }

  if (noteCreationMode.value) {
    noteBoxStart.value = {x, y}
    noteBoxEnd.value = {x, y}
    e.currentTarget.setPointerCapture(e.pointerId)
    return
  }

  if (ssCreationMode.value) {
    ssBoxStart.value = {x, y}
    ssBoxEnd.value = {x, y}
    e.currentTarget.setPointerCapture(e.pointerId)
    return
  }

  if (isDelete.value) {
    // Silgi modunda sadece drawing'i başlat, silme yapma
    drawing.value = true
    lastPoint.value = {x, y}
    e.currentTarget.setPointerCapture(e.pointerId)
    return
  }
  startDrawing(e)
}

function pointerMove(e) {
  if (gizle.value) return
  if (!deviceType.value || showNoteModal.value || shouldIgnoreInput(e)) return
  if (showSsModal.value || showTextModal.value) return

  if (e.pointerType === 'touch') e.preventDefault()

  const rect = e.currentTarget.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  if (textMode.value) {
    return // Yazı modunda çizim yapma
  }

  if (noteCreationMode.value && noteBoxStart.value) {
    noteBoxEnd.value = {x, y}
    return
  }
  if (ssCreationMode.value && ssBoxStart.value) {
    ssBoxEnd.value = {x, y}
    return
  }

  if (isDelete.value && drawing.value) {
    eraseAt(e)
    return
  }
  continueDrawing(e)
}

function pointerUp(e) {
  if (gizle.value) return
  if (!deviceType.value || showNoteModal.value || shouldIgnoreInput(e)) return
  if (showSsModal.value || showTextModal.value) return

  if (textMode.value) {
    return // Yazı modunda çizim yapma
  }

  if (noteCreationMode.value && noteBoxStart.value && noteBoxEnd.value) {
    e.currentTarget.releasePointerCapture(e.pointerId)
    showNoteModal.value = true
    noteCreationMode.value = false
    return
  }

  if (ssCreationMode.value && ssBoxStart.value && ssBoxEnd.value) {
    e.currentTarget.releasePointerCapture(e.pointerId)
    showSsModal.value = true
    ssCreationMode.value = false
    return
  }

  if (isDelete.value) {
    // Silgi modunda sadece drawing'i durdur
    drawing.value = false
    lastPoint.value = null
    e.currentTarget.releasePointerCapture(e.pointerId)
    return
  }

  endDrawing(e)
}

function startDrawing(e) {
  if (showNoteModal.value || showSsModal.value || showTextModal.value || textMode.value) return

  const rect = e.currentTarget.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  drawing.value = true
  lastPoint.value = {x, y}

  e.currentTarget.setPointerCapture(e.pointerId)
}

function continueDrawing(e) {
  if (showNoteModal.value || showSsModal.value || showTextModal.value || textMode.value) return

  if (!drawing.value) return

  const rect = e.currentTarget.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const newPoint = {x, y}

  // Çizim yapılacak hedef diziyi belirle
  let targetLines
  if (beyazSayfaAktif.value) {
    targetLines = beyazSayfaLines.value
  } else if (dil.value) {
    targetLines = osmLines.value
  } else {
    targetLines = latLines.value
  }

  // Normal çizim modu
  targetLines.push({
    id: Date.now() + Math.random(),
    color: secilenRenk.value,
    width: cizgiGenisligi.value,
    x1: lastPoint.value.x,
    y1: lastPoint.value.y,
    x2: newPoint.x,
    y2: newPoint.y
  })
  
  saveToLocalStorage()
  lastPoint.value = newPoint
}

function endDrawing(e) {
  if (showNoteModal.value || showSsModal.value || showTextModal.value || textMode.value) return

  if (!drawing.value) return

  drawing.value = false
  lastPoint.value = null
  e.currentTarget.releasePointerCapture(e.pointerId)
}

function eraseAt(e) {
  try {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    let removed = false

    // Silme işlemi yapılacak hedef diziyi belirle
    let target
    if (beyazSayfaAktif.value) {
      target = beyazSayfaLines
    } else if (dil.value) {
      target = osmLines
    } else {
      target = latLines
    }

    target.value = target.value.filter(line => {
      const dStart = Math.hypot(line.x1 - x, line.y1 - y)
      const dEnd = Math.hypot(line.x2 - x, line.y2 - y)
      const d = Math.min(dStart, dEnd)
      if (d < eraserRadius.value) {
        removed = true
        return false
      }
      return true
    })
    if (removed) saveToLocalStorage()
  } catch (error) {
    console.error("Erase error:", error)
  }
}

// ==================================================
// 9. Page & Image Operations
// ==================================================
const defaultSayfa = async () => {
  const eserVal = route.query.eser || "mektubat"
  const sayfaVal = route.query.sayfa || 1
  const bolumVal = route.query.bolum || ""
  const slugVal = route.query.slug || ""
  if (!route.query.eser || !route.query.sayfa) {
    await router.replace({query: {eser: eserVal, bolum: bolumVal, sayfa: sayfaVal, slug: slugVal}})
  }
  const paddedSayfa = String(sayfaVal).padStart(3, '0')
  sayfaAc.value = `https://oku.risale.online/images/risale/${eserVal}/${paddedSayfa}.png`
  return sayfaAc.value
}

const git = async () => {
  const paddedSayfa = String(sayfaNo.value).padStart(3, '0')
  sayfaAc.value = `https://oku.risale.online/images/risale/${eser.value}/${paddedSayfa}.png`

  // Çizimler için
  const storedData = typeof window !== 'undefined'
      ? localStorage.getItem(localStorageKey())
      : null
  if (storedData) {
    const parsedData = JSON.parse(storedData)
    if (beyazSayfaAktif.value) {
      beyazSayfaLines.value = parsedData.lines || []
      secilenRenk.value = parsedData.secilenRenk || secilenRenk.value
      cizgiGenisligi.value = parsedData.cizgiGenisligi || cizgiGenisligi.value
    } else {
      // Dil moduna göre doğru çizim dizisini güncelle
      if (dil.value) {
        osmLines.value = parsedData.lines || []
      } else {
        latLines.value = parsedData.lines || []
      }
      secilenRenk.value = parsedData.secilenRenk || secilenRenk.value
      cizgiGenisligi.value = parsedData.cizgiGenisligi || cizgiGenisligi.value
    }
  } else {
    // Veri yoksa ilgili diziyi temizle
    if (beyazSayfaAktif.value) {
      beyazSayfaLines.value = []
    } else if (dil.value) {
      osmLines.value = []
    } else {
      latLines.value = []
    }
  }

  // Notlar için
  loadNotes()

  // Serbest metin için
  loadFreeText()

  // Yazılar için
  loadTexts()

  await router.replace({query: {eser: eser.value, bolum: bolum.value, slug: slug.value, sayfa: sayfaNo.value}})
  sayfaAc.value = `https://oku.risale.online/images/risale/${eser.value}/${paddedSayfa}.png`

  const prevPage = sayfaNo.value - 1
  const nextPage = sayfaNo.value + 1
  const maxPage = maxPages[eser.value] || Infinity
  if (prevPage >= 1) {
    const paddedPrev = String(prevPage).padStart(3, '0')
    const prevUrl = `https://oku.risale.online/images/risale/${eser.value}/${paddedPrev}.png`
    const imgPrev = new Image()
    imgPrev.src = prevUrl
  }
  if (nextPage <= maxPage) {
    const paddedNext = String(nextPage).padStart(3, '0')
    const nextUrl = `https://oku.risale.online/images/risale/${eser.value}/${paddedNext}.png`
    const imgNext = new Image()
    imgNext.src = nextUrl
  }
  router.replace({query: {eser: eser.value, bolum: bolum.value, slug: slug.value, sayfa: sayfaNo.value}})
}

// --------------------------------------------------
// Cache objesi (Component scope – global store tercih edilebilir)
// --------------------------------------------------

// Cache objesi – Component scope (ihtiyaç halinde global store kullanabilirsiniz)
const cache = new Map()


// Örnek veri: "sozler" eseri için startPage 1'den endPage 379'a kadar
const requestData = {
  works: [
    {
      eser: "sozler",
      slug: "birinci-soz",
      bolum: "Birinci Söz",
      startPage: 1,
      endPage: 379
    }
    // Diğer eserleri ekleyebilirsin.
  ]
};

// async function sendBatchScrapeRe-quest() {
//   try {
//     // API'den külliyat bilgisini çekiyoruz
//     const dataResponse = await fetch('/api/data');
//     const data = await dataResponse.json();
//     console.log("Çekilen API verisi:", data);
//
//     const works = [];
//     data.forEach(work => {
//       // "Sözler" gibi bir eserin toplam sayfa sayısı
//       const maxPage = work.sayfaSayisi;
//       // madde dizisinin sıralı olduğunu varsayıyoruz
//       work.madde.forEach((madde, index) => {
//         const startPage = madde.sayfa;
//         // Eğer sonraki madde varsa, endPage = (sonraki madde.sayfa - 1)
//         // Yoksa, o eserin toplam sayfa sayısı
//         const nextMadde = work.madde[index + 1];
//         const endPage = nextMadde ? nextMadde.sayfa - 1 : maxPage;
//         works.push({
//           eser: madde.eser,
//           slug: madde.slug,
//           bolum: madde.bolum,
//           startPage: startPage,
//           endPage: endPage
//         });
//       });
//     });
//
//     const requestData = { works };
//     console.log("Gönderilecek istek verisi:", requestData);
//
//     const response = await fetch('http://localhost:8080/autoScrape', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(requestData)
//     });
//     if (!response.ok) {
//       const errorData = await response.json();
//       throw new Error(`Error: ${errorData.error || response.statusText}`);
//     }
//     const result = await response.json();
//     console.log('Batch scraping result:', result);
//   } catch (error) {
//     console.error('Batch scraping error:', error);
//   }
// }

// Sayfa yüklendiğinde veya bir butona tıklandığında çalıştırabilirsin:
// sendBatchScrapeRequest();


// --------------------------------------------------
// URL Parametrelerini İzleyen Computed & Watch
// --------------------------------------------------

watch(eser, (newEser) => {
  const maxPage = maxPages[newEser] || Infinity
  if (_sayfaNo.value > maxPage) _sayfaNo.value = maxPage
})

// ==================================================
// 10. Eser & Sidebar Functions
// ==================================================
function handleEserClick(item, index) {
  selectedEserIndex.value = index
  bolumSec(true, item)
}

function bolumSec(bool, item) {
  bolumListesiBool.value = bool
  maddeVeri.value = item.madde || []
}

function toggleEser(index) {
  if (openEserIndices.value.includes(index))
    openEserIndices.value = openEserIndices.value.filter(i => i !== index)
  else openEserIndices.value.push(index)
}

function beyazSayfa() {
  beyazSayfaAktif.value = !beyazSayfaAktif.value
  const storedWhite = typeof window !== 'undefined'
      ? localStorage.getItem(`${eser.value}-${sayfaNo.value}-beyaz-lines`)
      : null
  beyazSayfaLines.value = storedWhite ? JSON.parse(storedWhite).lines || [] : []
}

watch([sayfaNo, eser], () => {
  git()
  loadNotes()
  loadFreeText()
  loadTexts()
})

watch(isDelete, (newVal) => {
  // İsteğe bağlı: delete modu için ek mantık eklenebilir
})

// ==================================================
// 11. Orientation & Window Events
// ==================================================
const isLandscape = ref(true)

function updateOrientation() {
  isLandscape.value = window.innerWidth >= window.innerHeight
}

const clientMounted = ref(false)
onMounted(() => {
  clientMounted.value = true
  const storedDevice = safeGetItem("deviceType")
  if (storedDevice) deviceType.value = storedDevice
})

onMounted(() => {
  function handleKeydown(e) {
    if (e.key.toLowerCase() === 'q') controlPanel.value = !controlPanel.value
    else if (e.key.toLowerCase() === 'e') sideBar.value = !sideBar.value
  }

  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', updateOrientation)
  git()
  loadNotes()
  loadFreeText()
  loadTexts()
  const storedData = typeof window !== 'undefined'
      ? localStorage.getItem(localStorageKey())
      : null
  if (storedData) {
    const parsedData = JSON.parse(storedData)
    if (beyazSayfaAktif.value) {
      beyazSayfaLines.value = parsedData.lines || []
      secilenRenk.value = parsedData.secilenRenk || secilenRenk.value
      cizgiGenisligi.value = parsedData.cizgiGenisligi || cizgiGenisligi.value
    } else {
      lines.value = parsedData.lines || []
      secilenRenk.value = parsedData.secilenRenk || secilenRenk.value
      cizgiGenisligi.value = parsedData.cizgiGenisligi || cizgiGenisligi.value
    }
  }
  defaultSayfa()
  updateOrientation()
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeydown)
    window.removeEventListener('resize', updateOrientation)
    if (requestRef.value) cancelAnimationFrame(requestRef.value)
  })
})

// ==================================================
// 12. Bookmark Functions
// ==================================================
const bookmarks = ref([])
const showBookmarkPanel = ref(false)
const currentEser = computed(() => route.query.eser || 'Default Eser')
const currentbolum = computed(() => route.query.bolum || 'default-bolum')
const currentslug = computed(() => route.query.slug || 'default-slug')
const currentSayfa = computed(() => Number(route.query.sayfa) || 1)

onMounted(() => {
  const saved = localStorage.getItem('bookmarks')
  if (saved) {
    try {
      bookmarks.value = JSON.parse(saved)
    } catch (e) {
      console.error('LocalStorage ayraçları okunurken hata:', e)
    }
  }
})
watch(
    bookmarks,
    (newVal) => {
      localStorage.setItem('bookmarks', JSON.stringify(newVal))
    },
    {deep: true}
)

watch(
    () => ({eser: route.query.eser, sayfa: route.query.sayfa}),
    async (newQuery) => {
      if (!data.value || !Array.isArray(data.value)) return
      const queryEser = newQuery.eser || "mektubat"
      const querySayfa = newQuery.sayfa ? Number(newQuery.sayfa) : 1
      const matchedEser = data.value.find(item =>
          item.madde &&
          item.madde.some(subItem =>
              subItem.eser &&
              subItem.eser.localeCompare(queryEser, 'tr', {sensitivity: 'base'}) === 0
          )
      )
      if (!matchedEser || !matchedEser.madde || !Array.isArray(matchedEser.madde)) {
        console.warn("Matching eser or madde not found for:", queryEser)
        return
      }
      const validMaddeler = matchedEser.madde.filter(entry => Number(entry.sayfa) <= querySayfa)
      let matchedMadde = null
      if (validMaddeler.length > 0) {
        validMaddeler.sort((a, b) => Number(b.sayfa) - Number(a.sayfa))
        matchedMadde = validMaddeler[0]
      }
      if (matchedMadde && matchedMadde.bolum) {
        if (route.query.bolum !== matchedMadde.bolum) {
          bolum.value = matchedMadde.bolum
          slug.value = matchedMadde.slug
          await router.replace({
            query: {...route.query, bolum: matchedMadde.bolum, slug: matchedMadde.slug}
          })
          console.log("bolum updated to:", matchedMadde.bolum)
        }
      } else {
        console.warn("Matching madde not found for page:", querySayfa)
      }
    },
    {immediate: true}
)

function showCard(yazi) {
  visible.value = true
  bildirimYazisi.value = yazi
  setTimeout(() => {
    visible.value = false
  }, 2000) // 2 saniye sonra kaybolur
}

function updateBookmarkStatus(index) {
  const bookmark = bookmarks.value[index]
  bookmark.status = bookmark.status === 'aktif' ? 'pasif' : 'aktif'
  bookmarks.value.splice(index, 1, bookmark)
}


const soruPaneliCard = ref(false);
const selectedBookmarkIndex = ref(null);

function confirmDelete(index) {
  // Silme işlemi için seçilen ayraç index'ini sakla
  selectedBookmarkIndex.value = index;
  soruPaneliCard.value = true;
}

function soruFunc(bool) {
  // Onaylandıysa (Evet) silme işlemini gerçekleştir
  if (bool === true && selectedBookmarkIndex.value !== null) {
    deleteBookmark(selectedBookmarkIndex.value);
  }
  // Seçilen index bilgisini sıfırla ve onay modalını kapat
  selectedBookmarkIndex.value = null;
  soruPaneliCard.value = false;
}

function deleteBookmark(index) {
  bookmarks.value.splice(index, 1);
}

function addBookmark() {
  const eserVal = currentEser.value
  const bolumVal = currentbolum.value
  const sayfaVal = currentSayfa.value
  const exists = bookmarks.value.some(bm => bm.eser === eserVal && bm.sayfa === sayfaVal)
  if (exists) {

    showCard("Bu sayfa zaten ayraç olarak eklenmiş!")
    return
  }
  const newBookmark = {
    id: Date.now(),
    eser: eserVal,
    bolum: bolumVal,
    sayfa: sayfaVal,
    status: 'aktif'
  }
  bookmarks.value.push(newBookmark)
  showCard('Ayraç eklendi!')

}

function toggleBookmarkPanel() {
  showBookmarkPanel.value = !showBookmarkPanel.value
}

function goToBookmark(bookmark) {
  const currentRoute = router.currentRoute.value
  router.push({
    name: currentRoute.name,
    query: {...currentRoute.query, eser: bookmark.eser, sayfa: bookmark.sayfa}
  })
      .then(() => {
        window.location.reload()
      })
      .catch(err => {
        if (err.name !== 'NavigationDuplicated') {
          console.error(err)
        }
      })
}

// ==================================================
// SS (Seçim) İşlevselliği
// ==================================================
const ssCreationMode = ref(false)
const ssBoxStart = ref(null)
const ssBoxEnd = ref(null)
const showSsModal = ref(false)
const ssPreviewUrl = ref(null)

// Screenshot alma fonksiyonu
const captureScreenshot = async () => {
  try {
    const element = document.querySelector('.screenshot-area')
    if (!element) return

    // CORS sorunlarını önlemek için options
    const options = {
      cacheBust: true,
      pixelRatio: 2,
      quality: 1.0,
      backgroundColor: '#ffffff',
      style: {
        transform: 'scale(1)',
        transformOrigin: 'top left',
        width: `${element.offsetWidth}px`,
        height: `${element.offsetHeight}px`
      }
    }

    const dataUrl = await toPng(element, options)
    ssPreviewUrl.value = dataUrl
    showSsModal.value = true

  } catch (error) {
    console.error('Screenshot alınırken hata oluştu:', error)
  }
}

// Paylaşım fonksiyonu
const shareScreenshot = async () => {
  try {
    if (!ssPreviewUrl.value) return

    if (Capacitor.isNativePlatform()) {
      // Base64'ü blob'a çevir
      const response = await fetch(ssPreviewUrl.value)
      const blob = await response.blob()

      // Geçici dosya oluştur
      const fileName = `screenshot-${Date.now()}.png`
      const file = new File([blob], fileName, {type: 'image/png'})

      // Capacitor Share API ile paylaş
      await Share.share({
        title: 'Ekran Görüntüsü',
        text: 'Mutalaa.online ekran görüntüsü',
        files: [file],
        dialogTitle: 'Ekran görüntüsünü paylaş'
      })
    }
  } catch (error) {
    console.error('Paylaşım sırasında hata oluştu:', error)
  }
}

// Screenshot modunu aç/kapa
const toggleScreenshotMode = () => {
  ssCreationMode.value = !ssCreationMode.value
  if (!ssCreationMode.value) {
    ssBoxStart.value = null
    ssBoxEnd.value = null
    showSsModal.value = false
    ssPreviewUrl.value = null
  }
}

// Screenshot alanı hesaplama
const currentSsBox = computed(() => {
  if (!ssBoxStart.value || !ssBoxEnd.value) return null
  const {x: x1, y: y1} = ssBoxStart.value
  const {x: x2, y: y2} = ssBoxEnd.value
  return {
    left: Math.min(x1, x2),
    top: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1)
  }
})

// ============
// Pointer Event İşlevleri (SS modu için örnek)
// ============
function handlePointerDown(e) {
  if (ssCreationMode.value) {
    ssBoxStart.value = {x: e.pageX, y: e.pageY}
    ssBoxEnd.value = {x: e.pageX, y: e.pageY}
    return
  }
  // Diğer modlarda gerekli işlemler...
}

function handlePointerMove(e) {
  if (ssCreationMode.value && ssBoxStart.value) {
    ssBoxEnd.value = {x: e.pageX, y: e.pageY}
    return
  }
}

function handlePointerUp(e) {
  if (ssCreationMode.value && ssBoxStart.value && ssBoxEnd.value) {
    finishSsCreation()
    return
  }
}

// --------------------------------------------------
// Computed: Temiz & Highlighted Text
// --------------------------------------------------

// ============
const {data: myData} = await useFetch("/api/istilahData", {key: 'static-istilah-data', lazy: true})

const istilahlar = computed(() => {
  // fetchedData.value varsa, onun içindeki 'data' dizisini döndür, yoksa boş array
  return myData.value?.data || []
})

const istilahSearch = ref("")
const filteredData = computed(() => {
  // Eğer arama kutusu boşsa tüm veriyi döndür
  if (!istilahSearch.value) return istilahlar.value;

  // item.istilah alanında arama sorgusunu (küçük harfe çevirerek) içeriyorsa filtrele
  return istilahlar.value.filter(item =>
      item.istilah.toLowerCase().includes(istilahSearch.value.toLowerCase())
  );
});


const {data: mukayese, error: mukayeseHata, refresh} = await useFetch('/api/mukayese', {
  query: {
    eser: route.query.eser || 'mektubat',
    sayfa: route.query.sayfa || '1'
  },
  default: () => ({
    success: true,
    data: [],
    count: 0
  })
});


// Veri yüklenme durumunu izle
watch(mukayese, (yeniDeger) => {
  if (yeniDeger) {
    console.log('mukayese yüklendi:', yeniDeger)
  }
})

// Hata durumunu izle
watch(mukayeseHata, (hata) => {
  if (hata) {
    console.error('Mukayese yükleme hatası:', hata)
  }
})

// Yükleme durumunu izle
console.log(data)

const longTextWithLineBreaks = computed(() => {

  if (mukayese.value.data.length > 0) {
    // Yeni bir değişken tanımlıyoruz
    let text = mukayeseData.value.data[0].icerik.sayfa;

    // Yeni satır karakterlerini <br> etiketleri ile değiştiriyoruz
    text = text.replace(/([\u0600-\u06FF]+)/g, '<span style="color: red;font-family:e-kalem Duz;font-weight:; letter-spacing: 0;  ">$1</span>');

    return text.replace(/\n/g, '<br>');
  }
  return '';
});


// Dil değişikliğini izle ve ilgili çizimleri, notları ve serbest metni yükle
watch(dil, (newDil) => {
  // Çizimler için
  const storedData = typeof window !== 'undefined'
      ? localStorage.getItem(localStorageKey())
      : null

  if (storedData) {
    const parsedData = JSON.parse(storedData)
    if (newDil) {
      osmLines.value = parsedData.lines || []
    } else {
      latLines.value = parsedData.lines || []
    }
    secilenRenk.value = parsedData.secilenRenk || secilenRenk.value
    cizgiGenisligi.value = parsedData.cizgiGenisligi || cizgiGenisligi.value
  } else {
    // Veri yoksa ilgili diziyi temizle
    if (newDil) {
      osmLines.value = []
    } else {
      latLines.value = []
    }
  }

  // Notlar için
  loadNotes()

  // Serbest metin için
  loadFreeText()

  // Yazılar için
  loadTexts()
})


const notIcon = ref(false)
const sayfaIcon = ref(false)
const ayracIcon = ref(false)


</script>


<template>
  <div>


    <div class="flex flex-col">
      <!-- Cihaz Seçim Modalı -->
      <div
          v-if="clientMounted && showDeviceModal"
          class="fixed inset-0 bg-gray-900/95 backdrop-blur-sm flex flex-col justify-center items-center z-50"
      >
        <h2 class="text-2xl text-white mb-8 font-bold">Lütfen Cihazınızı Seçin</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
          <div
              @click="selectDevice('pen')"
              class="bg-white/10 backdrop-blur-md rounded-2xl p-6 cursor-pointer hover:scale-105 transition-transform duration-300 border border-white/10"
          >
            <div class="text-center">
              <svg class="w-16 h-16 mx-auto text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
              </svg>
              <h3 class="mt-4 text-xl font-semibold text-white">Kalemli Cihaz</h3>
              <p class="mt-2 text-gray-300">Tablet veya dijital kalem kullanıyorsanız</p>
            </div>
          </div>
        </div>
        <!-- Other device options... -->
      </div>
    </div>
    <!-- Other content... -->
  </div>
  <div class="flex flex-col">
    <!-- Cihaz Seçim Modalı -->
    <div
        v-if="clientMounted && showDeviceModal"
        class="fixed inset-0 bg-gray-900/95 backdrop-blur-sm flex flex-col justify-center items-center z-50"
    >
      <h2 class="text-2xl text-white mb-8 font-bold">Lütfen Cihazınızı Seçin</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
        <div
            @click="selectDevice('pen')"
            class="bg-white/10 backdrop-blur-md rounded-2xl p-6 cursor-pointer hover:scale-105 transition-transform duration-300 border border-white/10"
        >
          <div class="text-center">
            <svg class="w-16 h-16 mx-auto text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
            </svg>
            <h3 class="mt-4 text-xl font-semibold text-white">Kalemli Cihaz</h3>
            <p class="mt-2 text-gray-300">Tablet veya dijital kalem kullanıyorsanız</p>
          </div>
        </div>

        <div
            @click="selectDevice('touch')"
            class="bg-white/10 backdrop-blur-md rounded-2xl p-6 cursor-pointer hover:scale-105 transition-transform duration-300 border border-white/10"
        >
          <div class="text-center">
            <svg class="w-16 h-16 mx-auto text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
            <h3 class="mt-4 text-xl font-semibold text-white">Dokunmatik Cihaz</h3>
            <p class="mt-2 text-gray-300">Telefon veya dokunmatik ekran kullanıyorsanız</p>
          </div>
        </div>
        <div
            @click="selectDevice('mouse')"
            class="bg-white/10 backdrop-blur-md rounded-2xl p-6 cursor-pointer hover:scale-105 transition-transform duration-300 border border-white/10"
        >
          <div class="text-center">
            <svg class="w-16 h-16 mx-auto text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
            </svg>
            <h3 class="mt-4 text-xl font-semibold text-white">Bilgisayar</h3>
            <p class="mt-2 text-gray-300">Fare ile kullanım için</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Orientation Overlay -->
    <div v-if="!isLandscape" class="orientation-overlay">
      <p>Lütfen cihazınızı yatay modda kullanın.</p>
    </div>

    <!-- Slot ve Nuxt Loading Indicator -->
    <slot v-else></slot>
    <NuxtLoadingIndicator height="4" class="rounded-full"/>

    <!-- Not Ekleme Modalı -->
    <div v-if="showNoteModal" class="fixed inset-0 bg-gray-800 bg-opacity-70 flex justify-center items-center z-20">
      <div class="bg-white p-8 rounded-3xl shadow-lg w-1/3">
        <h2 class="text-2xl text-center font-bold mb-6 text-blue-600">Not Ekle</h2>
        <div class="mb-6">
          <label for="note" class="block text-sm font-medium text-gray-800 mb-2">Notunuz:</label>
          <input
              type="text"
              id="note"
              v-model="noteText"
              @focus="sideBar = false;"
              class="w-full p-3 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
              placeholder="Notunuzu buraya yazın..."
          />
        </div>
        <div class="mb-6">
          <label for="priority" class="block text-sm font-medium text-gray-800 mb-2">Önem Derecesi:</label>
          <select
              id="priority"
              v-model="notePriority"
              @focus="sideBar = false;"
              class="w-full p-3 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
          >
            <option value="low">Düşük</option>
            <option value="medium">Orta</option>
            <option value="high">Yüksek</option>
          </select>
        </div>
        <div class="flex justify-end space-x-4">
          <button @click="closeNoteModal"
                  class="px-5 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition duration-200">
            İptal
          </button>
          <button @click="saveNote" class="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200">
            Kaydet
          </button>
        </div>
      </div>
    </div>

    <!-- Yazı Ekleme Modalı -->
    <div v-if="showTextModal" class="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex justify-center items-center z-50">
      <div class="bg-white rounded-2xl shadow-2xl w-11/12 max-w-2xl mx-4 overflow-hidden max-h-[90vh]">
        <!-- Modal Header -->
        <div class="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-white flex items-center">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              Yazı Ekle
            </h2>
            <button @click="closeTextModal" class="text-white hover:text-gray-200 transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Modal Content -->
        <div class="p-6 space-y-4 overflow-y-auto max-h-[60vh] modal-scroll">
          <!-- İlk Satır: Yazı İçeriği ve Önizleme -->
          <div class="grid grid-cols-2 gap-4">
            <!-- Yazı İçeriği -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Yazınız</label>
              <textarea
                  v-model="textContent"
                  @focus="sideBar = false;"
                  class="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 resize-none"
                  placeholder="Yazınızı buraya yazın..."
                  rows="3"
              ></textarea>
            </div>

            <!-- Önizleme -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Önizleme</label>
              <div 
                  class="h-[100px] flex items-center justify-center rounded-lg bg-white p-3 border-2 border-gray-200"
                  :style="{
                    color: textColor,
                    fontSize: textSize + 'px',
                    fontFamily: textFont
                  }"
              >
                {{ textContent || 'Yazınız burada görünecek...' }}
              </div>
            </div>
          </div>

          <!-- İkinci Satır: Renk Seçimi -->
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Renk</label>
            <div class="grid grid-cols-9 gap-2">
              <button
                  v-for="color in textColors"
                  :key="color"
                  @click="textColor = color"
                  class="w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110"
                  :class="textColor === color ? 'border-gray-800 scale-110 shadow-lg' : 'border-gray-300'"
                  :style="{ backgroundColor: color }"
                  :title="color"
              ></button>
            </div>
          </div>

          <!-- Üçüncü Satır: Boyut ve Font -->
          <div class="grid grid-cols-2 gap-4">
            <!-- Boyut Ayarı -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Boyut: {{ textSize }}px</label>
              <div class="relative">
                <input
                    type="range"
                    v-model="textSize"
                    min="12"
                    max="48"
                    step="2"
                    class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div class="flex justify-between text-xs text-gray-500 mt-1">
                  <span>12px</span>
                  <span>48px</span>
                </div>
              </div>
            </div>

            <!-- Font Seçimi -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Font</label>
              <select
                  v-model="textFont"
                  @focus="sideBar = false;"
                  class="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
              >
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Georgia">Georgia</option>
                <option value="Verdana">Verdana</option>
                <option value="Courier New">Courier New</option>
                <option value="Comic Sans MS">Comic Sans MS</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
          <button 
              @click="closeTextModal"
              class="px-5 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-all duration-200 font-medium"
          >
            İptal
          </button>
          <button 
              @click="saveText" 
              :disabled="!textContent.trim()"
              class="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            Kaydet
          </button>
        </div>
      </div>
    </div>
    <!-- SS Onay Modalı -->
    <div v-if="showSsModal" class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-20">
      <div class="bg-white p-6 rounded-2xl shadow-lg w-80">
        <h2 class="text-xl font-semibold mb-4">Ekran Görüntüsü</h2>
        <p class="mb-4">Seçilen alanın görüntüsünü kaydetmek istiyor musunuz?</p>

        <!-- Önizleme Görüntüsü -->
        <div class="mb-4">
          <img
              v-if="ssPreviewUrl"
              :src="ssPreviewUrl"
              alt="Seçilen Görüntü"
              class="w-full h-auto border border-gray-300 rounded-lg"
          />
          <p v-else class="text-gray-500 text-center">Görüntü yükleniyor...</p>
        </div>

        <div class="flex justify-end space-x-2">
          <button
              @click="closeSsModal"
              class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
          >
            İptal
          </button>
          <button
              @click="finishSsCreation"
              class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Kaydet
          </button>
    
        </div>
      </div>
    </div>
    <!-- Yeni Not Modu Overlay -->
    <div v-if="noteCreationMode" class="new-note-overlay"></div>
    <div v-if="ssCreationMode" class="new-note-overlay"></div>

    <!-- Normal Çizim & Not Alanı -->
    <div
        v-if="!beyazSayfaAktif"
        class="relative overflow-hidden touch-none"
        :class="{ 'text-cursor': textMode }"
        :style="{ touchAction: touchActionStyle, 'scroll-behavior': deviceType === 'pen' ? 'smooth' : 'auto' }"
        @pointerdown="pointerDown"
        @pointermove="pointerMove"
        id="risale-image"
        @pointerup="pointerUp"
        @pointercancel="pointerUp"
        @click="sideBar=false"
    >
      <!-- SVG Çizimler -->
      <svg v-if="!gizle" class="absolute w-full h-full">
        <line
          v-for="line in lines"
          :key="line.id"
          :x1="line.x1"
          :y1="line.y1"
          :x2="line.x2"
          :y2="line.y2"
          :stroke="line.color"
          :stroke-width="line.width"
          stroke-linecap="round"
        />
      </svg>

      <!-- Not Kutusu Önizlemesi -->
      <div
          v-if="noteBoxStart && noteBoxEnd && currentNoteBox"
          :style="{
          position: 'absolute',
          borderRadius: '10px',
          border: '2px solid #4A90E2', /* Renk değiştirildi */
          left: currentNoteBox.left + 'px',
          top: currentNoteBox.top + 'px',
          width: currentNoteBox.width + 'px',
          height: currentNoteBox.height + 'px',
          transition: 'all 0.1s ease' /* Geçiş efekti eklendi */
        }"
      ></div>

      <div
          v-if="ssBoxStart && ssBoxEnd && currentSsBox"
          :style="{
          position: 'absolute',
borderRadius:'10px',
          border: '2px dashed #000',
          left: currentSsBox.left + 'px',
          top: currentSsBox.top + 'px',
          width: currentSsBox.width + 'px',
          height: currentSsBox.height + 'px'
        }"
      ></div>

      <!-- Kayıtlı Notlar -->
      <div
          v-for="note in notes"
          :key="note.id"
          class="note-box transition-transform duration-300 ease-in-out shadow-lg hover:shadow-xl"
          :class="{ 'disable-hover': drawing || noteCreationMode, 'selected-note': activeNote === note.id }"
          :style="{
            backgroundColor: note.color + '20', // note.color'un %20 opaklığı
          left: note.left + 'px',
          top: note.top + 'px',
          width: note.width + 'px',
          height: note.height + 'px',
          border: '2px solid ' + note.color,
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)' /* Gölge efekti eklendi */
        }"
      >
        <div class="note-overlay p-2 rounded-lg bg-white shadow-md">
          <span class="text-gray-800 font-semibold">{{ note.text }}</span>
          <button @pointerdown.stop @click.stop="deleteNote(note.id)" class="delete-btn text-red-500 hover:text-red-700" title="Notu Sil">
            &times;
          </button>
        </div>
      </div>

      <!-- Serbest Yazı (Free Text) Görüntüleme -->
      <div
          v-if="freeText && !freeTextModeActive"
          @click="toggleFreeTextMode"
          style="position: absolute; top: 10px; left: 10px; background: rgba(255,255,255,0.8); padding: 5px; border: 1px solid #ccc; cursor: pointer;"
      >
        {{ freeText }}
      </div>

      <!-- Kayıtlı Yazılar -->
      <div
          v-for="text in texts"
          :key="text.id"
          class="text-element transition-transform duration-300 ease-in-out shadow-lg hover:shadow-xl relative group"
          :class="{ 'disable-hover': drawing || noteCreationMode || textMode }"
          :style="{
            position: 'absolute',
            left: text.x + 'px',
            top: text.y + 'px',
            color: text.color,
            fontSize: text.size + 'px',
            fontFamily: text.font,
            backgroundColor: 'rgba(255,255,255,0.9)',
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid rgba(0,0,0,0.1)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            zIndex: 15,
            pointerEvents: 'auto'
          }"
          @click.stop
          @pointerdown.stop
      >
        {{ text.content }}
        <!-- Silme Butonu -->
        <button
            @click.stop.prevent="deleteText(text.id)"
            @mousedown.stop.prevent
            @touchstart.stop.prevent
            class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600 shadow-lg cursor-pointer"
            style="z-index: 25; pointer-events: auto;"
            title="Yazıyı sil"
        >
          ×
        </button>
      </div>

      <!-- Arka Plan Resmi -->
      <img
          v-if="dil"
          draggable="false"
          @contextmenu.prevent
          class="relative border-black rounded-lg object-contain"
          :src="sayfaAc"
          alt=""
      />


      <!--  v-html="highlightedText"-->
      <div v-else class="z-[32456786543] py-20 flex justify-center items-center min-h-screen bg-gradient-to-r from-blue-50 to-blue-100">
        <div class="bg-white p-8 rounded-lg shadow-xl max-w-6xl w-full mx-4 border border-gray-300">
          <!-- Veriyi düzgün bir şekilde görüntülemek için HTML etiketleriyle dönüştürme -->
          <p class="mukayeseliYazı relative text-gray-800 text-lg leading-relaxed text-center py-16 font-semibold"
             v-html="longTextWithLineBreaks"></p>
        </div>
      </div>
    </div>

    <!-- Beyaz Sayfa Modu -->
    <div v-if="beyazSayfaAktif" class="fixed inset-0 z-40 flex items-center justify-center">
      <!-- Karanlık Overlay -->
      <div class="absolute inset-0 bg-black opacity-60"></div>
      <!-- Beyaz Çizim Paneli -->
      <div
          class="relative bg-white rounded-lg shadow-2xl w-11/12 max-w-5xl h-[90%] overflow-hidden touch-none border border-gray-300 transition-transform transform"
          :style="{ touchAction: 'none' }"
          @pointerdown="pointerDown"
          @pointermove="pointerMove"
          @pointerup="pointerUp"
          @pointercancel="pointerUp"
      >
        <svg class="absolute inset-0 w-full h-full pointer-events-auto">
          <line
              v-for="line in beyazSayfaLines"
              :key="line.id"
              :x1="line.x1"
              :y1="line.y1"
              :x2="line.x2"
              :y2="line.y2"
              :stroke="line.color"
              :stroke-width="line.width"
              stroke-linecap="round"
          />
        </svg>
      </div>
    </div>

    <!-- Sayfa Kontrol Butonları -->
    <div class="fixed bottom-3 w-full flex justify-center gap-4 px-4 z-30">
      <button
          @click="sayfaNo++"
          class="px-6 py-2 md:px-8 md:py-3 bg-gradient-to-r from-blue-600 to-blue-400 text-white font-bold rounded-lg shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95"
      >
        <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
          <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
          <g id="SVGRepo_iconCarrier">
            <path
                d="M14.2893 5.70708C13.8988 5.31655 13.2657 5.31655 12.8751 5.70708L7.98768 10.5993C7.20729 11.3805 7.2076 12.6463 7.98837 13.427L12.8787 18.3174C13.2693 18.7079 13.9024 18.7079 14.293 18.3174C14.6835 17.9269 14.6835 17.2937 14.293 16.9032L10.1073 12.7175C9.71678 12.327 9.71678 11.6939 10.1073 11.3033L14.2893 7.12129C14.6799 6.73077 14.6799 6.0976 14.2893 5.70708Z"
                fill="#FFFFFF"></path>
          </g>
        </svg>
      </button>
      <button
          @click="sayfaNo--"
          class="px-6 py-2 md:px-8 md:py-3 bg-gradient-to-r from-gray-400 to-gray-300 text-gray-800 font-bold rounded-lg shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95"
      >
        <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
          <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
          <g id="SVGRepo_iconCarrier">
            <path
                d="M9.71069 18.2929C10.1012 18.6834 10.7344 18.6834 11.1249 18.2929L16.0123 13.4006C16.7927 12.6195 16.7924 11.3537 16.0117 10.5729L11.1213 5.68254C10.7308 5.29202 10.0976 5.29202 9.70708 5.68254C9.31655 6.07307 9.31655 6.70623 9.70708 7.09676L13.8927 11.2824C14.2833 11.6729 14.2833 12.3061 13.8927 12.6966L9.71069 16.8787C9.32016 17.2692 9.32016 17.9023 9.71069 18.2929Z"
                fill="#FFFFFF"></path>
          </g>
        </svg>
      </button>
    </div>

    <!-- Ayraç Paneli Modalı -->
    <div
        v-if="showBookmarkPanel"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
    >
      <div class="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 relative h-[85%] overflow-y-auto">
        <!-- Kapat Butonu -->
        <button
            class="absolute top-4 right-4 text-gray-600 hover:text-gray-800 transition"
            @click="toggleBookmarkPanel"
        >
          ✖
        </button>
        <h2 class="text-3xl font-semibold mb-6 text-gray-900 text-center">Ayraçlarım</h2>
        <div v-if="bookmarks.length === 0" class="text-gray-500 text-center py-4">
          Henüz ayraç eklenmedi.
        </div>
        <ul class="divide-y divide-gray-300">
          <li
              v-for="(bookmark, index) in bookmarks"
              :key="bookmark.id"
              class="overflow-auto py-4 flex items-center justify-between hover:bg-gray-100 rounded-lg transition px-4 cursor-pointer"
              @click="goToBookmark(bookmark)"
          >
            <div>
              <h3 class="text-lg font-semibold text-gray-800">{{ bookmark.eser }}</h3>
              <p class="text-sm text-gray-600">
                {{ bookmark.bolum }} - {{ bookmark.sayfa }}. Sayfa
              </p>
            </div>
            <button
                class="text-red-600 hover:text-red-800 transition"
                @click.stop="confirmDelete(index)"
            >
              Sil
            </button>
          </li>
        </ul>
      </div>
    </div>


    <div v-if="controlPanel" class="fixed top-4 right-0 z-40 flex items-center pt-3">
      <button
          @click="controlPanel = !controlPanel"
          class="py-3 px-2 rounded-l-lg text-white text-sm font-medium transition-all shadow-sm"
          :class="ssCreationMode ? 'bg-blue-600 hover:bg-blue-700 -translate-y-1' : 'bg-blue-500 hover:bg-blue-600'"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white hover:text-white" fill="none"
             stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15.293 3.293L6.586 12l8.707 8.707 1.414-1.414L9.414 12l7.293-7.293-1.414-1.414z"/>
        </svg>
      </button>
    </div>


    <!-- Çizim Paneli Kontrolü -->
    <transition name="slide-right">
      <div
          v-if="!controlPanel"
          class="fixed top-4 left-1/2 transform -translate-x-1/2 flex items-center backdrop-blur-xl shadow-lg rounded-full px-8 py-4 z-40 space-x-6 border border-gray-300 bg-white shadow-lg transition-all duration-300">
        <div class="flex items-center space-x-4">
          <div class="group relative inline-block">
            <control-panelicon-buton @click="temizle()" cls="temizle">
              <svg class="h-6 w-6 text-gray-700 hover:text-blue-500 transition" fill="#eee" viewBox="0 0 32 32">
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g id="SVGRepo_tracerCarrier"></g>
                <g id="SVGRepo_iconCarrier">
                  <path
                      d="M7.004 23.087l7.08-7.081-7.07-7.071L8.929 7.02l7.067 7.069L23.084 7l1.912 1.913-7.089 7.093 7.075 7.077-1.912 1.913-7.074-7.073L8.917 25z"
                  ></path>
                </g>
              </svg>
            </control-panelicon-buton>
            <icon-bilgi-cart class="text-gray-700">Temizle</icon-bilgi-cart>
          </div>

          <div class="group relative inline-block" cls="silgi">
            <control-panelicon-buton
                @click="isDelete = !isDelete" cls="silgi"
                :class="{ 'translate-y-[-6px] shadow-black shadow-lg border-2 text-white': isDelete }"
            >
              <svg class="h-6 w-6 text-gray-700 hover:text-blue-500 transition" viewBox="0 0 24 24" fill="none">
                <g id="SVGRepo_bgCarrier"></g>
                <g id="SVGRepo_tracerCarrier"></g>
                <g id="SVGRepo_iconCarrier">
                  <path
                      d="M5.50506 11.4096L6.03539 11.9399L5.50506 11.4096ZM3 14.9522H2.25H3ZM12.5904 18.4949L12.0601 17.9646L12.5904 18.4949ZM9.04776 21V21.75V21ZM11.4096 5.50506L10.8792 4.97473L11.4096 5.50506ZM13.241 17.8444C13.5339 18.1373 14.0088 18.1373 14.3017 17.8444C14.5946 17.5515 14.5946 17.0766 14.3017 16.7837L13.241 17.8444ZM7.21629 9.69832C6.9234 9.40543 6.44852 9.40543 6.15563 9.69832C5.86274 9.99122 5.86274 10.4661 6.15563 10.759L7.21629 9.69832ZM16.073 16.073C16.3659 15.7801 16.3659 15.3053 16.073 15.0124C15.7801 14.7195 15.3053 14.7195 15.0124 15.0124L16.073 16.073ZM18.4676 11.5559C18.1759 11.8499 18.1777 12.3248 18.4718 12.6165C18.7658 12.9083 19.2407 12.9064 19.5324 12.6124L18.4676 11.5559ZM6.03539 11.9399L11.9399 6.03539L10.8792 4.97473L4.97473 10.8792L6.03539 11.9399ZM6.03539 17.9646C5.18538 17.1146 4.60235 16.5293 4.22253 16.0315C3.85592 15.551 3.75 15.2411 3.75 14.9522H2.25C2.25 15.701 2.56159 16.3274 3.03 16.9414C3.48521 17.538 4.1547 18.2052 4.97473 19.0253L6.03539 17.9646ZM4.97473 10.8792C4.1547 11.6993 3.48521 12.3665 3.03 12.9631C2.56159 13.577 2.25 14.2035 2.25 14.9522H3.75C3.75 14.6633 3.85592 14.3535 4.22253 13.873C4.60235 13.3752 5.18538 12.7899 6.03539 11.9399L4.97473 10.8792ZM12.0601 17.9646C11.2101 18.8146 10.6248 19.3977 10.127 19.7775C9.64651 20.1441 9.33665 20.25 9.04776 20.25V21.75C9.79649 21.75 10.423 21.4384 11.0369 20.97C11.6335 20.5148 12.3008 19.8453 13.1208 19.0253L12.0601 17.9646ZM4.97473 19.0253C5.79476 19.8453 6.46201 20.5148 7.05863 20.97C7.67256 21.4384 8.29902 21.75 9.04776 21.75V20.25C8.75886 20.25 8.449 20.1441 7.9685 19.7775C7.47069 19.3977 6.88541 18.8146 6.03539 17.9646L4.97473 19.0253ZM17.9646 6.03539C18.8146 6.88541 19.3977 7.47069 19.7775 7.9685C20.1441 8.449 20.25 8.75886 20.25 9.04776H21.75C21.75 8.29902 21.4384 7.67256 20.97 7.05863C20.5148 6.46201 19.8453 5.79476 19.0253 4.97473L17.9646 6.03539ZM19.0253 4.97473C18.2052 4.1547 17.538 3.48521 16.9414 3.03C16.3274 2.56159 15.701 2.25 14.9522 2.25V3.75C15.2411 3.75 15.551 3.85592 16.0315 4.22253C16.5293 4.60235 17.1146 5.18538 17.9646 6.03539L19.0253 4.97473ZM11.9399 6.03539C12.7899 5.18538 13.3752 4.60235 13.873 4.22253C14.3535 3.85592 14.6633 3.75 14.9522 3.75V2.25C14.2035 2.25 13.577 2.56159 12.9631 3.03C12.3665 3.48521 11.6993 4.1547 10.8792 4.97473L11.9399 6.03539ZM14.3017 16.7837L7.21629 9.69832L6.15563 10.759L13.241 17.8444L14.3017 16.7837ZM15.0124 15.0124L12.0601 17.9646L13.1208 19.0253L16.073 16.073L15.0124 15.0124ZM19.5324 12.6124C20.1932 11.9464 20.7384 11.3759 21.114 10.8404C21.5023 10.2869 21.75 9.71511 21.75 9.04776H20.25C20.25 9.30755 20.1644 9.58207 19.886 9.979C19.5949 10.394 19.1401 10.8781 18.4676 11.5559L19.5324 12.6124Z"
              fill="#1C274C"
          ></path>
          <path
              d="M9 21H21"
              stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"
          ></path>
        </g>
      </svg>
    </control-panelicon-buton>
    <icon-bilgi-cart class="text-gray-700">Silgi</icon-bilgi-cart>
  </div>

  <div class="group relative inline-block">
    <control-panelicon-buton
        cls="not"
        :active="noteCreationMode"
        @click="activateNoteCreation(); beyazSayfaAktif = false; showBookmarkPanel = false"
        :class="{ 'translate-y-[-6px] shadow-black shadow-lg border-2 text-white': notIcon }"
    >
      <svg class="h-6 w-6 text-gray-700 hover:text-blue-500 transition" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g stroke-width="0"></g>
        <g stroke-linecap="round" stroke-linejoin="round"></g>
        <g>
          <path
              d="M20 14V7C20 5.34315 18.6569 4 17 4H7C5.34315 4 4 5.34315 4 7V17C4 18.6569 5.34315 20 7 20H13.5M20 14L13.5 20M20 14H15.5C14.3954 14 13.5 14.8954 13.5 16V20"
              stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          ></path>
        </g>
      </svg>
    </control-panelicon-buton>
    <icon-bilgi-cart class="text-gray-700">Not</icon-bilgi-cart>
  </div>

  <div class="group relative inline-block">
    <control-panelicon-buton
        cls="text"
        :active="textMode"
        @click="activateTextMode(); beyazSayfaAktif = false; showBookmarkPanel = false; noteCreationMode = false"
        :class="{ 'translate-y-[-6px] shadow-black shadow-lg border-2 text-white': textMode }"
    >
      <svg class="h-6 w-6 text-gray-700 hover:text-blue-500 transition" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g stroke-width="0"></g>
        <g stroke-linecap="round" stroke-linejoin="round"></g>
        <g>
          <path
              d="M4 6h16M4 12h16M4 18h12"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          ></path>
        </g>
      </svg>
    </control-panelicon-buton>
    <icon-bilgi-cart class="text-gray-700">Yazı</icon-bilgi-cart>
  </div>

  <div class="group relative inline-block" @mouseleave="penMenuAcik = false">
    <control-panelicon-buton cls="boyut"
                             @mouseenter="penMenuAcik=true,noteCreationMode = false; showBookmarkPanel = false">
      <svg class="h-6 w-6 text-gray-700 hover:text-blue-500 transition" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
        <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
        <g id="SVGRepo_iconCarrier">
          <path
              d="M16 5L18.5 2.5C19.3284 1.67157 20.6716 1.67157 21.5 2.5C22.3284 3.32843 22.3284 4.67157 21.5 5.5L19 8M16 5L10.5 10.5M16 5L19 8M19 8L13.5 13.5M13.5 13.5L7.5 19.5L2.5 21.5L4.5 16.5L10.5 10.5M13.5 13.5L10.5 10.5"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          ></path>
        </g>
      </svg>
    </control-panelicon-buton>
    <icon-bilgi-cart class="text-gray-700">Boyut</icon-bilgi-cart>
    <div
        v-if="penMenuAcik"
        @mouseenter="penMenuAcik = true"
        class="absolute left-0 top-full mb-2 w-32 bg-white p-2 rounded-lg shadow-lg transition-all duration-200"
    >
      <input
          type="range"
          min="2"
          max="30"
          v-model="cizgiGenisligi"
          class="w-full h-1 bg-gray-300 rounded-lg appearance-none accent-blue-500"
      />
    </div>
  </div>
</div>

<div class="relative max-w-[12rem]">
  <div class="overflow-x-auto scrollbar-none border-2 border-gray-300 rounded-full shadow-lg">
    <div class="flex items-center space-x-2 py-2">
      <button
          v-for="renk in renkler"
          :key="renk"
          @click="secilenRenk = renk"
          :class="[
            'p-4 rounded-full transition-all duration-200 transform hover:scale-105',
            secilenRenk === renk ? 'border-blue-600 shadow-md ring-2 ring-blue-400 translate-y-[-4px]' : 'border-gray-300'
          ]"
          :style="{ backgroundColor: renk }"
      >
        <svg
            v-if="secilenRenk === renk"
            class="mx-auto text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
      </button>
    </div>
  </div>
</div>

<div class="flex items-center space-x-4">
  <div class="group relative inline-block">
    <control-panelicon-buton cls="temizSayfa"
                             @click="beyazSayfa(); noteCreationMode = false; showBookmarkPanel = false, sayfaIcon=!sayfaIcon"
                             :class="{ 'translate-y-[-6px] shadow-black shadow-lg border-2 text-white': sayfaIcon }">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-700 hover:text-blue-500 transition" fill="none" viewBox="0 0 24 24"
           stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 2v6h6"/>
      </svg>
    </control-panelicon-buton>
    <icon-bilgi-cart class="text-gray-700">Boş_Alan</icon-bilgi-cart>
  </div>

  <div class="group relative inline-block">
    <control-panelicon-buton cls="ayrac" @click="addBookmark"
                             :class="{ 'translate-y-[-4px] shadow-lg': ayracIcon }"
    >
      <svg class="h-6 w-6 text-gray-700 hover:text-blue-500 transition" viewBox="0 0 24 24" fill="none">
        <g id="SVGRepo_bgCarrier"></g>
        <g id="SVGRepo_tracerCarrier"></g>
        <g id="SVGRepo_iconCarrier">
          <path
              d="M5 6.2C5 5.07989 5 4.51984 5.21799 4.09202C5.40973 3.71569 5.71569 3.40973 6.09202 3.21799C6.51984 3 7.07989 3 8.2 3H15.8C16.9201 3 17.4802 3 17.908 3.21799C18.2843 3.40973 18.5903 3.71569 18.782 4.09202C19 4.51984 19 5.07989 19 6.2V21L12 16L5 21V6.2Z"
              stroke="#000000" stroke-width="2" stroke-linejoin="round"
          ></path>
        </g>
      </svg>
    </control-panelicon-buton>
    <icon-bilgi-cart class="text-gray-700">Ayraç</icon-bilgi-cart>
  </div>

  <div class="group relative inline-block">
    <control-panelicon-buton cls="panel" @click="controlPanel = !controlPanel">
      <svg class="w-6 h-6 text-gray-700 hover:text-blue-500 transition" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g id="SVGRepo_bgCarrier" stroke-width="1"></g>
        <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
        <g id="SVGRepo_iconCarrier">
          <path
              d="M21.97 15V9C21.97 4 19.97 2 14.97 2H8.96997C3.96997 2 1.96997 4 1.96997 9V15C1.96997 20 3.96997 22 8.96997 22H14.97C19.97 22 21.97 20 21.97 15Z"
              stroke="#292D32" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
          <path d="M14.97 2V22" stroke="#292D32" stroke-width="1.5" stroke-linecap="round"
                stroke-linejoin="round"></path>
          <path d="M7.96997 9.43994L10.53 11.9999L7.96997 14.5599" stroke="#292D32" stroke-width="1.5"
                stroke-linecap="round" stroke-linejoin="round"></path>
        </g>
      </svg>
    </control-panelicon-buton>
    <icon-bilgi-cart class="text-gray-700">Gizle</icon-bilgi-cart>
  </div>

  <div class="group relative inline-block">
    <control-panelicon-buton cls="dil"
                             @click="dil=!dil,dahaFazla=false, beyazSayfaAktif = false; showBookmarkPanel = false"
    >
      <svg v-if="dil" data-v-decbe06a="" xmlns="http://www.w3.org/2000/svg" fill="none"
           viewBox="0 0 24 24" class="w-6 h-6 flex-shrink-0">
        <g clip-path="url(#i-1732953757__a)">
          <path fill="#B3B3B3"
                d="M9.63 8.796 4.925 21.755H3L8.42 7.536h1.24l-.03 1.26Zm3.946 12.959L8.86 8.795 8.83 7.537h1.24l5.44 14.219h-1.934Zm-.244-5.264v1.543H5.344v-1.543h7.988Z"></path>
          <path fill="#0A2540" stroke="#fff"
                d="m18.199 4.187.06-.204-.106-.185a1.963 1.963 0 0 0-.536-.607 2.636 2.636 0 0 0-.666-.38 3.933 3.933 0 0 0-.685-.209 5.74 5.74 0 0 0-.673-.1l-.039-.003-.038.002a3.738 3.738 0 0 0-1.702.542l-.004.002a3.082 3.082 0 0 0-1.198 1.363c-.202.324-.321.671-.321 1.036 0 .325.06.642.176.949l.002.006c.112.284.263.559.45.823h-.001l.005.008.216.291c-.131.126-.264.256-.398.39a9.836 9.836 0 0 0-.726.782 8.45 8.45 0 0 0-.64.875l-.001.004c-.19.303-.348.613-.473.931l-.005.013-.005.014a7.243 7.243 0 0 0-.364 2.078 8.213 8.213 0 0 0 .195 2.031v.005c.158.668.395 1.3.712 1.896a7.389 7.389 0 0 0 1.171 1.647 5.086 5.086 0 0 0 1.848 1.34c.684.29 1.394.464 2.127.52a8.827 8.827 0 0 0 2.196-.082 13.784 13.784 0 0 0 2.058-.461l.032-.01.03-.014c.099-.045.197-.087.295-.125.128-.04.251-.09.37-.149.138-.059.266-.134.383-.227.156-.115.28-.261.366-.435l.376-.75-.84.026c-.792.026-1.598.03-2.417.013h-.005a12.503 12.503 0 0 1-2.325-.238 7.55 7.55 0 0 1-2.059-.735c-.61-.33-1.16-.803-1.643-1.433l-.006-.007-.005-.006a3.46 3.46 0 0 1-.583-1.018 4.07 4.07 0 0 1-.245-1.176 4.618 4.618 0 0 1 .095-1.227 4.51 4.51 0 0 1 .405-1.13c.177-.296.39-.566.643-.811a4.95 4.95 0 0 1 .855-.665l.008-.005c.31-.2.636-.362.977-.489.348-.129.698-.226 1.052-.29l.038-.007.037-.013c.15-.052.315-.083.495-.09H17.181c.242-.019.476-.041.702-.068l.009-.001.008-.002c.26-.04.51-.106.746-.198.301-.118.547-.322.742-.586.168-.225.214-.492.204-.742a1.124 1.124 0 0 0-.29-.771l-.12-.13-.176-.026a2.964 2.964 0 0 0-.903.014 7.276 7.276 0 0 0-.843.165c-.256.06-.517.12-.782.18-.22.043-.433.061-.64.055a1.513 1.513 0 0 1-.512-.132c-.123-.067-.265-.19-.419-.404a4.79 4.79 0 0 0-.239-.35 1.568 1.568 0 0 1-.145-.23 1.253 1.253 0 0 1-.075-.21.37.37 0 0 1 .004-.082.422.422 0 0 1 .163-.113l.011-.003.011-.004a.631.631 0 0 1 .287-.037l.013.001h.012c.125.007.258.032.403.08l.006.002c.183.059.362.12.536.187l.013.005.014.004c.202.065.402.12.597.167l.014.003.013.003c.25.045.499.046.745-.001l.062-.012.057-.027c.231-.108.423-.274.556-.496l.007-.012c.096-.17.172-.35.227-.535Z"></path>
        </g>
        <defs>
          <clipPath id="i-1732953757__a">
            <path fill="#fff" d="M0 0h24v24H0z"></path>
          </clipPath>
        </defs>
      </svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"
           class="w-6 h-6 flex-shrink-0">
        <g clip-path="url(#i-1133373496__a)">
          <path fill="#B3B3B3"
                d="M17.72 4.046a2.067 2.067 0 0 1-.184.431.764.764 0 0 1-.34.3c-.183.036-.37.036-.562 0a7.857 7.857 0 0 1-.562-.156c-.183-.07-.37-.135-.562-.196a2.01 2.01 0 0 0-.536-.105 1.13 1.13 0 0 0-.51.066c-.165.052-.322.17-.47.353a.957.957 0 0 0-.04.405c.027.113.066.226.118.34.052.104.118.209.196.313.079.105.153.214.222.327.192.27.397.462.615.575.226.105.462.166.706.183.252.01.51-.013.77-.065.271-.061.537-.122.798-.183.27-.07.536-.122.798-.157.261-.043.514-.048.758-.013a.63.63 0 0 1 .157.444c.008.183-.026.327-.105.432-.148.2-.322.34-.523.418-.2.079-.414.135-.64.17-.218.026-.445.048-.68.065-.227.01-.44.048-.64.118-.384.07-.763.174-1.138.314-.374.14-.732.318-1.072.536-.34.209-.653.453-.94.732a4.406 4.406 0 0 0-.733.928 5.017 5.017 0 0 0-.562 2.627c.026.454.118.894.275 1.32.156.428.379.815.666 1.164.523.68 1.124 1.203 1.804 1.569.689.366 1.42.627 2.196.784.785.157 1.59.24 2.419.248.827.018 1.642.013 2.444-.013a.713.713 0 0 1-.222.262c-.087.07-.183.126-.288.17a2.13 2.13 0 0 1-.327.13 5.691 5.691 0 0 0-.34.144c-.618.192-1.28.34-1.986.445-.698.113-1.39.139-2.079.078a6.245 6.245 0 0 1-1.974-.484 4.59 4.59 0 0 1-1.673-1.215 6.89 6.89 0 0 1-1.098-1.543 7.395 7.395 0 0 1-.667-1.778 7.716 7.716 0 0 1-.183-1.908c.018-.654.131-1.299.34-1.935a5.2 5.2 0 0 1 .432-.85c.183-.287.383-.561.6-.823.219-.261.45-.51.694-.745.244-.244.483-.475.719-.693-.157-.2-.318-.414-.484-.64a3.43 3.43 0 0 1-.392-.72 2.16 2.16 0 0 1-.144-.77c0-.262.087-.528.261-.798a2.587 2.587 0 0 1 1.02-1.176A3.238 3.238 0 0 1 15.55 3c.2.017.405.048.615.091.209.044.41.105.6.184.201.078.384.183.55.313.166.122.3.275.405.458Z"></path>
          <path fill="#000" stroke="#fff"
                d="m5.394 21.926 1.232-3.392h5.246l1.234 3.392.12.329h3.01l-.26-.679-5.439-14.219-.123-.32H8.075l-.122.321-5.42 14.219-.259.678h3l.12-.33Zm2.155-5.935 1.697-4.671 1.7 4.671H7.55Z"></path>
        </g>
        <defs>
          <clipPath id="i-1133373496__a">
            <path fill="#fff" d="M0 0h24v24H0z"></path>
          </clipPath>
        </defs>
      </svg>
    </control-panelicon-buton>
    <icon-bilgi-cart class="text-gray-700">Huruf</icon-bilgi-cart>
  </div>

  <div class="relative inline-block">
    <div class="group relative inline-block">
      <control-panelicon-buton cls="dahaFazla"
                               @click="dahaFazla = !dahaFazla"
      >
        <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="#000000" class="w-6 h-6 text-gray-700 hover:text-blue-500 transition">
          <path
              d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
        </svg>
      </control-panelicon-buton>
      <icon-bilgi-cart class="text-gray-700">Daha_Fazla</icon-bilgi-cart>
    </div>
    <transition name="slide-down">
      <div v-if="dahaFazla" class="absolute flex flex-col gap-2 pt-2">
        <div class="group relative inline-block">
          <control-panelicon-buton cls="ayraclar"
                                   @click="toggleBookmarkPanel();dahaFazla=false, beyazSayfaAktif = false; noteCreationMode = false">
            <svg class="w-6 h-6 text-gray-700 hover:text-blue-500 transition" fill="#000000" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"
                 stroke="#000000" stroke-width="6.4">
              <path
                  d="M160,60H64A12.01343,12.01343,0,0,0,52,72V224a4.00021,4.00021,0,0,0,6.3252,3.25488L111.99268,188.916l53.68261,38.33886A3.99976,3.99976,0,0,0,172,224V72A12.01343,12.01343,0,0,0,160,60Zm4,156.22754-49.68262-35.48242a3.99976,3.99976,0,0,0-4.6499,0L60,216.22656V72a4.00427,4.00427,0,0,1,4-4h96a4.00427,4.00427,0,0,1,4,4ZM204,40V192a4,4,0,0,1-8,0V40a4.00427,4.00427,0,0,0-4-4H88a4,4,0,0,1,0-8H192A12.01343,12.01343,0,0,1,204,40Z"
              />
            </svg>
          </control-panelicon-buton>
          <icon-bilgi-cart class="text-gray-700">Ayraçlarım</icon-bilgi-cart>
        </div>

        <div class="group relative inline-block">
          <control-panelicon-buton cls="gizle"
                                   @click="gizle = !gizle;dahaFazla=false, beyazSayfaAktif = false; showBookmarkPanel = false">
            <svg class="w-6 h-6 text-gray-700 hover:text-blue-500 transition" v-if="!gizle" viewBox="0 0 24 24" fill="none"
                 xmlns="http://www.w3.org/2000/svg">
              <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
              <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
              <g id="SVGRepo_iconCarrier">
                <path
                    d="M22 12C22 12 18.3636 19 12 19C5.63636 19 2 12 2 12C2 12 5.63636 5 12 5C14.8779 5 17.198 6.43162 18.8762 8M9 12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9"
                    stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
              </g>
            </svg>
            <svg class="w-6 h-6 text-gray-700 hover:text-blue-500 transition" v-else viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
              <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
              <g id="SVGRepo_iconCarrier">
                <path
                    d="M20 14.8335C21.3082 13.3317 22 12 22 12C22 12 18.3636 5 12 5C11.6588 5 11.3254 5.02013 11 5.05822C10.6578 5.09828 10.3244 5.15822 10 5.23552M12 9C12.3506 9 12.6872 9.06015 13 9.17071C13.8524 9.47199 14.528 10.1476 14.8293 11C14.9398 11.3128 15 11.6494 15 12M3 3L21 21M12 15C11.6494 15 11.3128 14.9398 11 14.8293C10.1476 14.528 9.47198 13.8524 9.1707 13C9.11386 12.8392 9.07034 12.6721 9.04147 12.5M4.14701 9C3.83877 9.34451 3.56234 9.68241 3.31864 10C2.45286 11.1282 2 12 2 12C2 12 5.63636 19 12 19C12.3412 19 12.6746 18.9799 13 18.9418"
                    stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
              </g>
            </svg>
          </control-panelicon-buton>
          <icon-bilgi-cart class="text-gray-700">OkumaModu</icon-bilgi-cart>
        </div>
      </div>
    </transition>
  </div>
</div>
      </div>
    </transition>


    <!-- Sağ Kontrol Paneli -->

    <div v-if="!sideBar" class="fixed top-1/3 right-0 z-50 flex items-center">
      <button
          @click="sideBar = !sideBar"
          class="px-3 py-8 rounded-l-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-colors duration-300 focus:outline-none shadow-lg"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white hover:text-gray-200" fill="none"
             stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15.293 3.293L6.586 12l8.707 8.707 1.414-1.414L9.414 12l7.293-7.293-1.414-1.414z"/>
        </svg>
      </button>
    </div>

    <!-- Sidebar Panel -->
    <transition name="slide-right">
      <div
          v-if="sideBar"
          class="fixed top-0 right-0 h-full w-80 z-40 bg-white shadow-xl border-l border-gray-200 p-6 rounded-lg transition-transform duration-300 ease-in-out overflow-y-auto"
      >
        <!-- Başlık Bölümü -->
        <div class="mb-4 pb-2 border-b bg-gray-50 rounded-lg p-4 shadow">
          <div class="grid grid-cols-2 gap-2">
            <button
                @click="sidebarContent = true"
                class="py-2 rounded-md transition-all duration-300 transform hover:scale-105 font-semibold"
                :class="sidebarContent ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-800 hover:bg-blue-100'"
            >
              Eser Listesi
            </button>
            <button
                @click="sidebarContent = false"
                class="py-2 rounded-md transition-all duration-300 transform hover:scale-105 font-semibold"
                :class="!sidebarContent ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-800 hover:bg-blue-100'"
            >
              Istılahlar
            </button>
          </div>
        </div>

        <!-- Giriş Alanı -->
        <div v-if="sidebarContent" class="mb-4 p-4 bg-gray-50 rounded-lg shadow">
          <label class="block text-sm font-medium text-gray-700 mb-1">Sayfa Numarası</label>
          <input
              type="number"
              v-model="sayfaNo"
              :max="maxPages[eser] || ''"
              placeholder="Sayfa numarası girin..."
              class="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring focus:ring-blue-500 transition-all"
          />
        </div>
        <div v-else class="mb-4 p-4  bg-gray-50 rounded-lg shadow">
          <label class="block text-sm font-medium text-gray-700 mb-1">Istılah Ara</label>
          <input
              type="text"
              v-model="istilahSearch"
              placeholder="Ne Aramak İsteyiniz"
              class="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring focus:ring-blue-500 transition-all"
          />
        </div>

        <!-- İçerik Listesi -->
        <div class="flex-1 overflow-y-auto">
          <!-- Eser Listesi -->
          <div v-if="sidebarContent" v-for="(item, index) in esericerigiData" :key="index" class="mb-4">
            <button
                @click="toggleEser(index); handleEserClick(item, index); bolumSec(true, item)"
                class="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-blue-100 rounded-lg transition-colors duration-300 shadow"
            >
              <span class="text-sm font-semibold text-gray-800">{{ item.baslik }}</span>
              <svg
                  class="w-5 h-5 text-gray-500 transition-transform duration-200"
                  :class="{ 'rotate-180': openEserIndices.includes(index) }"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            <transition name="expand">
              <div v-if="openEserIndices.includes(index)" class="ml-4 mt-2 border-l border-gray-200 pl-4">
                <button
                    v-for="(madde, idx) in item.madde || []"
                    :key="idx"
                    @click="(eserListesi = false, eser = madde.eser, bolumListesiBool = false, bolum = madde.bolum, sayfaNo = madde.sayfa, selectedMadde = madde, sideBar = false)"
                    class="w-full flex items-center p-3 mb-2 text-sm rounded-md transition-colors duration-300 hover:bg-blue-100"
                    :class="selectedMadde === madde ? 'bg-blue-200 text-blue-700' : 'text-gray-700'"
                >
                  <span class="p-1 bg-blue-600 rounded-full mr-3"></span>
                  {{ madde.bolum }}
                </button>
              </div>
            </transition>
          </div>

          <!-- Istılah Listesi -->
          <div v-if="!sidebarContent">
            <div v-for="(item, index) in filteredData" :key="index" class="mb-4">
              <button
                  @click="toggleEser(index); handleEserClick(item, index); bolumSec(true, item)"
                  class="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-blue-100 rounded-lg transition-colors duration-300 shadow"
              >
                <span class="text-sm font-semibold text-gray-800">{{ item.istilah }}</span>
                <svg
                    class="w-5 h-5 text-gray-500 transition-transform duration-200"
                    :class="{ 'rotate-180': openEserIndices.includes(index) }"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
              <transition name="expand">
                <div v-if="openEserIndices.includes(index)" class="ml-4 mt-2 border-l border-gray-200 pl-4">
                  <button
                      v-for="(madde, idx) in item.aciklama || []"
                      :key="idx"
                      @click="handleMaddeClick(madde)"
                      class="w-full flex items-center p-3 mb-2 text-sm rounded-md transition-colors duration-300 hover:bg-blue-100"
                      :class="selectedMadde === madde ? 'bg-blue-200 text-blue-700' : 'text-gray-700'"
                  >
                    <span class="p-1 bg-blue-600 rounded-full mr-3"></span>
                    {{ madde }}
                  </button>
                </div>
              </transition>
            </div>
          </div>
        </div>
      </div>
    </transition>


  </div>

  <!-- Screenshot Butonu -->


  <!-- Screenshot Seçim Alanı -->
  <div
      v-if="ssCreationMode"
      class="screenshot-area fixed inset-0 bg-black bg-opacity-30 cursor-crosshair z-40"
      @pointerdown="pointerDown"
      @pointermove="pointerMove"
      @pointerup="pointerUp"
      @pointercancel="pointerUp"
  >
    <div
        v-if="currentSsBox"
        class="absolute border-2 border-blue-500 bg-blue-100 bg-opacity-20"
        :style="{
        left: currentSsBox.left + 'px',
        top: currentSsBox.top + 'px',
        width: currentSsBox.width + 'px',
        height: currentSsBox.height + 'px'
      }"
    ></div>
  </div>

  <!-- Screenshot Önizleme Modal -->
  <div v-if="showSsModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold">Ekran Görüntüsü Önizleme</h3>
        <button @click="showSsModal = false" class="text-gray-500 hover:text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div class="mb-4">
        <img
            v-if="ssPreviewUrl"
            :src="ssPreviewUrl"
            alt="Seçilen Görüntü"
            class="w-full h-auto border border-gray-300 rounded-lg"
        />
      </div>

      <div class="flex justify-end space-x-2">
        <button
            @click="showSsModal = false"
            class="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
        >
          İptal
        </button>
        <button
            @click="shareScreenshot"
            class="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
        >
          Paylaş
        </button>
      </div>
    </div>
  </div>

  <transition name="fade">
    <div
        v-if="visible"
        class="z-50 fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 text-gray-800 px-6 py-6 rounded-lg shadow-lg flex items-center space-x-3"
    >
      <span class="text-lg font-medium text-white">{{ bildirimYazisi }}</span>
    </div>
  </transition>

  <transition name="fade">
    <div
        v-if="soruPaneliCard"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-xs transition-opacity duration-300"
    >
      <div class="bg-white rounded-2xl shadow-2xl p-8 space-y-6 max-w-sm w-full">
        <div class="text-center">
          <h2 class="text-2xl font-bold text-gray-800">Devam etmek istiyor musunuz?</h2>
        </div>
        <div class="flex justify-around">
          <button
              @click="soruFunc(true)"
              class="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-300"
          >
            Evet
          </button>
          <button
              @click="soruFunc(false)"
              class="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-300"
          >
            Hayır
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style>

img {
  touch-action: none;
  user-select: none;
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
}

/* Mobil cihazlarda dokunmayı engelle */
@media (pointer: coarse) {
  .touch-none {
    touch-action: none !important;
    -webkit-touch-callout: none !important;
  }
}

/* Animasyonlar */
@keyframes slideIn {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

.sideAnimation {
  animation: slideIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scaleUp {
  from {
    transform: scale(0.95);
  }
  to {
    transform: scale(1);
  }
}

/* Transition Sınıfları */
.slide-enter-active,
.slide-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-enter-from {
  transform: translateX(-100%);
}

.slide-leave-to {
  transform: translateX(-100%);
}

.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  max-height: 500px;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-down-enter-to,
.slide-down-leave-from {
  opacity: 1;
  transform: translateY(0);
}

/* Not ve Overlay Stilleri */
.new-note-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.2); /* Daha açık ve net bir arka plan rengi */
  pointer-events: none;
  z-index: 5;
  transition: background-color 0.3s ease, backdrop-filter 0.3s ease; /* Geçiş efektleri eklendi */
}

.note-box {
  position: absolute;
  z-index: 10;
  border-radius: 8px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.note-box:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.note-box.disable-hover {
  pointer-events: none;
}

.note-overlay {
  position: absolute;
  top: -45px;
  left: 50%;
  transform: translateX(-50%);
  width: 220px;
  background: linear-gradient(135deg, #ffffff, #f9f9f9);
  border: 1px solid #e0e0e0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 8px 12px;
  border-radius: 8px;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, visibility 0.3s ease;
  z-index: 20;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.note-box:hover .note-overlay {
  opacity: 1;
  visibility: visible;
}

.delete-btn {
  background: transparent;
  border: none;
  color: #e74c3c;
  cursor: pointer;
  font-size: 1.2rem;
}

/* SVG Çizim İşlemleri */
line {
  pointer-events: visibleStroke;
}

/* Orientation Overlay */
.orientation-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.9);
  color: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  text-align: center;
  padding: 20px;
  font-size: 1.5em;
}

/* Responsive Ayarlamalar */
@media (max-width: 1024px) {
  .control-panel {
    width: 15px;
  }

  .side-panel {
    width: 60%;
  }
}

/* İnce Pointer için */
@media (pointer: fine) {
  .note-box {
    pointer-events: auto;
  }

  img {
    touch-action: manipulation;
  }
}

/* Cam Efekti */
.backdrop-blur-lg {
  backdrop-filter: blur(20px);
}

/* Genel Buton Hover Efektleri */
button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

/* Scrollbar Stilleri */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

/* Sol Kontrol Paneli */
.left-control-panel {
  position: fixed;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 60;
}

.btn {
  padding: 10px 15px;
  background-color: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn:hover {
  background-color: #2563eb;
}

/* Ana İçerik */
.content {
  margin-left: 150px;
  padding: 20px;
}

.modal-content {
  background: #fff;
  padding: 20px;
  border-radius: 10px;
  text-align: center;
}

.modal-content img {
  max-width: 80vw;
  max-height: 70vh;
  border: 2px solid #000;
  margin-bottom: 20px;
}

.share-buttons button {
  margin: 5px;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  color: #fff;
  cursor: pointer;
}

.share-buttons button:first-child {
  background: #25d366; /* WhatsApp */
}

.share-buttons button:nth-child(2) {
  background: #3b82f6; /* İndir */
}

.share-buttons button:last-child {
  background: #ff0000; /* Kapat */
}

/* SS Seçim Kutusu Stili */
.ss-selection-box {
  border: 2px dashed #4CAF50;
  background: rgba(76, 175, 80, 0.1);
  pointer-events: none;
  box-shadow: 0 0 10px rgba(76, 175, 80, 0.3);
}

.mukayeseliYazı {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 1.3rem; /* Yazı boyutunu biraz büyüttük */
  line-height: 2.3; /* Satır aralığını artırarak okunabilirliği yükselttik */
  letter-spacing: 0.05em; /* Karakterler arası mesafeyi açtık */
  color: #333; /* Genel yazı rengi koyu gri */
  padding: 1rem 1.5rem; /* İçerik etrafında boşluk bıraktık */
  margin: 1rem auto; /* Üst-alt boşluk ve ortalama ayarlandı */
  max-width: 100%;
  text-align: center;
}

/* Paragraflar arasındaki boşlukların daha belirgin olması için */
.mukayeseliYazı p {
  margin-bottom: 1.2em;
}

.screenshot-area {
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.overflow-x-auto::-webkit-scrollbar {
  display: none; /* Scrollbar'ı tamamen gizler */
}


.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease-in-out, transform 0.3s ease-in-out;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

* {
  user-select: none;
}

/* Yazı imleci stili */
.text-cursor {
  cursor: text !important;
}

.text-cursor * {
  cursor: text !important;
}

/* Yazı elementleri için pointer event ayarları */
.text-element {
  pointer-events: auto !important;
}

.text-element button {
  pointer-events: auto !important;
  z-index: 25 !important;
}

/* Silme butonu hover efekti */
.text-element:hover button {
  opacity: 1 !important;
}

/* Slider stilleri */
.slider {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
}

.slider::-webkit-slider-track {
  background: #e5e7eb;
  height: 8px;
  border-radius: 4px;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  background: #3b82f6;
  height: 20px;
  width: 20px;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  transition: all 0.2s ease;
}

.slider::-webkit-slider-thumb:hover {
  background: #2563eb;
  transform: scale(1.1);
}

.slider::-moz-range-track {
  background: #e5e7eb;
  height: 8px;
  border-radius: 4px;
  border: none;
}

.slider::-moz-range-thumb {
  background: #3b82f6;
  height: 20px;
  width: 20px;
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  transition: all 0.2s ease;
}

.slider::-moz-range-thumb:hover {
  background: #2563eb;
  transform: scale(1.1);
}

/* Modal animasyonları */
@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-enter-active {
  animation: modalFadeIn 0.3s ease-out;
}

/* Renk butonları için özel stiller */
.color-button {
  position: relative;
  overflow: hidden;
}

.color-button::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(255,255,255,0.3);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: all 0.3s ease;
}

.color-button:hover::before {
  width: 100%;
  height: 100%;
}

/* Modal responsive ayarları */
@media (max-width: 768px) {
  .modal-content {
    max-width: 95vw !important;
    margin: 0 10px !important;
  }
  
  .modal-grid {
    grid-template-columns: 1fr !important;
  }
}

/* Modal scroll ayarları */
.modal-scroll {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e0 #f7fafc;
}

.modal-scroll::-webkit-scrollbar {
  width: 6px;
}

.modal-scroll::-webkit-scrollbar-track {
  background: #f7fafc;
  border-radius: 3px;
}

.modal-scroll::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.modal-scroll::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}
</style>