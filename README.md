# SafeInnocence 🛡️

A Chrome extension that protects children from violent and sexual content using Chrome's built-in AI capabilities.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Chrome](https://img.shields.io/badge/Chrome-138%2B-blue.svg)](https://www.google.com/chrome/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-orange.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Built-in AI](https://img.shields.io/badge/Built--in%20AI-Gemini%20Nano-purple.svg)](https://developer.chrome.com/docs/ai/built-in)

---

## 🏆 Google Chrome Built-in AI Challenge 2025

**This project is a submission for the [Google Chrome Built-in AI Challenge 2025](https://googlechromeai.devpost.com/)**

**Challenge Theme**: *Innovate with Intelligence: Build the Future of the Web with Gemini Nano and Chrome AI*

SafeInnocence demonstrates the power of Chrome's on-device AI capabilities by creating a practical solution for child safety online. By leveraging **Gemini Nano** through the **Prompt API** and **Summarizer API**, this extension provides real-time content filtering without compromising privacy - all processing happens locally on the user's device.

### Why This Project Matters
- 🛡️ **Real-world Impact**: Protects children from harmful online content
- 🔒 **Privacy-First**: Zero data leaves the device - 100% local AI processing
- ⚡ **Performance**: Optimized concurrent AI analysis with caching
- 🌐 **Universal**: Works across all websites including social media platforms
- 🎨 **Modern UX**: Beautiful dark/light theme with intuitive controls

---

## Overview

SafeInnocence uses Chrome's **Gemini Nano AI** model to analyze web pages in real-time and protect children from inappropriate content. The extension operates entirely on-device, ensuring complete privacy while providing robust content filtering across the web.

### Key Features

- 🖼️ **Real-time Image Analysis** - Scans all images for violent or sexual content
- 📝 **Text Content Analysis** - Reviews page text for inappropriate themes
- 🚫 **Smart Page Blocking** - Blocks entire pages when harmful content exceeds threshold
- 🌐 **Social Media Protection** - Special filtering mode for YouTube, Instagram, Twitter/X, Facebook, TikTok, Reddit, Discord, and more
- 🔍 **Search Engine Safe Mode** - Filters inappropriate content on Google Search and other search engines without blocking the page
- 🎨 **Dark/Light Theme** - Beautiful UI with dark mode (default) and light mode toggle
- 🔒 **Master Password Protection** - Secure access to manage blocked sites
- 📊 **Blocked Sites Management** - View and manage partially/totally blocked sites
- 🔄 **Dynamic Content Monitoring** - Watches for lazy-loaded and AJAX content
- 🎯 **Concurrency Control** - Optimized AI analysis with parallel processing
- 💾 **Offline Operation** - All processing happens locally on your device
- ⚙️ **Customizable Settings** - Multiple sensitivity levels and thresholds

## Chrome Built-in AI APIs Used

SafeInnocence leverages Chrome's powerful on-device AI APIs:

### 1. **Prompt API (LanguageModel)** ⭐ Primary Engine
- **Purpose**: Content safety analysis for both text and images
- **Capabilities**: Multimodal analysis (text + images)
- **Model**: Gemini Nano
- **Use Cases**:
  - Image classification for inappropriate content
  - Text analysis for harmful themes
  - Comment and post filtering on social media
  - Severity assessment (low/medium/high)
  - Category detection (violence, adult content, hate speech, etc.)
- **Configuration**:
  ```javascript
  LanguageModel.create({
    systemPrompt: "Content safety analyzer for child protection...",
    expectedInputs: [
      { type: "text", languages: ["en", "es"] },
      { type: "image" }
    ],
    expectedOutputs: [{ type: "text", languages: ["en"] }],
    outputLanguage: "en"
  })
  ```

### 2. **Summarizer API**
- **Purpose**: Content summarization for faster text analysis
- **Capabilities**: Condense long text into key points
- **Use Cases**:
  - Summarizing page content before safety analysis
  - Reducing processing time for long articles
  - Extracting main themes from text-heavy pages
- **Configuration**:
  ```javascript
  Summarizer.create({
    type: "key-points",
    format: "plain-text",
    length: "short"
  })
  ```

## Features In-Depth

### 🛡️ Multi-Layer Protection System

#### 1. Image Analysis
- **Fast Prefiltering**: Keyword-based quick checks before AI analysis
- **Size Prioritization**: Analyzes larger images first (more likely to contain harmful content)
- **Smart Caching**: Remembers analysis results to avoid re-processing (24-hour cache)
- **Cross-Origin Handling**: Safely processes images from different domains
- **YouTube Integration**: Automatically disables video links when thumbnails are blocked
- **Progress Indicator**: Real-time progress bar showing analysis status
- **Viewport Optimization**: Prioritizes visible images over off-screen content

#### 2. Text Content Analysis
- **Content Summarization**: Uses Summarizer API to process long text efficiently
- **Multi-Category Detection**:
  - 🔞 Adult Content & Sexual Material
  - ⚔️ Violence & Gore
  - 💀 Self-Harm & Suicide
  - 😡 Cyberbullying & Harassment
  - 🎯 Hate Speech & Discrimination
  - 💣 Threats & Intimidation
  - 💊 Substance Abuse
  - 🔒 Personal Information Exposure
  - ⚡ Extremism & Radicalization
  - 📰 Misinformation

#### 3. Social Media Special Mode
Platforms with intelligent content filtering (blocks content, not the entire platform):
- **YouTube**: Blurs inappropriate thumbnails, disables video links
- **Instagram**: Filters posts and stories
- **Twitter/X**: Analyzes tweets and media
- **Facebook**: Scans posts and comments
- **TikTok**: Reviews video thumbnails and comments
- **Reddit**: Checks posts and comments
- **Discord**: Monitors messages
- **LinkedIn**: Content safety
- **Pinterest**: Image filtering
- **Tumblr**: Post analysis
- **Google Search**: Safe search enhancement

**Smart Blocking Logic**:
- Social media/search engines: Blocks content individually + temporary page block if threshold exceeded (does NOT add to blocked sites list)
- Regular websites: Blocks content + permanent page block if threshold exceeded (saves to blocked sites list)

#### 4. Dynamic Content Monitoring
- **MutationObserver**: Detects newly added DOM elements
- **Scroll Observer**: Analyzes lazy-loaded content as user scrolls (throttled to 500ms)
- **Automatic Re-analysis**: Monitors AJAX and SPA content changes
- **Performance Optimized**: Batch processing with concurrency limits

### 🎨 Modern UI Design

#### Dark Theme (Default)
- Background: `#1a1a2e` → `#16213e` gradient
- Primary Colors: Purple (`#7c3aed`) and Green (`#10b981`)
- Gradient Header: `linear-gradient(135deg, #7c3aed 0%, #10b981 100%)`
- Smooth transitions and modern card-based layout

#### Light Theme
- Clean white backgrounds with subtle shadows
- Swapped color scheme for better readability
- One-click toggle in settings panel
- Persistent theme preference

#### Progress Indicator
- **Compact Design**: Small, non-intrusive indicator (180-220px wide)
- **Top-Right Position**: Fixed position at (15px, 15px)
- **Close Button**: Dismiss while analysis continues in background
- **Real-time Updates**: Shows "Analyzing images: X/Y"
- **Progress Bar**: Visual percentage indicator
- **Animations**: Smooth slide-in/slide-out effects

### 🔒 Security Features

#### Master Password System
- **SHA-256 Hashing**: Passwords stored securely using `crypto.subtle.digest`
- **Unblock Protection**: Requires password to temporarily or permanently unblock sites
- **Remove Protection**: Password needed to delete sites from blocked list
- **Optional**: Can be disabled by leaving password fields empty

#### Blocked Sites Management
- **Two Block Types**:
  - **Partial**: Some content filtered (green badge)
  - **Total**: Entire page blocked (red badge)
- **Metadata Tracking**:
  - URL and timestamp
  - Block reason (specific categories detected)
  - Unblock status
- **Actions**:
  - **Unblock Temporarily**: Allow access for current session
  - **Unblock Indefinitely**: Remove from blocked list permanently
  - **Remove**: Delete entry from list

### ⚙️ Customizable Settings

#### Protection Sensitivity
- **High** (Recommended): Threshold = 3 items, maximum protection
- **Medium**: Threshold = 5 items, balanced approach
- **Low**: Threshold = 7 items, only explicit content

#### Block Threshold
- Custom threshold: 1-10 inappropriate items before page block
- Overrides default sensitivity thresholds
- Configurable per user preference

#### Analysis Options
- ✅ Analyze Images (toggle)
- ✅ Analyze Text Content (toggle)
- ✅ Show Notifications (toggle)

### 📊 Statistics & Monitoring

#### Extension Popup Shows:
- **Pages Analyzed**: Total count of pages scanned
- **Content Blocked**: Number of individual items filtered
- **Pages Blocked**: Count of completely blocked pages
- **Quick Toggle**: Enable/disable protection on the fly
- **Settings Access**: Direct link to options page

## Requirements

### System Requirements
- **Chrome Version**: 138 or later
- **Operating System**:
  - Windows 10 or 11
  - macOS 13+ (Ventura or later)
  - Linux (supported distributions)
  - ChromeOS (Chromebook Plus)
- **Storage**: At least 22GB free disk space (for AI models)
- **Hardware**:
  - GPU with 4GB+ VRAM, **OR**
  - CPU with 16GB+ RAM and 4+ cores
- **Network**: Unmetered connection for initial AI model download (~2-4GB)

### Important Notes
- ❌ Not available on mobile devices (Android/iOS)
- 📥 AI models download automatically on first use
- 💾 Models improve over time with usage
- 🌐 Internet only needed for model download, then works offline

## Installation

### From Source (Developer Mode)

1. **Download or clone this repository**
   ```bash
   git clone https://github.com/yourusername/SafeInnocence.git
   ```

2. **Open Chrome Extensions**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)

