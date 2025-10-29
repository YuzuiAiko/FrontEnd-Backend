// filepath: frontend/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import "./i18n"; // Import i18n for internationalization
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker with different strategies for web and desktop
const isElectron = window.process && window.process.type === 'renderer';
if (isElectron) {
  // In Electron, only register if we're not using file:// protocol (e.g., in dev mode)
  if (!/^file:/.test(window.location.href)) {
    serviceWorkerRegistration.register();
  }
} else {
  // In web browser, always register
  serviceWorkerRegistration.register();
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
