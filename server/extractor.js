const YtdlpWrap = require('yt-dlp-wrap').default;
const path = require('path');
const fs = require('fs');
const https = require('https');

function extractFormatData(formatData) {
    const extension = formatData.ext;
    const formatName = formatData.format;
    const url = formatData.url;
    return {
        extension: extension,
        format_name: formatName,
        url: url
    };
}

async function downloadYtdlpBinary() {
    const binaryPath = path.join(__dirname, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
    
    if (fs.existsSync(binaryPath)) {
        fs.chmodSync(binaryPath, '755');
        return binaryPath;
    }
    
    return new Promise((resolve, reject) => {
        console.log('Downloading yt-dlp binary...');
        const file = fs.createWriteStream(binaryPath);
        const binaryUrl = process.platform === 'win32' 
            ? 'https://github.com/yt-dlp/yt-dlp/releases/download/2024.04.09/yt-dlp.exe'
            : 'https://github.com/yt-dlp/yt-dlp/releases/download/2024.04.09/yt-dlp';
        const request = https.get(binaryUrl, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                // Follow redirect
                const redirectUrl = response.headers.location;
                const redirectRequest = https.get(redirectUrl, (redirectResponse) => {
                    if (redirectResponse.statusCode !== 200) {
                        reject(new Error(`Failed to download yt-dlp: HTTP ${redirectResponse.statusCode}`));
                        return;
                    }
                    redirectResponse.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        fs.chmodSync(binaryPath, '755');
                        console.log('yt-dlp binary downloaded successfully');
                        resolve(binaryPath);
                    });
                });
                
                redirectRequest.on('error', (err) => {
                    fs.unlink(binaryPath, () => {});
                    reject(err);
                });
                
                return;
            }
            
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download yt-dlp: HTTP ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                fs.chmodSync(binaryPath, '755');
                console.log('yt-dlp binary downloaded successfully');
                resolve(binaryPath);
            });
        });
        
        request.on('error', (err) => {
            fs.unlink(binaryPath, () => {});
            reject(err);
        });
        
        request.setTimeout(60000, () => {
            request.destroy();
            fs.unlink(binaryPath, () => {});
            reject(new Error('Download timeout'));
        });
    });
}

async function extractVideoDataFromUrl(url) {
    let binaryPath;
    try {
        // Download yt-dlp binary if needed
        binaryPath = await downloadYtdlpBinary();
    } catch (error) {
        throw new Error(`Failed to setup yt-dlp: ${error.message}`);
    }

    const ytDlpWrap = new YtdlpWrap(binaryPath);
    
    // Try different approaches to extract video data
    const approaches = [
        // Full extraction with best settings
        () => ytDlpWrap.execPromise([
            url,
            '-j',
            '--no-playlist',
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            '--retries', '3',
            '--no-check-certificate'
        ]),
        // Fallback: just get basic info without formats
        () => ytDlpWrap.execPromise([
            url,
            '-j',
            '--no-playlist',
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            '--retries', '1',
            '--no-check-certificate',
            '--simulate'
        ]),
        // Last resort: get webpage info
        () => ytDlpWrap.execPromise([
            url,
            '--dump-json',
            '--no-playlist',
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            '--retries', '1'
        ])
    ];

    let lastError;
    for (let i = 0; i < approaches.length; i++) {
        try {
            console.log(`Trying extraction approach ${i + 1}...`);
            const output = await approaches[i]();
            
            let videoData;
            try {
                videoData = JSON.parse(output);
            } catch (e) {
                throw new Error(`Failed to decode JSON output from yt-dlp: ${e.message}`);
            }
            
            const title = videoData.title || 'Unknown Video';
            const formats = videoData.formats || [];
            const thumbnail = videoData.thumbnail;
            
            // Filter out formats that don't have URLs or are images only
            const validFormats = formats.filter(format => 
                format && 
                format.url && 
                format.ext && 
                format.ext !== 'none' &&
                !format.url.includes('.jpg') &&
                !format.url.includes('.png')
            );
            
            const extractedFormats = validFormats.map(formatData => extractFormatData(formatData));
            
            // Return result with appropriate message
            const result = {
                title: title,
                formats: extractedFormats,
                thumbnail: thumbnail
            };
            
            if (extractedFormats.length === 0) {
                result.error = 'No downloadable formats available - this video may be restricted or unavailable';
                result.warning = 'Video information was extracted but download links are not available due to YouTube restrictions';
            }
            
            console.log(`Successfully extracted data using approach ${i + 1}`);
            return result;
            
        } catch (error) {
            lastError = error;
            console.log(`Approach ${i + 1} failed: ${error.message}`);
            continue;
        }
    }
    
    // If all approaches failed, try to extract at least basic info from URL
    try {
        const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
        if (videoId) {
            return {
                title: `YouTube Video (ID: ${videoId[1]})`,
                formats: [],
                thumbnail: `https://img.youtube.com/vi/${videoId[1]}/maxresdefault.jpg`,
                error: 'Unable to extract video data due to YouTube restrictions. Only basic information is available.',
                videoId: videoId[1]
            };
        }
    } catch (e) {
        // Ignore URL parsing errors
    }
    
    throw new Error(`Failed to extract video data: ${lastError.message}`);
}

module.exports = { extractVideoDataFromUrl };
