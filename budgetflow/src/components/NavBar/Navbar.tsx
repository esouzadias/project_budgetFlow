// src/components/NavBar/Navbar.tsx
import "./Navbar.style.less";

import { useState } from "react";

import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import LightModeIcon from "@mui/icons-material/LightMode";
import { IconButton, Popover, Tooltip } from "@mui/material";

import { LANGUAGE_OPTIONS } from "../../localization/languages";
import { useLanguage } from "../../localization/useLanguage";
import { useTheme } from "../../theme/useTheme";

function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { activeLanguage, setLanguage } = useLanguage();
  const [languageAnchor, setLanguageAnchor] = useState<HTMLButtonElement | null>(null);
  const [languageTooltipOpen, setLanguageTooltipOpen] = useState(false);
  const isDark = theme === "dark";
  const languageMenuOpen = Boolean(languageAnchor);
  const logoSrc = isDark ? "/BudgetFlow_LogoDark.png" : "/BudgetFlow_LogoLight.png";
  const dictionary = activeLanguage.dictionary;

  return (
    <header id="navbar">
      <div id="navbar-container">
        <div className="navbar__brand" aria-label="BudgetFlow">
          <img className="navbar__logo navbar__logo--full" src={logoSrc} alt="BudgetFlow" />
          <img className="navbar__logo navbar__logo--icon" src="/BudgetFlow_IconOnly.png" alt="BudgetFlow" />
        </div>

        <div id="navbar-right">
          <div className="navbar__language-selector">
            <Tooltip
              title={dictionary.navbar.chooseLanguage}
              enterDelay={250}
              open={languageTooltipOpen && !languageMenuOpen}
              onOpen={() => setLanguageTooltipOpen(true)}
              onClose={() => setLanguageTooltipOpen(false)}
              disableInteractive
              disableHoverListener={languageMenuOpen}
              disableFocusListener={languageMenuOpen}
            >
              <button
                type="button"
                className={`navbar__language-button ${languageMenuOpen ? "navbar__language-button--open" : ""}`}
                onClick={(event) => setLanguageAnchor(event.currentTarget)}
                aria-label={dictionary.navbar.chooseLanguage}
                aria-haspopup="menu"
                aria-expanded={languageMenuOpen}
                aria-controls={languageMenuOpen ? "navbar-language-menu" : undefined}
              >
                <LanguageRoundedIcon fontSize="small" />
                <span>{activeLanguage.localeLabel}</span>
                <KeyboardArrowDownRoundedIcon className="navbar__language-chevron" fontSize="small" />
              </button>
            </Tooltip>

            <Popover
              id="navbar-language-menu"
              open={languageMenuOpen}
              anchorEl={languageAnchor}
              onClose={() => setLanguageAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
              transformOrigin={{ vertical: "top", horizontal: "center" }}
              slotProps={{ paper: { className: "navbar__language-menu" } }}
            >
              <div role="menu" aria-label={dictionary.navbar.languageMenu}>
                {LANGUAGE_OPTIONS.map((language) => {
                  const selected = language.code === activeLanguage.code;

                  return (
                    <button
                      key={language.code}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      className={`navbar__language-option ${selected ? "navbar__language-option--selected" : ""}`}
                      onClick={() => {
                        setLanguage(language.code);
                        setLanguageAnchor(null);
                      }}
                    >
                      <span>{language.localeLabel}</span>
                      {selected ? <CheckRoundedIcon fontSize="small" /> : <span aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </Popover>
          </div>

          <Tooltip title={isDark ? dictionary.navbar.lightMode : dictionary.navbar.darkMode} enterDelay={250}>
            <IconButton className="bf-icon-btn navbar__theme-btn" onClick={toggleTheme} aria-label={dictionary.navbar.toggleTheme}>
              {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
