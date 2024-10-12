import React from 'react';
import './Pricing.css';

function Pricing() {
  return (
    <div className="pricing-container">
      <header className="pricing-header">
        <h1>Flexible Pricing for Any Venue</h1>
        <p>No matter the size of your venue, SoundScreen has a plan that fits your needs.</p>
      </header>

      <section className="pricing-table">
        <div className="pricing-tier">
          <h2>Free Plan</h2>
          <p>Perfect for small venues looking to try SoundScreen.</p>
          <ul>
            <li>1 Site</li>
            <li>1 Area</li>
            <li>Up to 3 Devices</li>
            <li>Basic Support</li>
          </ul>
          <p className="price">$0 / month</p>
          <Link to="/signup">
            <button className="pricing-button">Choose Free</button>
          </Link>
        </div>

        <div className="pricing-tier">
          <h2>Single Site Plan</h2>
          <p>For medium-sized venues needing more control.</p>
          <ul>
            <li>1 Site</li>
            <li>Unlimited Areas</li>
            <li>Up to 10 Devices</li>
            <li>Priority Support</li>
          </ul>
          <p className="price">$49 / month</p>
          <Link to="/signup">
            <button className="pricing-button">Choose Single Site</button>
          </Link>
        </div>

        <div className="pricing-tier">
          <h2>Multi-Site Plan</h2>
          <p>Ideal for venue chains or businesses with multiple locations.</p>
          <ul>
            <li>Up to 5 Sites</li>
            <li>Unlimited Areas</li>
            <li>Up to 50 Devices</li>
            <li>Premium Support</li>
          </ul>
          <p className="price">$199 / month</p>
          <Link to="/signup">
            <button className="pricing-button">Choose Multi-Site</button>
          </Link>
        </div>

        <div className="pricing-tier">
          <h2>Enterprise Plan</h2>
          <p>Custom solutions for large venues and businesses.</p>
          <ul>
            <li>Unlimited Sites</li>
            <li>Unlimited Areas</li>
            <li>Unlimited Devices</li>
            <li>Dedicated Support</li>
          </ul>
          <p className="price">Contact Us</p>
          <Link to="/contact">
            <button className="pricing-button">Contact Us</button>
          </Link>
        </div>
      </section>

      <footer className="footer">
        <p>Find the right plan for your business and start using SoundScreen today.</p>
        <Link to="/signup">
          <button className="cta-button">Sign Up Now</button>
        </Link>
      </footer>
    </div>
  );
}

export default Pricing;
