import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div>
      <h2>SoundScreen – The Ultimate Venue Entertainment & Advertising Solution</h2>
      <p>
        Transform Your Venue’s Atmosphere with Music, Advertising, and Entertainment – All in One System.
        Enhance Your Venue with Personalized Background Music and Dynamic TV Displays.
      </p>
      <h3>Welcome to SoundScreen</h3>
      <p>
        SoundScreen is the all-in-one entertainment and advertising solution designed specifically for bars,
        restaurants, cafes, and entertainment venues. Our platform simplifies managing your venue’s atmosphere,
        ensuring a seamless experience for you and your guests.
      </p>
      <h3>Why SoundScreen?</h3>
      <p>
        SoundScreen brings together the power of customized background music and dynamic TV display advertising,
        allowing you to:
      </p>
      <ul>
        <li>Set the Mood with the Perfect Soundtrack</li>
        <li>Engage Patrons with Tailored Promotions and Advertising</li>
        <li>Host Interactive Events for Ultimate Entertainment</li>
      </ul>
      <p>
        Our system gives you full control over your venue's sound and visuals from a single, easy-to-use interface.
        Whether you're managing background music, displaying promotions, or running interactive events, SoundScreen
        takes care of it all.
      </p>
      <h3>Key Features</h3>
      <h4>1. Background Music System</h4>
      <p>
        Elevate your venue’s atmosphere with customizable background music that’s easy to manage.
      </p>
      <ul>
        <li>Integrate with Spotify or YouTube</li>
        <li>Zone Control for Different Areas</li>
        <li>Seamless Automation</li>
        <li>Guest Requests</li>
      </ul>
      <h4>2. TV Display Advertising System</h4>
      <p>
        Turn your venue’s TVs into revenue-generating tools and entertainment hubs.
      </p>
      <ul>
        <li>Promote Your Venue</li>
        <li>Dynamic Content</li>
        <li>Partner Ads for Extra Revenue</li>
        <li>Interactive Entertainment</li>
      </ul>
      <h4>3. Event Management and Scheduling</h4>
      <p>
        Planning events has never been easier with SoundScreen. Schedule and manage your events effortlessly, all while
        keeping your venue's atmosphere aligned with your events.
      </p>
      <h3>How It Works</h3>
      <ul>
        <li>Sign Up and Onboard Your Venue</li>
        <li>Connect Your Devices</li>
        <li>Personalize Your Content</li>
        <li>Sit Back and Relax</li>
      </ul>
      <h3>Testimonials from Venue Owners</h3>
      <p>
        "SoundScreen has completely changed the way we manage our bar's atmosphere. The music is always perfectly timed, 
        the ads are personalized for our guests, and the interactive events keep people coming back." – Sarah T., Bar Manager
      </p>
      <h3>Ready to Enhance Your Venue?</h3>
      <button>
        <Link to="/signup">Sign Up Today!</Link>
      </button>
    </div>
  );
}

export default Home;
