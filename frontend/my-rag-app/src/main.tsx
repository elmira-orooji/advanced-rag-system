import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";

import "./index.css";
import App from "./App";

createRoot(
  document.getElementById("root")!
).render(
  <StrictMode>
    <App />

    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: "#0f172a",
          color: "#fff",
          border:
            "1px solid #334155",
        },
      }}
    />
  </StrictMode>
);