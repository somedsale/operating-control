import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { Provider } from 'react-redux';
import { store } from './store';
import './i18n'; // Khởi tạo i18next
import { BrowserRouter } from 'react-router-dom';
import { WebSocketProvider } from './context/WebSocketContext.js';
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <WebSocketProvider>

     <BrowserRouter>
        <App />
      </BrowserRouter>
      </WebSocketProvider>
    </Provider>
  </React.StrictMode>,
);