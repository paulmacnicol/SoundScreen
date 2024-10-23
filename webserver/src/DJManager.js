import React, { useState, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd'; // React Drag and Drop
import axios from 'axios'; // To handle API calls

// Drag and drop item type
const ItemType = {
  TRACK: 'track'
};

// YouTube search function
function DJManager({ selectedDevice }) {
  const [nowPlaying, setNowPlaying] = useState(null); // Currently playing track
  const [upNext, setUpNext] = useState(null); // Up Next track
  const [playlist, setPlaylist] = useState([]); // Playlist queue
  const [searchResults, setSearchResults] = useState([]); // YouTube search results
  const [searchQuery, setSearchQuery] = useState(''); // Search input state
  const [crossfaderPosition, setCrossfaderPosition] = useState(0); // Crossfader state

  // Load YouTube API key from environment
  const YOUTUBE_API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY;

  // Function to handle YouTube search
  const searchYouTube = async () => {
    if (!searchQuery) return; // Skip if no query
    try {
      const response = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
        params: {
          part: 'snippet',
          q: searchQuery,
          type: 'video',
          key: YOUTUBE_API_KEY,
          maxResults: 10
        }
      });

      const results = response.data.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.default.url
      }));
      setSearchResults(results);
    } catch (error) {
      console.error('Error fetching YouTube results:', error);
    }
  };

  // Handle drag of a track
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemType.TRACK,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging()
    })
  }));

  // Handle drop into playlist
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemType.TRACK,
    drop: (item) => addTrackToPlaylist(item),
    collect: (monitor) => ({
      isOver: !!monitor.isOver()
    })
  }));

  const addTrackToPlaylist = (track) => {
    setPlaylist([...playlist, track]);
  };

  const playNextTrack = () => {
    const crossfadeToNextTrack = () => {
      setCrossfaderPosition(100); // Automatically move the crossfader to full
      setNowPlaying(upNext); // Up Next becomes Now Playing
      const nextInQueue = playlist.length > 0 ? playlist.shift() : null;
      setUpNext(nextInQueue); // Load the next song from playlist
      setPlaylist([...playlist]); // Update playlist queue
    };

    if (crossfaderPosition >= 100) {
      crossfadeToNextTrack();
    }
  };

  // React to changes in the selected device
  useEffect(() => {
    if (selectedDevice) {
      console.log(`DJ Manager controlling device: ${selectedDevice.name}`);
    }
  }, [selectedDevice]);

  return (
    <div>
      <h2>DJ Manager for {selectedDevice ? selectedDevice.name : 'No device selected'}</h2>
      
      {/* YouTube Search Input */}
      <div>
        <h3>YouTube Search</h3>
        <input 
          type="text" 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
          placeholder="Search YouTube" 
        />
        <button onClick={searchYouTube}>Search</button>
      </div>

      {/* YouTube Search Results */}
      <div>
        <h4>Search Results</h4>
        <ul>
          {searchResults.map((result, index) => (
            <li 
              key={index} 
              ref={drag} 
              style={{ opacity: isDragging ? 0.5 : 1 }}
            >
              <img src={result.thumbnail} alt={result.title} width="50" />
              <span>{result.title}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Display now playing and up next */}
      <div>
        <h3>Now Playing</h3>
        <p>{nowPlaying ? nowPlaying.title : 'No track playing'}</p>
        <h3>Up Next</h3>
        <p>{upNext ? upNext.title : 'No track loaded'}</p>
        <button onClick={playNextTrack}>Play Next</button>
      </div>

      {/* Playlist management with drag and drop */}
      <div ref={drop} style={{ backgroundColor: isOver ? '#f0f0f0' : '#fff', padding: '10px', marginTop: '20px' }}>
        <h3>Playlist</h3>
        <ul>
          {playlist.map((track, index) => (
            <li key={index}>
              <span>{track.title}</span>
            </li>
          ))}
        </ul>
        <p>Drag YouTube results here to add them to the playlist...</p>
      </div>

      {/* Crossfader */}
      <div>
        <h3>Crossfader</h3>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={crossfaderPosition} 
          onChange={(e) => setCrossfaderPosition(e.target.value)} 
        />
      </div>
    </div>
  );
}

export default DJManager;
