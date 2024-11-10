const express = require('express');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Set ffmpeg path for fluent-ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

app.get('/test', (req, res) => {
  res.status(200).send("server is running");
  console.log('test');
});

// Route to download and trim YouTube video
app.get('/api/downloadYoutubeSlice', async (req, res) => {
  const { youtubeVideoId, startTime, endTime } = req.query;

  // Check if the necessary parameters are provided
  if (!youtubeVideoId || !startTime || !endTime) {
    return res.status(400).send('Missing youtubeVideoId, startTime, or endTime');
  }

  // Parse startTime and endTime as numbers
  const start = parseFloat(startTime);
  const end = parseFloat(endTime);

  // Validate the parsed values
  if (isNaN(start) || isNaN(end) || start >= end) {
    return res.status(400).send('Invalid startTime or endTime');
  }

  const videoUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
  const outputFilePath = path.resolve(__dirname, `${youtubeVideoId}_${start}_${end}.mp4`);

  try {
    // Download video stream with high quality
    const videoStream = ytdl(videoUrl, { quality: 'highestvideo' });

    // Process video using ffmpeg to trim
    ffmpeg(videoStream)
      .setStartTime(start)
      .setDuration(end - start)
      .output(outputFilePath)
      .on('end', () => {
        res.download(outputFilePath, (err) => {
          if (err) {
            console.error('Download error:', err);
            res.status(500).send('Error in file download');
          }
          fs.unlinkSync(outputFilePath); // Clean up after download
        });
      })
      .on('error', (err) => {
        console.error('ffmpeg error:', err);
        res.status(500).send('Error processing video');
      })
      .run();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('An error occurred');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});