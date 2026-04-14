import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import { MusicPlayer } from "./components/MusicPlayer";
 
createRoot(document.getElementById("root")!).render(
  <StrictMode>
  <MusicPlayer />
  </StrictMode>
);