3. **Load Extension**
   - Click "Load unpacked"
   - Select the `SafeInnocence` folder
   - Extension appears in your extensions list

4. **First Run Setup**
   - Extension opens settings page automatically
   - Check AI model availability status
   - Configure protection preferences
   - Set master password (optional)
   - Start browsing safely!

### AI Model Download

On first use, Chrome will download Gemini Nano:
- Visit any website to trigger download
- Check progress at `chrome://on-device-internals`
- Download size: ~2-4GB (requires unmetered connection)
- One-time download, then works offline

## Usage

### Basic Operation

SafeInnocence works automatically once installed:

1. **Visit any website** → Extension starts analyzing
2. **Inappropriate content is blurred** → Images get blur filter + block overlay
3. **YouTube videos are disabled** → Video links become unclickable
4. **Page blocking** → Shows modal if too much harmful content detected
5. **Social media filtering** → Filters individual posts/comments without blocking entire site

### Settings Configuration

Access settings via:
- Click extension icon → "Settings" button
- Right-click extension icon → "Options"
- `chrome://extensions/` → SafeInnocence → "Details" → "Extension options"

#### Recommended Settings for Children

**Maximum Protection**:
```
Sensitivity: High
Block Threshold: 3
✅ Analyze Images
✅ Analyze Text Content
✅ Show Notifications
✅ Master Password enabled
```

