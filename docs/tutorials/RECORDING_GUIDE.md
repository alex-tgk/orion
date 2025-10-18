# Video Tutorial Recording Guide

This guide provides detailed instructions for recording high-quality video tutorials for the ORION platform. Whether you're a core team member or community contributor, these guidelines will help you create professional, consistent video content.

## Table of Contents

- [Recording Tools](#recording-tools)
- [Video Specifications](#video-specifications)
- [Audio Requirements](#audio-requirements)
- [Screen Setup](#screen-setup)
- [Recording Workflow](#recording-workflow)
- [Editing Guidelines](#editing-guidelines)
- [Hosting & Publishing](#hosting--publishing)
- [Quality Checklist](#quality-checklist)

---

## Recording Tools

### Screen Recording Software

#### Recommended (Free)
- **OBS Studio** (Windows, macOS, Linux)
  - Open source and highly customizable
  - Supports multiple scenes and sources
  - Built-in streaming capabilities
  - Download: https://obsproject.com/

- **QuickTime Player** (macOS)
  - Simple and built-in
  - Good for basic screen recordings
  - File → New Screen Recording

#### Professional Options
- **Camtasia** ($299 one-time)
  - Excellent editing features
  - Built-in annotations and effects
  - Easy to learn

- **ScreenFlow** (macOS, $169 one-time)
  - Professional editing suite
  - Great for tutorials
  - Smooth animations

### Audio Recording

#### Microphones
- **Budget**: Blue Snowball ($50-70)
- **Mid-range**: Blue Yeti ($130)
- **Professional**: Shure SM7B ($400) + Audio Interface

#### Audio Software
- **Audacity** (Free, all platforms)
- **Adobe Audition** (Professional)
- **Logic Pro** (macOS)

### Video Editing

#### Free Options
- **DaVinci Resolve** - Professional features, free tier
- **iMovie** (macOS) - Simple, user-friendly
- **Shotcut** - Open source, cross-platform

#### Professional
- **Adobe Premiere Pro** - Industry standard
- **Final Cut Pro** (macOS) - Professional editing

---

## Video Specifications

### Resolution & Format

```yaml
Resolution: 1920x1080 (1080p Full HD)
Frame Rate: 30 fps (60 fps for screen capture)
Aspect Ratio: 16:9
Format: MP4 (H.264 codec)
Bitrate: 8-12 Mbps for video
Audio: AAC, 192 kbps, 48 kHz
```

### File Size Guidelines

- Target: 200-300 MB per 15 minutes
- Maximum: 500 MB per 15 minutes
- Use variable bitrate (VBR) for better quality/size ratio

### Export Settings (OBS)

```
Encoder: x264
Rate Control: CBR
Bitrate: 10000 Kbps
Keyframe Interval: 2
CPU Usage Preset: veryfast (while recording)
Profile: high
Tune: none
```

### Export Settings (Final Cut/Premiere)

```
Format: H.264
Resolution: 1920x1080
Frame Rate: 30 fps
Data Rate: 10 Mbps (VBR, 2-pass)
Audio: AAC, 192 kbps
```

---

## Audio Requirements

### Recording Environment

1. **Quiet Space**
   - Close windows to reduce outside noise
   - Turn off fans, AC, appliances
   - Use "Do Not Disturb" on devices
   - Record during quiet times

2. **Room Treatment** (if possible)
   - Hang blankets to reduce echo
   - Use foam panels on walls
   - Record in carpeted rooms
   - Avoid hard, reflective surfaces

### Microphone Setup

```
Distance: 6-8 inches from mouth
Position: Slightly off-axis (not directly in front)
Pop Filter: Yes (essential)
Gain: Adjust so peaks are -12 to -6 dB
```

### Audio Levels

- **Target**: -12 dB average, -6 dB peaks
- **Background noise**: Below -40 dB
- **Music (if used)**: -20 to -18 dB (lower than voice)

### Voice Guidelines

- Speak clearly and at moderate pace
- Avoid "um", "uh", "like" filler words
- Pause between sections (makes editing easier)
- Read from script but sound natural
- Smile while talking (improves tone)
- Stay hydrated

---

## Screen Setup

### Terminal Configuration

```bash
# Font settings
Font: Menlo, Monaco, or Fira Code
Size: 16-18pt (should be readable at 1080p)
Colors: High contrast theme
Background: Dark theme recommended

# iTerm2/Terminal settings
Opacity: 95-100% (avoid transparency)
Cursor: Block or underline, high visibility
Line spacing: 110-120%
```

### VS Code Settings

```json
{
  "editor.fontSize": 16,
  "editor.fontFamily": "Fira Code, Menlo, Monaco",
  "editor.lineHeight": 1.6,
  "editor.minimap.enabled": false,
  "workbench.colorTheme": "One Dark Pro",
  "editor.renderWhitespace": "none",
  "breadcrumbs.enabled": true,
  "window.zoomLevel": 1
}
```

### Browser Setup

- Zoom: 110-125% for better readability
- Hide bookmarks bar
- Close unnecessary tabs
- Use incognito/private mode (clean state)
- Disable auto-fill suggestions

### Desktop Preparation

1. **Clean Desktop**
   - Remove personal files/folders
   - Use solid color or subtle background
   - Hide desktop icons (macOS: Cmd+Shift+Period)

2. **Menubar**
   - Hide unnecessary items
   - Set to auto-hide (if possible)
   - Remove sensitive information

3. **Notifications**
   - Enable "Do Not Disturb"
   - Disable all notifications
   - Close messaging apps

---

## Recording Workflow

### Pre-Recording Checklist

```markdown
- [ ] Script reviewed and practice run completed
- [ ] Recording software configured and tested
- [ ] Microphone tested (record 30s, listen back)
- [ ] Terminal font size increased (16-18pt)
- [ ] VS Code zoom increased (1-2 levels)
- [ ] Desktop cleaned and notifications disabled
- [ ] Glass of water nearby
- [ ] Quiet environment confirmed
- [ ] Test recording saved to correct location
```

### Recording Process

#### 1. Slate (Introduction)

Record a slate at the beginning:
```
"This is Tutorial [Number] - [Title]
Take [Number]
Date: [Today's date]"
```

This helps during editing to identify recordings.

#### 2. Recording Tips

- **Start with silence**: Record 3-5 seconds before speaking
- **End with silence**: Record 2-3 seconds after finishing
- **Pause on errors**: Stop, wait 3 seconds, restart from last section
- **Mark good takes**: Make a note of timestamp for best versions
- **Save frequently**: Save every 10-15 minutes

#### 3. Multiple Takes

- Record each section 2-3 times
- Don't stop recording between takes
- Clap or snap to mark take boundaries
- Review audio levels between sections

#### 4. Screen Actions

- **Slow down**: Move mouse slower than normal
- **Highlight cursor**: Use cursor highlighter software
- **Pause before typing**: Let viewers see what you're about to do
- **Wait for output**: Give time to read command output
- **Use keyboard shortcuts visibly**: Show what keys you're pressing

### Recording Segments

Break tutorials into segments:

1. **Introduction** (1-2 minutes)
   - Topic overview
   - Learning objectives
   - Prerequisites

2. **Main Content** (sections of 3-5 minutes each)
   - One concept per segment
   - Clear transitions between sections

3. **Conclusion** (1 minute)
   - Recap what was learned
   - Next steps
   - Resources

---

## Editing Guidelines

### Editing Workflow

1. **Import & Organize**
   - Create project folder: `tutorial-XX-title/`
   - Subfolders: `raw/`, `audio/`, `assets/`, `export/`
   - Name files descriptively

2. **Assembly Edit**
   - Remove mistakes and retakes
   - Select best takes of each section
   - Remove long pauses (keep natural breathing)
   - Trim intro/outro silence to 1-2 seconds

3. **Fine Edit**
   - Cut filler words
   - Adjust pacing
   - Sync audio if needed
   - Add B-roll if needed

4. **Audio Processing**
   ```
   1. Noise Reduction (if needed)
   2. EQ: High-pass filter at 80 Hz
   3. Compression: Ratio 3:1, Threshold -18 dB
   4. Normalize: -3 dB peak
   5. Limiter: -1 dB ceiling
   ```

5. **Visual Enhancements**
   - Add title cards
   - Add callouts/annotations
   - Highlight important text
   - Add zoom effects (sparingly)

### Annotations & Callouts

#### When to Use
- Highlighting important commands
- Pointing out key output
- Emphasizing warnings or errors
- Showing keyboard shortcuts

#### Guidelines
```yaml
Color Scheme:
  - Info: Blue (#007AFF)
  - Success: Green (#34C759)
  - Warning: Orange (#FF9500)
  - Error: Red (#FF3B30)

Font: Sans-serif, bold
Size: 24-32pt
Animation: Fade in/out (0.3s)
Duration: 3-5 seconds
```

### Transitions

- **Between sections**: Simple fade (0.5s)
- **Between topics**: Fade to black (1s) + title card
- **No**: Fancy wipes, spins, or complex transitions

### B-Roll & Supplementary Content

- Architecture diagrams
- Code snippets (isolated)
- Documentation screenshots
- Terminal output (enlarged)

### Music (Optional)

If using background music:
- **Intro/Outro only**: Keep main content clean
- **Volume**: -20 to -18 dB (much quieter than voice)
- **Style**: Ambient, non-distracting
- **License**: Royalty-free (YouTube Audio Library, Artlist, Epidemic Sound)

---

## Hosting & Publishing

### YouTube (Recommended Primary)

#### Channel Setup
```yaml
Channel Name: ORION Platform
Description: Official tutorials for the ORION microservices platform
Banner: 2560x1440 with ORION branding
Profile Image: ORION logo
```

#### Video Upload Settings
```yaml
Title: "ORION Tutorial XX: [Descriptive Title] | [Topic Area]"
  Example: "ORION Tutorial 01: Project Setup | Getting Started"

Description Template:
  "Learn [main topic] in this comprehensive ORION tutorial.

  In this video you'll learn:
  - [Objective 1]
  - [Objective 2]
  - [Objective 3]

  📝 Script: https://github.com/org/orion/docs/tutorials/video-scripts/XX-title.md
  📚 Documentation: https://docs.orion.dev
  💻 GitHub: https://github.com/org/orion

  Timestamps:
  0:00 Introduction
  1:30 Section 1
  5:45 Section 2
  ...

  #ORION #Microservices #NestJS #Tutorial"

Tags:
  - ORION
  - microservices
  - NestJS
  - TypeScript
  - tutorial
  - [specific topics]

Thumbnail:
  - Resolution: 1280x720
  - Include title text
  - ORION branding
  - High contrast, readable
  - No clickbait

Playlist: Add to appropriate tutorial series playlist

End Screen:
  - Subscribe button
  - Next tutorial
  - Playlist link
```

### Alternative Platforms

#### Vimeo (Professional Backup)
- Higher quality, less compression
- Better player customization
- Professional appearance
- Requires paid account for best features

#### GitHub (Script Repository)
- Host scripts in /docs/tutorials/
- Link to from video descriptions
- Version control for improvements
- Community contributions

#### Documentation Site
- Embed YouTube videos
- Provide text alternatives
- Add code snippets
- Link to resources

---

## Quality Checklist

### Pre-Upload Review

```markdown
Audio Quality:
- [ ] No background noise or hum
- [ ] Clear, understandable speech
- [ ] Consistent volume throughout
- [ ] No clipping or distortion
- [ ] No echo or reverb

Video Quality:
- [ ] 1920x1080 resolution
- [ ] Text is clearly readable
- [ ] No blurry or pixelated sections
- [ ] Smooth playback, no stuttering
- [ ] Colors are accurate and vibrant

Content Quality:
- [ ] Follows script accurately
- [ ] All commands work as shown
- [ ] No errors or mistakes
- [ ] Proper pacing (not too fast/slow)
- [ ] Clear explanations

Technical Quality:
- [ ] Correct file format (MP4/H.264)
- [ ] Proper metadata (title, description)
- [ ] Thumbnail created and attractive
- [ ] Timestamps added to description
- [ ] Links verified and working

Accessibility:
- [ ] Closed captions added (auto-generate + review)
- [ ] Script available in repository
- [ ] Clear audio for screen readers
- [ ] High contrast visuals
```

### Post-Upload Tasks

1. **Verify Upload**
   - Watch through completely
   - Test all links in description
   - Check captions for accuracy
   - Verify thumbnail displays correctly

2. **Update Documentation**
   - Add video link to README
   - Update tutorial index
   - Cross-reference in docs

3. **Announce**
   - Share in Discord/Slack
   - Post on GitHub Discussions
   - Tweet/share on social media
   - Add to newsletter

---

## Tips for Success

### Common Mistakes to Avoid

1. **Technical**
   - Text too small to read
   - Audio too quiet or distorted
   - Mouse moving too fast
   - Not showing what you're typing

2. **Content**
   - Assuming too much knowledge
   - Going too fast
   - Not explaining why, just how
   - Forgetting to show the result

3. **Production**
   - Background noise
   - Notifications popping up
   - Personal information visible
   - Unprofessional language

### Best Practices

1. **Show, Don't Just Tell**
   - Demonstrate concepts visually
   - Use real examples
   - Show expected output
   - Highlight important parts

2. **Be Conversational**
   - Speak naturally
   - Use "we" instead of "you"
   - Acknowledge when things are tricky
   - Be encouraging

3. **Respect Viewer's Time**
   - Get to the point quickly
   - No long intros or outros
   - Timestamps in description
   - Clear section breaks

4. **Make it Searchable**
   - Use keywords in title
   - Detailed description
   - Accurate tags
   - Transcript available

---

## Resources

### Software Downloads
- OBS Studio: https://obsproject.com/
- DaVinci Resolve: https://www.blackmagicdesign.com/products/davinciresolve
- Audacity: https://www.audacityteam.org/

### Learning Resources
- YouTube Creator Academy: https://creatoracademy.youtube.com/
- Video Production Basics: https://www.youtube.com/watch?v=videoid

### Stock Assets
- Royalty-free music: https://www.youtube.com/audiolibrary
- Icons: https://www.flaticon.com/
- Fonts: https://fonts.google.com/

### Community
- Discord: #tutorial-creators channel
- GitHub Discussions: Tutorial section
- Monthly video review meetings

---

## Getting Help

Questions about recording tutorials? Reach out:

- **GitHub Issues**: Technical questions about content
- **Discord**: #tutorial-creators for recording help
- **Email**: tutorials@orion.dev for private feedback

---

## Version History

- **v1.0** (October 2025): Initial recording guide created

---

**Thank you for contributing to ORION's educational content!**

Your efforts help developers worldwide learn and master the platform. Every tutorial makes a difference.
