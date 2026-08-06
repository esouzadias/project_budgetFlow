import { ThemeProvider } from "./theme/ThemeProvider";
import { LanguageProvider } from "./localization/LanguageProvider";
import DashboardPage from "./pages/DashboardPage/DashboardPage";

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <DashboardPage />
      </ThemeProvider>
    </LanguageProvider>
  );
}
