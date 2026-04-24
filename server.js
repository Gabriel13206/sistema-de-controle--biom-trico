const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const app = express()

app.use(express.json())
app.use(cors())
app.use('/uploads', express.static('uploads'))

if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads')

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
})
const upload = multer({ storage })

mongoose.connect('mongodb://localhost:27017/policia')
    .then(() => console.log('MongoDB conectado'))
    .catch(e => console.log('MongoDB erro:', e.message))

const Policia = mongoose.model('Policia', {
    id:            { type: String, required: true, unique: true },
    nome:          { type: String, required: true },
    patente:       { type: String, required: true },
    tipo:          { type: String, required: true },
    genero:        { type: String, required: true },
    provincia:     { type: String, required: true },
    municipio:     { type: String, required: true },
    esquadra:      { type: String, required: true },
    arma:          { type: String, required: true },
    dataEmissao:   { type: String, required: true },
    dataRenovacao: { type: String, required: true },
    foto:          { type: String, default: '' },
    status:        { type: String, default: 'activo' }
})

const Crime = mongoose.model('Crime', {
    id:           { type: String, required: true, unique: true },
    nome:         { type: String, required: true },
    genero:       { type: String, required: true },
    dataDetencao: { type: String, required: true },
    dataSaida:    { type: String, required: true },
    provincia:    { type: String, required: true },
    altura:       { type: String, required: true },
    status:       { type: String, required: true },
    foto:         { type: String, default: '' }
})

const Ocorrencia = mongoose.model('Ocorrencia', {
    id:        { type: String, required: true, unique: true },
    idAgente:  { type: String, required: true },
    latitude:  { type: String, required: true },
    longitude: { type: String, required: true },
    data:      { type: String, required: true },
    hora:      { type: String, required: true },
    vezes:     { type: Number, required: true },
    status:    { type: String, required: true }
})

const Usuario = mongoose.model('Usuario', {
    usuario: { type: String, required: true, unique: true },
    senha:   { type: String, required: true },
    perfil:  { type: String, default: 'admin' }
})

async function criarAdminPadrao() {
    const existe = await Usuario.findOne({ usuario: 'admin' })
    if (!existe) {
        await new Usuario({ usuario: 'admin', senha: 'admin123', perfil: 'admin' }).save()
        console.log('Utilizador admin criado: admin / admin123')
    }
}
criarAdminPadrao()

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'))
})

app.post('/login', async (req, res) => {
    try {
        const { usuario, senha } = req.body
        if (!usuario || !senha) return res.status(400).json({ erro: 'Usuario e senha obrigatorios' })
        const user = await Usuario.findOne({ usuario, senha })
        if (!user) return res.status(401).json({ erro: 'Usuario ou senha incorrectos' })
        res.json({ ok: true, perfil: user.perfil, usuario: user.usuario })
    } catch(e) {
        res.status(500).json({ erro: e.message })
    }
})


app.post('/upload', upload.single('foto'), (req, res) => {
    if (!req.file) return res.status(400).json({ erro: 'Nenhum ficheiro enviado' })
    res.json({ ficheiro: req.file.filename })
})

app.get('/policia', async (req, res) => {
    try { res.json(await Policia.find()) }
    catch(e) { res.status(500).json({ erro: e.message }) }
})
app.post('/policia', async (req, res) => {
    try {
        if (await Policia.findOne({ id: req.body.id })) return res.status(400).json({ erro: 'ID ja existe!' })
        res.status(201).json(await new Policia(req.body).save())
    } catch(e) { res.status(400).json({ erro: e.message }) }
})
app.put('/policia/:id', async (req, res) => {
    try {
        let doc = await Policia.findByIdAndUpdate(req.params.id, req.body, { new: true })
        if (!doc) return res.status(404).json({ erro: 'Nao encontrado' })
        res.json(doc)
    } catch(e) { res.status(400).json({ erro: e.message }) }
})
app.patch('/policia/:id/status', async (req, res) => {
    try {
        let agente = await Policia.findById(req.params.id)
        if (!agente) return res.status(404).json({ erro: 'Nao encontrado' })
        agente.status = agente.status === 'activo' ? 'bloqueado' : 'activo'
        await agente.save()
        res.json({ ok: true, status: agente.status })
    } catch(e) {
        res.status(500).json({ erro: e.message })
    }
})
app.delete('/policia/:id', async (req, res) => {
    try {
        if (!await Policia.findByIdAndDelete(req.params.id)) return res.status(404).json({ erro: 'Nao encontrado' })
        res.json({ ok: true })
    } catch(e) { res.status(500).json({ erro: e.message }) }
})

app.get('/crimes', async (req, res) => {
    try { res.json(await Crime.find()) }
    catch(e) { res.status(500).json({ erro: e.message }) }
})
app.post('/crimes', async (req, res) => {
    try {
        if (await Crime.findOne({ id: req.body.id })) return res.status(400).json({ erro: 'ID ja existe!' })
        res.status(201).json(await new Crime(req.body).save())
    } catch(e) { res.status(400).json({ erro: e.message }) }
})
app.put('/crimes/:id', async (req, res) => {
    try {
        let doc = await Crime.findByIdAndUpdate(req.params.id, req.body, { new: true })
        if (!doc) return res.status(404).json({ erro: 'Nao encontrado' })
        res.json(doc)
    } catch(e) { res.status(400).json({ erro: e.message }) }
})
app.delete('/crimes/:id', async (req, res) => {
    try {
        if (!await Crime.findByIdAndDelete(req.params.id)) return res.status(404).json({ erro: 'Nao encontrado' })
        res.json({ ok: true })
    } catch(e) { res.status(500).json({ erro: e.message }) }
})

app.get('/ocorrencias', async (req, res) => {
    try { res.json(await Ocorrencia.find().sort({ _id: -1 })) }
    catch(e) { res.status(500).json({ erro: e.message }) }
})
app.post('/ocorrencias', async (req, res) => {
    try {
        res.status(201).json(await new Ocorrencia(req.body).save())
    } catch(e) { res.status(400).json({ erro: e.message }) }
})
app.delete('/ocorrencias/:id', async (req, res) => {
    try {
        if (!await Ocorrencia.findByIdAndDelete(req.params.id)) return res.status(404).json({ erro: 'Nao encontrado' })
        res.json({ ok: true })
    } catch(e) { res.status(500).json({ erro: e.message }) }
})

app.get('/verificar/:id', async (req, res) => {
    try {
        const id = req.params.id
        const agente = await Policia.findOne({ id })
        if (agente) {
            if (agente.status === 'bloqueado') return res.json({ resultado: 'bloqueia', tipo: 'desertor', nome: agente.nome })
            return res.json({ resultado: 'libera', tipo: 'agente', nome: agente.nome })
        }
        const crime = await Crime.findOne({ id })
        if (crime) return res.json({ resultado: 'bloqueia', tipo: 'crime', nome: crime.nome })
        res.json({ resultado: 'bloqueia', tipo: 'desconhecido', nome: 'Desconhecido' })
    } catch(e) { res.status(500).json({ erro: e.message }) }
})
// Servir frontend
app.use(express.static('.'));
const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log('SERVER http://localhost:' + PORT))