**Balanced Protection** (teens):
```
Sensitivity: Medium
Block Threshold: 5
✅ Analyze Images
✅ Analyze Text Content
❌ Show Notifications
```

### Managing Blocked Sites

1. Open Settings → Scroll to "Blocked Sites" section
2. View all blocked sites with details:
   - URL and timestamp
   - Block type (partial/total)
   - Reason for blocking
3. Actions available:
   - **Unblock**: Requires master password if set
   - **Remove**: Permanently delete from list (requires password)

### Progress Indicator

The analysis progress indicator appears at top-right when scanning pages:

- Shows real-time progress: "Analyzing images: 45/120"
- Click **X** to close (analysis continues in background)
- Auto-hides when analysis complete
- Gradient purple-green design matches theme

## How It Works

### Content Analysis Pipeline

```
Page Load
    ↓
Detect Platform (Social Media / Search Engine / Regular)
    ↓
Initialize AI Models (Prompt API + Summarizer)
    ↓
Show Progress Indicator
    ↓
[Social Media Path]              [Regular Website Path]
    ↓                                   ↓
Analyze Images (thumbnails)       Analyze All Images (priority: large → small)
    ↓                                   ↓
Analyze Comments/Posts            Analyze Text Content
    ↓                                   ↓
Apply Filters Individually        Evaluate Page Safety
    ↓                                   ↓
Check Threshold                   Check Threshold
    ↓                                   ↓
If Exceeded: Temp Block           If Exceeded: Block Page + Save to List
(No save to blocked list)
    ↓
Hide Progress Indicator
    ↓
Setup MutationObserver (watch for new content)
    ↓
Setup ScrollObserver (analyze lazy-loaded content)
```

