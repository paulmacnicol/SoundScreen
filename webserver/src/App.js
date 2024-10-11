import React from 'react';
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
const PrivateRoute = ({ component: Component, ...rest }) => {
  return (
    <Route
      {...rest}
      render={(props) =>
        isAuthenticated() ? (
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
  return (
    <Router>
      <nav>
        <ul>
          {!isAuthenticated() ? (
            <>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/signup">Signup</Link></li>
              <li><Link to="/login">Login</Link></li>
            </>
          ) : (
            <>
              <li><Link to="/control-panel">Control Panel</Link></li>
              <li><Link to="/subscription">Subscription</Link></li>
              <li><Link to="/" onClick={() => { localStorage.removeItem('token'); window.location.reload(); }}>Sign Out</Link></li>
            </>
          )}
        </ul>
      </nav>

      <Switch>
        <Route path="/" exact component={Home} />
        <Route path="/signup" component={Signup} />
        <Route path="/login" component={Login} />
        <PrivateRoute path="/control-panel" component={ControlPanel} />
        <PrivateRoute path="/subscription" component={SubscriptionPage} /> {/* Add subscription route */}
      </Switch>
    </Router>
  );
}

export default App;
