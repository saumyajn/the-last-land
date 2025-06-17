import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { PermissionSnackbarProvider } from './components/Permissions';
import { AuthProvider } from './utils/authContext';
window.close = () => {
  console.log("🔒 window.close() was blocked but caught safely.");
};
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Suspense fallback={<div>LOADING...</div>}>
      <AuthProvider>
        <PermissionSnackbarProvider>
          <App />
        </PermissionSnackbarProvider>
      </AuthProvider>
    </Suspense>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
