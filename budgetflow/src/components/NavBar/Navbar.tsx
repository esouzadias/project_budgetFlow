// src/components/NavBar/Navbar.tsx
import "./Navbar.style.less";

import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { IconButton, Tooltip } from "@mui/material";

import { useTheme } from "../../theme/useTheme";

function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const logoSrc = isDark ? "/BudgetFlow_LogoDark.png" : "/BudgetFlow_LogoLight.png";

  return (
    <header id="navbar">
      <div id="navbar-container">
        <div className="navbar__brand" aria-label="BudgetFlow">
          <img className="navbar__logo navbar__logo--full" src={logoSrc} alt="BudgetFlow" />
          <img className="navbar__logo navbar__logo--icon" src="/BudgetFlow_IconOnly.png" alt="BudgetFlow" />
        </div>

        <div id="navbar-right">
          <Tooltip title={isDark ? "Light mode" : "Dark mode"} enterDelay={250}>
            <IconButton className="bf-icon-btn navbar__theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
              {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}

export default Navbar;