const { execSync } = require('child_process');

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

function extractVideoDataFromUrl(url) {
    const command = `yt-dlp "${url}" -j --no-playlist`;
    let output;
    try {
        output = execSync(command).toString();
    } catch (error) {
        throw new Error("No output from yt-dlp command. Possibly invalid URL or network issue.");
    }
    let videoData;
    try {
        videoData = JSON.parse(output);
    } catch (e) {
        throw new Error(`Failed to decode JSON output from yt-dlp: ${e}`);
    }
    const title = videoData.title;
    const formats = videoData.formats || [];
    const thumbnail = videoData.thumbnail;
    const extractedFormats = formats.map(formatData => extractFormatData(formatData));
    return {
        title: title,
        formats: extractedFormats,
        thumbnail: thumbnail
    };
}

module.exports = { extractVideoDataFromUrl };
