# Video Downloader Backend

## Prerequisites

- Node.js and npm installed
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) installed and accessible in your system PATH.  
  You can install yt-dlp by following the instructions on its GitHub page or using a package manager.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Run the server:

- For production:

```bash
npm start
```

- For development (with auto-restart on changes):

```bash
npm run dev
```

The server will start on port 3000 by default.

## API Usage

### POST /api/download

- Content-Type: application/json
- Body example:

```json
{
  "video_url": "https://www.youtube.com/watch?v=A6x84FoaUdY"
}
```

- Response: JSON with video data extracted by yt-dlp.

## Notes

- Ensure your JSON payload in Postman or any client is valid JSON with double-quoted property names and no trailing commas.
- The `scrap.js` file contains browser-specific code and should be used only in frontend environments. It is recommended to move it to a frontend folder if you have one.

## Folder Structure Suggestion

- `server.js` - Main backend server
- `extractor.js` - Video data extraction utility
- `scrap.js` - Frontend script (move to frontend folder if applicable)
