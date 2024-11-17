const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegStatic);

const app = express();
const port = process.env.PORT || 5000;

const cors = require("cors");
app.use(cors());

app.get("/test", (req, res) => {
  res.status(200).json("Server is running");
});

app.get("/api/downloadYoutubeSlice", (req, res) => {
  const { youtubeVideoId, startTime, endTime } = req.query;

  if (!youtubeVideoId || !startTime || !endTime) {
    return res.status(400).json({
      error: "youtubeVideoId, startTime, and endTime are required",
    });
  }

  const videoURL = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
  const tempFilePath = path.resolve(__dirname, `${youtubeVideoId}.mp4`);
  const outputFilePath = path.resolve(__dirname, `${youtubeVideoId}-sliced.mp4`);

  const downloadCommand = `yt-dlp -f mp4 --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3" "${videoURL}" -o "${tempFilePath}"`;

  exec(downloadCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error during download: ${stderr}`);
      return res.status(500).json({ error: `Error downloading video: ${stderr}` });
    }
    console.log("Video downloaded successfully");

    fs.stat(tempFilePath, (err, stats) => {
      if (err || stats.size === 0) {
        console.error("Downloaded file is empty or error checking file");
        return res.status(500).json({ error: "Downloaded video is empty or corrupted" });
      }

      ffmpeg(tempFilePath)
        .setStartTime(startTime)
        .setDuration(endTime - startTime)
        .output(outputFilePath)
        .on("start", (commandLine) => {
          console.log("FFmpeg command:", commandLine);
        })
        .on("progress", (progress) => {
          if(progress) console.log(`Trimming: ${Math.floor(progress)}% done`);
        })
        .on("end", () => {
          console.log("Video trimming completed.");

          res.setHeader("Content-Type", "video/mp4");
          res.setHeader("Content-Disposition", `attachment; filename="clip-${youtubeVideoId}.mp4"`);

          const readStream = fs.createReadStream(outputFilePath);
          readStream.pipe(res);

          readStream.on("end", () => {
            fs.unlinkSync(tempFilePath); 
            fs.unlinkSync(outputFilePath); 
          });
        })
        .on("error", (err) => {
          console.error("Error during trimming:", err);
          res.status(500).json({ error: "Failed to trim video" });
        })
        .run();
    });
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
