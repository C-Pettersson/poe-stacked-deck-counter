import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { installBrowserPreviewBridge } from "./browserPreviewBridge";
import "./styles.css";

installBrowserPreviewBridge();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