### AI Analysis Process

**For Images**:
1. Fast prefilter (keyword check in src/alt/context)
2. Size check (skip icons <5000px²)
3. Cache lookup (24-hour TTL)
4. Convert to ImageBitmap or Blob
5. Send to Prompt API with safety analysis prompt
6. Receive JSON response: `{inappropriate, reason, severity, categories}`
7. If inappropriate: increment counter, blur image, disable if YouTube video
8. Update progress bar
9. Cache result

**For Text**:
1. Extract main text content (p, article, h1-h3, div.content)
2. Limit to 5000 characters
3. Summarize using Summarizer API (if available)
4. Send to Prompt API for safety analysis
5. Weight severity: high=5, medium=3, low=1
6. Add to blocked content count

**Threshold Evaluation**:
- Count all inappropriate items
- Compare against threshold (default: 3/5/7 based on sensitivity)
- If exceeded:
  - Social media/search: Create temporary block modal (no save)
  - Regular site: Create block modal + save to storage

### Privacy & Security

**100% Local Processing**:
- ✅ All AI runs on your device (Gemini Nano)
- ✅ No data sent to external servers
- ✅ No tracking or analytics
- ✅ No internet needed after model download
- ✅ Passwords hashed with SHA-256
- ✅ All storage is local (Chrome Storage API)

**Data Stored Locally**:
- User settings (sensitivity, thresholds)
- Blocked sites list (URLs, timestamps, reasons)
- Master password hash (SHA-256)
- Statistics (pages analyzed, content blocked)
- Theme preference
- Image analysis cache (24h TTL)

## Development

### Project Structure

```
SafeInnocence/
├── manifest.json          # Extension configuration (Manifest V3)
├── background.js          # Service worker (lifecycle, stats, notifications)
├── content.js            # Main content analyzer (ContentAnalyzer class)
├── content.css           # Styles for blocked content overlays
├── popup.html            # Extension popup UI (stats, toggle)
├── popup.js              # Popup functionality
├── options.html          # Settings page UI (dark/light theme)
├── options.js            # Settings logic (save/load, theme, passwords)
├── modal.html            # Block screen modal
├── icons/                # Extension icons
│   ├── icon16.png       # Toolbar icon
│   ├── icon48.png       # Extension management
│   └── icon128.png      # Chrome Web Store
└── README.md            # This file
```


## Future Improvements

Potential enhancements for future versions:

- [ ] Whitelist functionality (always allow specific domains)
- [ ] Custom category toggles (disable specific content types)
- [ ] Activity reports (daily/weekly summaries)
- [ ] Multiple user profiles
- [ ] Import/export settings
- [ ] Scheduled protection (time-based rules)
- [ ] Multi-language support (improve non-English accuracy)
- [ ] Video content analysis (when APIs support)
- [ ] Performance optimizations (WebAssembly, Web Workers)
- [ ] Browser sync (sync settings across devices)

## Contributing

Contributions are welcome! This is an educational project demonstrating Chrome's built-in AI capabilities.

### How to Contribute

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Areas for Contribution

- 🐛 Bug fixes
- ✨ New features
- 📝 Documentation improvements
- 🌍 Translations
- 🎨 UI/UX enhancements
- ⚡ Performance optimizations
- 🧪 Test coverage

## License

This project is licensed under the **MIT License** - see below for details.

