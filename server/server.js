require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { extractVideoDataFromUrl } = require('./extractor');

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // to parse JSON bodies

// Middleware to log incoming JSON request bodies for debugging
app.use((req, res, next) => {
    if (req.is('application/json')) {
        console.log('Incoming JSON body:', req.body);
    }
    next();
});

// Error handling middleware for JSON parsing errors
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error('Bad JSON:', err.message);
        return res.status(400).json({ error: 'Invalid JSON: ' + err.message + '. Ensure all JSON property names are double-quoted and Content-Type is application/json.' });
    }
    next();
});

/*app.get('/', (req, res) => {
    res.render('index', { features: FEATURES, faqs: FAQS, error: null });
});*/


app.post('/download', (req, res) => {
    const videoUrl = req.body.video_url;
    try {
        const videoData = extractVideoDataFromUrl(videoUrl);
        const title = videoData.title;
        const thumbnail = videoData.thumbnail;
        const formats = videoData.formats;
        res.render('download', {
            title: title,
            thumbnail: thumbnail,
            formats: formats,
            features: FEATURES,
            faqs: FAQS
        });
    } catch (e) {
        const errorMessage = e.message;
        res.render('index', { features: FEATURES, faqs: FAQS, error: errorMessage });
    }
});

// New API endpoint for client JSON requests
app.post('/api/download', (req, res) => {
    const videoUrl = req.body.video_url;
    if (!videoUrl) {
        return res.status(400).json({ error: 'video_url is required' });
    }
    try {
        const videoData = extractVideoDataFromUrl(videoUrl);
        res.json(videoData);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
