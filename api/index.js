const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const path = require('path')
const app = express()
 
app.use(express.json())
app.use(cors())
app.use(express.static(path.join(__dirname, '../public')))
 
let isConnected = false
async function connectDB() {
    if (isConnected) return
    await mongoose.connect(process.env.MONGO_URI)
    isConnected = true
}
 
const Policia = mongoose.model('Policia', new mongoose.Schema({
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
}))
 
const Crime = mongoose.model('Crime', new mongoose.Schema({
    id:           { type: String, required: true, unique: true },
    nome:         { type: String, required: true },
    genero:       { type: String, required: true },
    dataDetencao: { type: String, required: true },
    dataSaida:    { type: String, required: true },
    provincia:    { type: String, required: true },
    altura:       { type: String, required: true },
    status:       { type: String, required: true },
    foto:         { type: String, default: '' }
}))
 
const OcorrenciaSchema = new mongoose.Schema({
    id:         { type: String, required: true },
    idAgente:   { type: Number, required: true },
    idBilhete:  { type: String, default: '' },
    latitude:   { type: Number, required: true },
    longitude:  { type: Number, required: true },
    data:       { type: String },
    hora:       { type: String },
    vezes:      { type: Number, required: true },
    status:     { type: String, required: true }
})
 
OcorrenciaSchema.pre('save', async function() {
    if (!this.isNew) return
    const agora = new Date()
    const dd   = String(agora.getDate()).padStart(2, '0')
    const mm   = String(agora.getMonth() + 1).padStart(2, '0')
    const yyyy = agora.getFullYear()
    const hh   = String(agora.getHours()).padStart(2, '0')
    const min  = String(agora.getMinutes()).padStart(2, '0')
    const ss   = String(agora.getSeconds()).padStart(2, '0')
    this.data = dd + '-' + mm + '-' + yyyy
    this.hora = hh + ':' + min + ':' + ss
})
 
const Ocorrencia = mongoose.model('Ocorrencia', OcorrenciaSchema)
 
const Usuario = mongoose.model('Usuario', new mongoose.Schema({
    usuario: { type: String, required: true, unique: true },
    senha:   { type: String, required: true },
    perfil:  { type: String, default: 'admin' }
}))
 
app.use(async (req, res, next) => {
    try {
        await connectDB()
        next()
    } catch (e) {
        res.status(500).json({ erro: 'Erro de conexao' })
    }
})
 
async function criarAdminPadrao() {
    try {
        await connectDB()
        const existe = await Usuario.findOne({ usuario: 'admin' })
        if (!existe) {
            await new Usuario({ usuario: 'admin', senha: 'admin123', perfil: 'admin' }).save()
        }
    } catch(e) {}
}
criarAdminPadrao()
 
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'))
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
    } catch(e) { res.status(500).json({ erro: e.message }) }
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
        const { id, idAgente, idBilhete, latitude, longitude, vezes, status } = req.body
        const nova = new Ocorrencia({ id, idAgente, idBilhete, latitude, longitude, vezes, status })
        res.status(201).json(await nova.save())
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
 
module.exports = app

