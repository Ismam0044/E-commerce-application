export const IK_PRESETS = {
  catalogCard: {
    width: 600,
    height: 450,
    quality: 80,
    format: "jpg",
  },
};

export function imageKitOptimizedUrl(url, preset) {
  if (typeof url !== "string" || !url) return url;
  const query = new URLSearchParams({
    tr: `w-${preset.width},h-${preset.height},q-${preset.quality},f-${preset.format}`,
  });
  return `${url}${url.includes("?") ? "&" : "?"}${query.toString()}`;
}
