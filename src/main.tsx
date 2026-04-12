import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./app/providers/AuthProvider";
import { OnboardingGate } from "./app/components/OnboardingGate";
import "./styles/index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element with id 'root' was not found");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <OnboardingGate>
          <App />
        </OnboardingGate>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);