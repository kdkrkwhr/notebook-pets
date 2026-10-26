// Headless Chromium can vary native-control edge antialiasing between contexts.
// CI 40289897874 had five select-corner pixels, at most 5/255 per channel.
// Keep both a tiny count bound and a channel bound; report raw differences.
export const rasterTolerance = Object.freeze({maxPixels: 8, maxChannelDelta: 5});

export function rasterMatches(diff) {
  return diff.sameDimensions && diff.differentPixels <= rasterTolerance.maxPixels &&
    diff.maxChannelDelta <= rasterTolerance.maxChannelDelta;
}
