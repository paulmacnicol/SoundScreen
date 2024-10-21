import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Switch, Link, Redirect } from 'react-router-dom';
import Signup from './Signup';
import Login from './Login';
import ControlPanel from './ControlPanel';
import Home from './Home';
import SubscriptionPage from './SubscriptionPage'; // Import the subscription page

// Helper function to check if the user is authenticated
const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

// Define the PrivateRoute component
const PrivateRoute = ({ component: Component, isAuthenticated, ...rest }) => {
  return (
    <Route
      {...rest}
      render={(props) =>
        isAuthenticated ? (
          <Component {...props} />
        ) : (
          <Redirect to="/login" />
        )
      }
    />
  );
};

// Final single App function
function App() {
  const [auth, setAuth] = useState({
    isAuthenticated: isAuthenticated(),
    site: null,  // Store user's site
    area: null,  // Store user's area
  });

  // This effect will check if a token is stored in localStorage when the app loads
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setAuth({ ...auth, isAuthenticated: true });
    }
  }, []);

  // Function to handle login (used in the Login component)
  const handleLogin = (token, site, area) => {
    localStorage.setItem('token', token);
    setAuth({
      isAuthenticated: true,
      site: site,  // Store site information from login
      area: area,  // Store area information from login
    });
  };

  // Function to handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    setAuth({
      isAuthenticated: false,
      site: null,
      area: null,
    });
  };

  return (
    <Router>
      <nav>
        <ul>
          {!auth.isAuthenticated ? (
            <>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/signup">Signup</Link></li>
              <li><Link to="/login">Login</Link></li>
            </>
          ) : (
            <>
              <li><Link to="/control-panel">Control Panel</Link></li>
              <li><Link to="/" onClick={handleLogout}>Sign Out</Link></li>
            </>
          )}
        </ul>
      </nav>

      <Switch>
        <Route path="/" exact component={Home} />
        <Route path="/signup" component={Signup} />
        {/* Pass the handleLogin function to the Login component */}
        <Route path="/login" component={() => <Login onLogin={handleLogin} />} />
        <PrivateRoute path="/control-panel" component={ControlPanel} isAuthenticated={auth.isAuthenticated} />
      </Switch>
    </Router>
  );
}

export default App;
