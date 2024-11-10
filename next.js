// /pages/download.js
import { useState } from 'react';

function Download() {
  const [youtubeVideoId, setYoutubeVideoId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const handleDownload = async () => {
    const response = await fetch(
      `/api/downloadYoutubeSlice?youtubeVideoId=${youtubeVideoId}&startTime=${startTime}&endTime=${endTime}`
    );

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${youtubeVideoId}_${startTime}_${endTime}.mp4`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="container">
      <input
        type="text"
        placeholder="YouTube Video ID"
        value={youtubeVideoId}
        onChange={(e) => setYoutubeVideoId(e.target.value)}
      />
      <input
        type="text"
        placeholder="Start Time (in seconds)"
        value={startTime}
        onChange={(e) => setStartTime(e.target.value)}
      />
      <input
        type="text"
        placeholder="End Time (in seconds)"
        value={endTime}
        onChange={(e) => setEndTime(e.target.value)}
      />
      <button onClick={handleDownload}>Download Video Slice</button>
    </div>
  );
}

export default Download;
