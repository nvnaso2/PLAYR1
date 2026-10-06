export function fitStoryFontSize(
  text: string,
  maxWidth: number,
  maxFontSize: number,
  minFontSize: number,
  averageGlyphWidth = 0.58,
) {
  const characters = Math.max(text.trim().length, 1);
  const estimatedWidthPerFontSize = characters * averageGlyphWidth;
  const fittingSize = Math.floor(maxWidth / estimatedWidthPerFontSize);
  if (fittingSize < minFontSize) return Math.max(1, fittingSize);
  return Math.min(maxFontSize, fittingSize);
}
