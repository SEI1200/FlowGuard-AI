import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "./theme";
import { LanguageProvider } from "./i18n/LanguageContext";
import { ProjectProvider } from "./context/ProjectContext";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LanguageProvider>
        <ProjectProvider>
          <App />
        </ProjectProvider>
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>,
);
