import { ThemeProvider } from "./theme/ThemeProvider";
import DashboardPage from "./pages/DashboardPage/DashboardPage";

export default function App() {
  return (
    <ThemeProvider>
      <DashboardPage />
    </ThemeProvider>
  );
}