```
MIT License

Copyright (c) 2025 SafeInnocence

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Disclaimer

**⚠️ Important Notice**:

This extension is a **protective tool** but is **not 100% foolproof**. The AI model may make mistakes in content classification. **Adult supervision is still recommended** when children are browsing the internet.

SafeInnocence should be used as **one layer** of a multi-layered approach to online safety, including:
- Parental supervision
- Open communication with children
- Education about online safety
- Browser-level parental controls
- Network-level filtering

The developers are not responsible for any inappropriate content that may bypass the filter.

## Privacy Policy

SafeInnocence is designed with **privacy-first principles**:

### Data Collection
- ❌ **NO** personal data collection
- ❌ **NO** browsing history tracking
- ❌ **NO** data sent to external servers
- ❌ **NO** cookies or analytics
- ❌ **NO** third-party integrations

### Data Processing
- ✅ All AI processing happens **locally on your device**
- ✅ Image analysis uses **on-device Gemini Nano**
- ✅ Text analysis uses **on-device models**
- ✅ No internet connection needed after initial setup

### Data Storage
- ✅ Settings stored in **Chrome Local Storage**
- ✅ Blocked sites list stored **locally only**
- ✅ Passwords hashed with **SHA-256** (never stored in plain text)
- ✅ No cloud sync or external backups

### Permissions Explained
- `activeTab`: Access current page for content analysis
- `storage`: Store settings and blocked sites locally
- `notifications`: Show alerts when content blocked
- `webNavigation`: Detect page loads for analysis
- `contextMenus`: Right-click menu options
- `tabs`: Manage extension across tabs
- `<all_urls>`: Analyze content on any website


### Inspiration
- Child safety advocacy groups
- Browser safety research
- Chrome's AI-first future vision
- Open-source community

## Version History

### v1.0.0 - Initial Release (2025)
**Core Features**:
- ✅ Real-time image analysis with AI
- ✅ Text content analysis with summarization
- ✅ Page blocking functionality
- ✅ Customizable sensitivity settings
- ✅ Statistics tracking
- ✅ Basic UI (popup + options page)

**Enhancements Added During Development**:
- ✅ Dark/light theme toggle (default: dark)
- ✅ Modern purple (#7c3aed) + green (#10b981) color palette
- ✅ Compact progress indicator with close button
- ✅ Master password protection (SHA-256 hashing)
- ✅ Blocked sites management (view, unblock, remove)
- ✅ Social media detection and smart filtering
- ✅ Google Search safe mode (filter content, don't block page)
- ✅ Temporary vs permanent blocking logic
- ✅ YouTube video disabling (unclickable when thumbnail blocked)
- ✅ Image caching (24-hour TTL)
- ✅ Concurrency control (parallel AI processing)
- ✅ Cross-origin image handling
- ✅ Timeout management (15s per AI call)
- ✅ Viewport prioritization (visible images first)
- ✅ Dynamic content monitoring (MutationObserver)
- ✅ Lazy-loading detection (scroll observer, throttled 500ms)
- ✅ Platform-specific comment selectors (10+ platforms)
- ✅ Extensive debugging logs
- ✅ Performance optimizations
- ✅ Multi-category content detection (10 categories)
- ✅ Severity-based weighting (high=5, medium=3, low=1)

**Bug Fixes**:
- 🐛 Fixed null pointer exception in blurOrRemoveImage
- 🐛 Fixed block modal not appearing when threshold exceeded
- 🐛 Fixed progress indicator timing issues
- 🐛 Fixed analyzePage return value for proper flow control
- 🐛 Fixed CORS issues with cross-origin images
- 🐛 Fixed theme persistence across sessions

**Technical Improvements**:
- ⚡ Optimized image analysis pipeline
- ⚡ Added fast prefiltering (keyword/size checks)
- ⚡ Implemented cache system for analyzed images
- ⚡ Parallel processing with concurrency limits
- ⚡ createImageBitmap for better performance
- ⚡ AbortController for timeout handling
- ⚡ Throttled scroll observer
- ⚡ Batch processing for dynamic content

---

**Made with ❤️ for child safety**

*Protecting innocence in the digital age*
