const normalizeHex = (value: string) => {
  const clean = value.trim().replace(/^#/, "");

  if (/^[0-9a-f]{3}$/i.test(clean)) {
    return clean.split("").map((character) => `${character}${character}`).join("");
  }

  return /^[0-9a-f]{6}$/i.test(clean) ? clean : null;
};

const getRgb = (color: string) => {
  const hex = normalizeHex(color);

  if (hex) {
    return {
      red: Number.parseInt(hex.slice(0, 2), 16),
      green: Number.parseInt(hex.slice(2, 4), 16),
      blue: Number.parseInt(hex.slice(4, 6), 16),
    };
  }

  const rgb = color.match(/rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)/i);
  if (!rgb) return null;

  return {
    red: Number(rgb[1]),
    green: Number(rgb[2]),
    blue: Number(rgb[3]),
  };
};

const getBackgroundRgb = (background: string) => {
  if (!/gradient\(/i.test(background)) return getRgb(background);

  const colorStops = background.match(/#[0-9a-f]{3,6}|rgba?\([^)]*\)/gi) ?? [];
  const rgbStops = colorStops.map(getRgb).filter((color): color is NonNullable<ReturnType<typeof getRgb>> => Boolean(color));

  if (rgbStops.length === 0) return null;

  return rgbStops.reduce(
    (average, color) => ({
      red: average.red + color.red / rgbStops.length,
      green: average.green + color.green / rgbStops.length,
      blue: average.blue + color.blue / rgbStops.length,
    }),
    { red: 0, green: 0, blue: 0 },
  );
};

export const getReadableTextColor = (backgroundColor?: string | null) => {
  if (!backgroundColor) return "var(--bf-text)";

  const rgb = getBackgroundRgb(backgroundColor);
  if (!rgb) return "var(--bf-text)";

  const luminance = (0.2126 * rgb.red + 0.7152 * rgb.green + 0.0722 * rgb.blue) / 255;
  return luminance < 0.54 ? "#f8fafc" : "#0f172a";
};
