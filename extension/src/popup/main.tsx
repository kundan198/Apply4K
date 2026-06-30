import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
// NOTE: popup.css is built separately via PostCSS/Tailwind in scripts/build.mjs
// and linked from public/popup.html. It is intentionally NOT imported here so
// esbuild does not emit an un-processed copy that overwrites the Tailwind build.

const el = document.getElementById("root");
if (el) createRoot(el).render(<React.StrictMode><App /></React.StrictMode>);
