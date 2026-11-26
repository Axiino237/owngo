import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store/store.js'
import './index.css'
import App from './App.jsx'
import { registerServiceWorker } from './utils/systemNotification.js'

// Initialize Service Worker for Mobile & Desktop Web Push Notifications
registerServiceWorker();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
