require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { extractVideoDataFromUrl } = require('./extractor');

// Default data for rendering
const FEATURES = [
    {
        title: "High Quality Downloads",
        description: "Download videos in various qualities up to 4K"
    },
    {
        title: "Multiple Formats",
        description: "Support for MP4, WebM, and other popular formats"
    },
    {
        title: "Fast Processing",
        description: "Quick extraction and download processing"
    }
];

const FAQS = [
    {
        question: "What video formats are supported?",
        answer: "We support MP4, WebM, and other popular video formats."
    },
    {
        question: "Is there a limit on video length?",
        answer: "There is no strict limit, but longer videos may take more time to process."
    }
];

const app = express();
app.set('view engine', 'ejs');
app.use(cors({
  origin: ["https://clientdownloader.onrender.com","http://localhost:5173"]
}));

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


app.post('/download', async (req, res) => {
    const videoUrl = req.body.video_url;
    try {
        const videoData = await extractVideoDataFromUrl(videoUrl);
        res.render('download', {
            title: videoData.title,
            thumbnail: videoData.thumbnail,
            formats: videoData.formats,
            videoId: videoData.videoId,
            error: videoData.error,
            warning: videoData.warning,
            features: FEATURES,
            faqs: FAQS
        });
    } catch (e) {
        const errorMessage = e.message;
        res.render('index', { features: FEATURES, faqs: FAQS, error: errorMessage });
    }
});

// New API endpoint for client JSON requests
app.post('/api/download', async (req, res) => {
    const videoUrl = req.body.video_url;
    if (!videoUrl) {
        return res.status(400).json({ error: 'video_url is required' });
    }
    try {
        const videoData = await extractVideoDataFromUrl(videoUrl);
        res.json(videoData);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

















/*PS C:\Users\swaya\Downloads\avdserver-main> Invoke-RestMethod -Uri http://localhost:10000/api/download -Method POST -ContentType "application/json" -Body '{"video_url":"https://www.youtube.com/watch?v=mlWV7m2uH6o&list=RD8uz4erxs8xs&index=3"}' -TimeoutSec 180
34b

title     : YouTube Video (ID: mlWV7m2uH6o)
formats   : {}
thumbnail : https://img.youtube.com/vi/mlWV7m2uH6o/maxresdefault.jpg
error     : Unable to extract video data due to YouTube restrictions. Only basic information is available.
videoId   : mlWV7m2uH6o
*/
