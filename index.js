const express=require('express')
const cors=require('cors')
require('dotenv').config();
const {GoogleGenerativeAI}= require('@google/generative-ai');

let app=express();
app.use(cors());
app.use(express.json());

const KEY = process.env.KEY
let model = null
let useMock = false

if (!KEY) {
  console.warn('WARNING: No API key provided (process.env.KEY). Backend will run in mock mode.');
  useMock = true
} else {
  try {
    const genAi = new GoogleGenerativeAI(KEY)
    model = genAi.getGenerativeModel({ model: 'gemini-2.5-flash' })
  } catch (err) {
    console.error('failed to initialize generative model SDK:', err.message)
    // still allow server to run, but use mock fallback
    useMock = true
  }
}

app.post('/ask', async (req, res) => {
  try {
    const { question } = req.body
    if (!question) return res.status(400).send({ _status: false, _message: 'question is required' })
    let text
    if (useMock) {
      // helpful mock response for local development when KEY is missing or SDK fails
      text = `Mock reply: I received your question: "${question}"`;
    } else {
      // call the model and be defensive about the response shape
      const data = await model.generateContent(question)
      // try to extract text in multiple ways for robustness
      text = (data && (data.response?.text ? data.response.text() : data.response)) || data?.text || String(data)
    }

    return res.send({
      _status: true,
      _message: 'content generated',
      _finalData: text
    })
  } catch (err) {
    console.error('error generating content', err)
    // include error message for easier debugging in dev
    return res.status(500).send({ _status: false, _message: 'internal server error', _error: err.message })
  }
})

const PORT = process.env.PORT || 8000
app.listen(PORT, () => {
  console.log(`server has started on port ${PORT}`)
})