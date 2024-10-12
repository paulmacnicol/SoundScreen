import React from 'react';
import './Features.css';

function Features() {
  return (
    <div className="features-container">
      <header className="features-header">
        <h1>Features That Drive Success</h1>
        <p>Explore SoundScreen's powerful set of tools designed to enhance your venue’s atmosphere and maximize engagement.</p>
      </header>

      <section className="feature-section">
        <h2>Background Music Control</h2>
        <p>Curate the perfect atmosphere for your venue with fully customizable music playlists.</p>
        <ul>
          <li>Integrate with Spotify, YouTube, or other streaming platforms</li>
          <li>Manage music across multiple zones within your venue</li>
          <li>Allow guest requests for an interactive experience</li>
        </ul>
      </section>

      <section className="feature-section">
        <h2>Dynamic TV Advertising</h2>
        <p>Turn your venue’s TVs into dynamic revenue-generating tools.</p>
        <ul>
          <li>Display custom promotions and events</li>
          <li>Sell ad space to partners for additional income</li>
          <li>Show engaging entertainment or live sports</li>
        </ul>
      </section>

      <section className="feature-section">
        <h2>Event Management</h2>
        <p>Host interactive events like quizzes, karaoke, and live streams to keep your guests entertained.</p>
        <ul>
          <li>Easy scheduling and management of recurring events</li>
          <li>Automated syncing of music and display content with events</li>
          <li>Guest participation features to increase engagement</li>
        </ul>
      </section>

      <footer className="footer">
        <p>Experience these features and more with SoundScreen.</p>
        <Link to="/signup">
          <button className="cta-button">Get Started</button>
        </Link>
      </footer>
    </div>
  );
}

export default Features;
