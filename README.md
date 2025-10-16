# SafeInnocence

A Chrome extension that protects children from violent and sexual content using Chrome's built-in AI capabilities.

## Overview

SafeInnocence uses Chrome's Gemini Nano AI model to analyze web pages in real-time and protect children from inappropriate content. The extension:

- **Analyzes images** for violent or sexual content
- **Reviews text** for inappropriate themes
- **Blocks entire pages** when too much harmful content is detected
- **Works offline** - all processing happens locally on your device

## Features

### 🛡️ Real-time Protection
- Automatically scans all visited pages
- Prioritizes large images for analysis
- Monitors dynamically loaded content

### 🤖 AI-Powered Analysis
- Uses Chrome's built-in Gemini Nano model
- No data sent to external servers
- Fast, on-device processing

### ⚙️ Customizable Settings
- Three sensitivity levels (Low, Medium, High)
- Configurable block threshold
- Toggle individual features on/off

### 📊 Statistics Tracking
- Monitor pages analyzed
- Count of blocked content
- View protection history

## Requirements

### System Requirements
- **Chrome Version:** 138 or later
- **Operating System:**
  - Windows 10 or 11
  - macOS 13+ (Ventura or later)
  - Linux
  - ChromeOS (Chromebook Plus)
- **Storage:** At least 22GB of free disk space
- **Hardware:**
  - GPU with >4GB VRAM, OR
  - CPU with 16GB+ RAM and 4+ cores
- **Network:** Unmetered connection for initial AI model download

### Important Notes
- Not available on mobile devices (Android/iOS)
- AI models download automatically on first use
- Models require significant disk space but greatly improve over time

## Installation

### From Source

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the `SafeInnocence` folder
6. The extension will appear in your extensions list

### First Run

On first installation:
1. The extension will open the settings page
2. Check that AI models are available
3. If models need downloading, visit any website to trigger download
4. Configure your protection preferences
5. Start browsing safely!

## Usage

### Basic Operation

Once installed, SafeInnocence works automatically:

1. **Visit any website** - The extension starts analyzing immediately
2. **Inappropriate images are blurred** - Violent or sexual images get a blur filter
3. **Page blocking** - If too much harmful content is found, the entire page is blocked
4. **Notifications** - Get alerts when content is blocked (optional)

### Settings

Access settings by:
- Clicking the extension icon and selecting "Settings"
- Right-clicking the extension icon and choosing "Options"

#### Available Settings

**Protection Sensitivity**
- **High** (Recommended): Maximum protection, blocks more content
- **Medium**: Balanced approach
- **Low**: Only blocks explicit content

**Block Threshold**
- Number of inappropriate items before blocking entire page
- Range: 1-10 (default: 3)

**Analysis Options**
- ✓ Analyze Images
- ✓ Analyze Text Content
- ✓ Show Notifications

### Extension Popup

Click the extension icon to view:
- Current protection status
- Statistics (pages analyzed, content blocked)
- Quick enable/disable toggle
- Access to settings

## How It Works

### Content Analysis Pipeline

1. **Page Load Detection**
   - Extension activates when page finishes loading
   - Identifies all images and text content

2. **Image Analysis**
   - Sorts images by size (largest first)
   - Converts images to analyzable format
   - Sends to AI model for classification
   - Applies blur filter if inappropriate

3. **Text Analysis**
   - Extracts main text content from page
   - Summarizes content using AI
   - Analyzes for inappropriate themes
   - Determines overall page safety

4. **Page Blocking Decision**
   - Counts total inappropriate items
   - Compares against threshold
   - Blocks page if threshold exceeded
   - Shows modal with explanation

### AI Models Used

**Prompt API (LanguageModel)**
- Primary analysis engine
- Classifies content as appropriate/inappropriate
- Provides reasoning and severity levels
- Supports multimodal input (text and images)

**Summarizer API**
- Condenses long text into key points
- Helps understand page themes quickly
- Reduces processing time for text analysis

### Privacy

**All processing is local:**
- No data sent to external servers
- No tracking or analytics
- AI models run entirely on your device
- No internet connection needed after model download

## Development

### Project Structure

```
SafeInnocence/
├── manifest.json          # Extension configuration
├── background.js          # Service worker
├── content.js            # Main content analysis script
├── content.css           # Styles for blocked content
├── popup.html            # Extension popup UI
├── popup.js              # Popup functionality
├── options.html          # Settings page UI
├── options.js            # Settings functionality
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md            # This file
```

### Key Components

**content.js - ContentAnalyzer Class**
- `init()` - Initialize AI models and start analysis
- `analyzePage()` - Main entry point for page analysis
- `analyzeImages()` - Process and classify images
- `analyzeTextContent()` - Review text for inappropriate content
- `blockPage()` - Show blocking modal

**background.js - Service Worker**
- Manages extension lifecycle
- Tracks statistics
- Handles notifications
- Stores user preferences

### Building & Testing

1. Make changes to source files
2. Go to `chrome://extensions/`
3. Click reload icon for SafeInnocence
4. Test on various websites
5. Check console for errors (F12)

### Debugging

Enable detailed logging:
```javascript
// In content.js, add at the top:
const DEBUG = true;
```

Check AI model status:
- Visit `chrome://on-device-internals`
- View model download progress
- Check available disk space

## Troubleshooting

### AI Models Not Available

**Problem:** "AI models unavailable" message in settings

**Solutions:**
- Ensure you have Chrome 138+
- Check you have 22GB+ free disk space
- Verify you're on a supported OS
- Check hardware meets GPU/CPU requirements

### Extension Not Working

**Problem:** Pages aren't being analyzed

**Solutions:**
- Check extension is enabled (toggle in popup)
- Verify AI models are downloaded
- Reload the page
- Check browser console for errors

### Pages Loading Slowly

**Problem:** Websites take longer to load

**Solutions:**
- Reduce sensitivity to "Low" or "Medium"
- Disable text analysis if only image protection needed
- Increase block threshold to reduce processing

### False Positives

**Problem:** Safe content is being blocked

**Solutions:**
- Lower sensitivity setting
- Increase block threshold
- Disable specific analysis types
- Report the issue for model improvement

## Limitations

- **Model accuracy:** AI may occasionally misclassify content
- **Performance:** Initial analysis may cause slight delay
- **Languages:** Best performance with English content
- **Dynamic content:** Some AJAX-loaded content may load before analysis
- **Mobile:** Not available on mobile platforms

## Contributing

This is an educational project demonstrating Chrome's built-in AI capabilities. Contributions, bug reports, and feature suggestions are welcome!

### Areas for Improvement

- Better error handling
- Whitelist/blacklist functionality
- Parental controls (password protection)
- Activity reporting
- Multi-language support
- Performance optimizations

## License

This project is provided as-is for educational purposes.

## Disclaimer

**Important:** This extension is a protective tool but is not 100% foolproof. Adult supervision is still recommended when children are browsing the internet. The AI may make mistakes in content classification.

## Privacy Policy

SafeInnocence:
- Does NOT collect any personal data
- Does NOT track browsing history
- Does NOT send data to external servers
- Does NOT use cookies or analytics
- Processes everything locally on your device

## Support

For issues, questions, or suggestions:
- Check the Troubleshooting section above
- Review Chrome's AI documentation
- Check system requirements

## Acknowledgments

Built using:
- Chrome's Prompt API (Gemini Nano)
- Chrome's Summarizer API
- Chrome Extensions Manifest V3

## Version History

**v1.0.0** - Initial Release
- Real-time image analysis
- Text content analysis
- Page blocking functionality
- Customizable settings
- Statistics tracking
