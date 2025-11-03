import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/tiktok.css";
import { initI18n } from "./i18n/config";

// Initialiser i18n après que React soit chargé
initI18n();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
