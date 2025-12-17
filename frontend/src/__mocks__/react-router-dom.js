const React = require('react');

module.exports = {
  BrowserRouter: ({ children }) => React.createElement(React.Fragment, null, children),
  Routes: ({ children }) => React.createElement(React.Fragment, null, children),
  Route: () => null,
  Link: ({ children }) => React.createElement('a', null, children),
  NavLink: ({ children }) => React.createElement('a', null, children),
  useNavigate: () => () => {},
  useLocation: () => ({ pathname: '/' }),
  useParams: () => ({}),
};
