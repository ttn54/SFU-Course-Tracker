/**
 * Generate a unique, vibrant color for each course based on its courseKey
 * Uses HSL color space for better color distribution
 */
export function generateCourseColor(courseKey: string): string {
  // Simple hash function to convert course key to a number
  let hash = 0;
  for (let i = 0; i < courseKey.length; i++) {
    hash = courseKey.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert hash to hue (0-360 degrees)
  const hue = Math.abs(hash % 360);
  
  // Use fixed saturation and lightness for consistent vibrant colors
  // 65% saturation and 50% lightness work well on dark backgrounds
  const saturation = 65;
  const lightness = 50;
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
