/**
 * Percy Visual Testing Configuration
 * Configures visual regression testing for admin-ui
 */

export const percyConfig = {
  // Snapshot widths for responsive testing
  widths: [375, 768, 1280, 1920],

  // Minimum height for snapshots
  minHeight: 1024,

  // Percy CSS to apply to all snapshots
  percyCSS: `
    /* Hide dynamic elements that change between snapshots */
    .timestamp,
    .live-indicator,
    .random-id {
      visibility: hidden !important;
    }

    /* Disable animations for consistent snapshots */
    * {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }
  `,

  // Enable JavaScript for interactive snapshots
  enableJavaScript: true,

  // Discovery configuration
  discovery: {
    allowedHostnames: ['localhost', '127.0.0.1'],
    disableCache: false,
  },
};
