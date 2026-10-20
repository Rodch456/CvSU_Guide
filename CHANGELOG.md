# Changelog

All notable changes to the CvSU Admission Guide are recorded here.

This project uses [Semantic Versioning](https://semver.org/):

- **Patch** (`1.0.1`): fixes and small visual adjustments
- **Minor** (`1.1.0`): new backward-compatible features or pages
- **Major** (`2.0.0`): large redesigns or incompatible changes

## [1.7.0] - 2026-10-19

### Fixed

- Configure the native startup splash with the CvSU logo and keep it visible until the welcome logo loads.
- Declare the splash-screen dependency so clean Expo cloud builds can resolve its plugin.
- Start the welcome-screen timer after its logo loads.
- Automatically check all requirements when a step is marked completed or the admission examination is passed.

## [1.6.0] - 2026-10-19

### Added

- Swipe down or tap the Journey step details handle to close the panel.
- LGBTQ+ uniform options note in the Map page's During classes guide.

## [1.5.0] - 2026-10-13

### Added

- Animated campus walking guide with dust effects, destination messages, and adjustable walking speed.
- Clickable Journey completion stamps and applicant progress summary.
- Background music and expanded playback speeds for muted video guides.

### Fixed

- Android map marker alignment, responsive arrival messages, and fullscreen zoom reset.
- Responsive centered app header, FAQ avatar tap appearance, and solid location selection stripes.
- Journey step dialogs stay on Journey when dismissed.
- Re-application excludes the failed program and updates the saved profile and journey after a pass.

### Changed

- Updated campus photos and guide videos, with Git LFS storage for MOV media.

## [1.2.0] - 2026-09-03

### Added

- Welcome screen with applicant setup and guest access
- Applicant profile customization with nickname and photo support
- Campus gate, office, uniform, and infirmary guide media
- Onboarding personalization help and improved progress display

### Changed

- Expanded the app guide with video and image assets for key campus services
- Added Expo font and video support for the new guide experience

## [1.1.0] - 2026-08-28

### Added

- Editable applicant profile page
- Nickname customization across the app
- Profile photo selection from the device library
- Guest mode with a dedicated applicant setup flow
- Profile reset and guest-mode exit controls
- Illustrated CvSU guide avatar asset

### Changed

- Home is now the first tab in the main navigation
- Applicant profile data and photo are shared with Home and Journey

## [1.0.0] - 2026-08-28

### Added

- Applicant onboarding for profile, track, and program selection
- Synchronized Home, Status, and Journey progress
- Admission instructions and optional requirement checklists
- Sequential step completion and latest-step undo
- Admission examination, re-examination, and stopped-application states
- Interactive Journey trail with animated connectors
- Home dashboard based on the CvSU green, yellow, and white theme
- Campus Map with official map and legend assets
- Map zoom in, zoom out, reset, and fullscreen controls
- Searchable and filterable FAQ page with 27 answers
- Animated FAQ guide and 12 rotating campus trivia facts

[1.1.0]: https://github.com/Rodch456/CvSU_Guide/tree/v1.1.0
[1.2.0]: https://github.com/Rodch456/CvSU_Guide/tree/v1.2.0
[1.0.0]: https://github.com/Rodch456/CvSU_Guide/tree/v1.0.0
