const express = require("express");
const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());

app.get("/test", (req, res) => {
  res.status(200).json("server is running");
});

app.get("/api/downloadYoutubeSlice", async (req, res) => {
  const { youtubeVideoId, startTime, endTime } = req.query;

  console.log(youtubeVideoId, startTime, endTime);

  if (!youtubeVideoId || !startTime || !endTime) {
    return res
      .status(400)
      .json({ error: "youtubeVideoId, startTime, and endTime are required" });
  }

  const videoURL = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
  const tempFilePath = path.resolve(__dirname, `${youtubeVideoId}.mp4`);

  try {
    console.log(`Starting video download for ${youtubeVideoId}...`);
    const videoStream = ytdl(videoURL, {
      quality: 'highestvideo',
      requestOptions: {
        timeout: 30000
      }
    });

    videoStream.on('error', (err) => {
      console.error('Error with video stream:', err);
    });

    videoStream.on("progress", (chunkLength, downloaded, total) => {
      console.log(`Downloading: ${((downloaded / total) * 100).toFixed(2)}%`);
    });

    const writeStream = fs.createWriteStream(tempFilePath);
    videoStream.pipe(writeStream);

    writeStream.on("finish", () => {
      console.log("Video download finished.");

      fs.stat(tempFilePath, (err, stats) => {
        if (err) {
          console.error("Error checking downloaded file:", err);
          return res
            .status(500)
            .json({ error: "Error checking downloaded file" });
        }

        if (stats.size === 0) {
          console.error("Downloaded file is empty.");
          return res.status(500).json({ error: "Downloaded video is empty" });
        }

        console.log(
          "Video file downloaded successfully. Proceeding to trimming..."
        );

        // Set the proper headers for video response
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="clip-${youtubeVideoId}.mp4"`);

        ffmpeg(tempFilePath)
          .setStartTime(startTime)
          .setDuration(endTime - startTime)
          .output(res)
          .on("start", (commandLine) => {
            console.log("FFmpeg command:", commandLine);
          })
          .on("progress", (progress) => {
            console.log(`Trimming: ${progress.percent.toFixed(2)}% done`);
          })
          .on("end", () => {
            console.log("Video trimming completed.");
            // Clean up the temporary file after streaming
            fs.unlinkSync(tempFilePath);
          })
          .on("error", (err) => {
            console.error("Error during trimming:", err);
            res.status(500).json({ error: "Failed to trim video" });
          })
          .run();
      });
    });

    writeStream.on("error", (err) => {
      console.error("Error writing video to file:", err);
      res.status(500).json({ error: "Failed to save video" });
    });
  } catch (err) {
    console.error("Error during video processing:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});