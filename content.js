/**
 * SafeInnocence Content Script
 * Analyzes page content for violent or sexual material and protects children
 */

class ContentAnalyzer {
  constructor() {
    this.session = null;
    this.summarizer = null;
    this.blockedContentCount = 0;
    this.mediumImagesBlocked = 0;
    this.imageAnalysisQueue = [];
    this.isProcessing = false;
    this.totalImages = 0;
    this.analyzedImages = 0;
    this.progressIndicator = null;
    this.isSocialMedia = false;
    this.socialMediaPlatform = null;
    this.settings = {
      sensitivity: 'high',
      enabled: true
    };
  }

  /**
   * Initialize the analyzer
   */
  async init() {
    try {
      // Load settings from storage
      const stored = await chrome.storage.local.get(['settings']);
      if (stored.settings) {
        this.settings = { ...this.settings, ...stored.settings };
      }

      if (!this.settings.enabled) {
        return;
      }

      // Check if AI APIs are available
      if (!('LanguageModel' in self && 'Summarizer' in self)) {
        console.warn('SafeInnocence: AI APIs not available');
        return;
      }

      // Detect social media platforms
      this.detectSocialMedia();

      // Initialize AI models
      await this.initializeAI();

      // Show progress indicator
      this.showProgressIndicator();

      // Start analyzing the page
      await this.analyzePage();

      // Hide progress indicator
      this.hideProgressIndicator();

      // Set up mutation observer for dynamic content
      this.setupMutationObserver();
    } catch (error) {
      console.error('SafeInnocence initialization error:', error);
    }
  }

  /**
   * Detect if page is a social media platform
   */
  detectSocialMedia() {
    const hostname = window.location.hostname.toLowerCase();
    const url = window.location.href.toLowerCase();

    const socialMediaDomains = {
      'youtube.com': 'youtube',
      'youtu.be': 'youtube',
      'instagram.com': 'instagram',
      'twitter.com': 'twitter',
      'x.com': 'twitter',
      'facebook.com': 'facebook',
      'fb.com': 'facebook',
      'tiktok.com': 'tiktok',
      'reddit.com': 'reddit',
      'discord.com': 'discord',
      'twitch.tv': 'twitch',
      'snapchat.com': 'snapchat',
      'linkedin.com': 'linkedin',
      'pinterest.com': 'pinterest',
      'tumblr.com': 'tumblr',
      'whatsapp.com': 'whatsapp'
    };

    for (const [domain, platform] of Object.entries(socialMediaDomains)) {
      if (hostname.includes(domain)) {
        this.isSocialMedia = true;
        this.socialMediaPlatform = platform;
        console.log(`SafeInnocence: Detected ${platform} - Using comment filtering mode`);
        return;
      }
    }
  }

  /**
   * Initialize AI models
   */
  async initializeAI() {
    try {
      // Check availability of Prompt API
      const promptAvailability = await LanguageModel.availability();

      if (promptAvailability === 'unavailable') {
        console.warn('SafeInnocence: Prompt API unavailable');
        return;
      }

      // Create language model session for content analysis with image support
      this.session = await LanguageModel.create({
        initialPrompts: [
          {
            role: 'system',
            content: `You are a comprehensive content safety analyzer for child protection.
                     Analyze content for the following categories:

                     - Cyberbullying: Personal attacks, degrading language, intimidation
                     - Hate Speech: Discriminatory content targeting race, gender, religion, sexuality, or protected characteristics
                     - Threats: Explicit or implicit threats of violence or harm
                     - Self-Harm Content: Content promoting or discussing self-harm behaviors
                     - Misinformation: Potentially false or misleading information
                     - Adult Content: Sexually explicit or inappropriate material
                     - Substance Abuse: Content promoting illegal drugs or substance abuse
                     - Personal Information: Exposed personally identifiable information
                     - Extremism: Violent extremist content or radicalization materials
                     - Violence: Violent, graphic, or disturbing imagery

                     Be extremely cautious and err on the side of protection.
                     Respond with JSON format: {"inappropriate": boolean, "reason": string, "severity": "low"|"medium"|"high", "categories": []}`
          }
        ],
        expectedInputs: [
          { type: "text", languages: ["en", "es"] },
          { type: "image" }
        ],
        expectedOutputs: [{ type: "text", languages: ["en"] }]
      });

      // Check availability of Summarizer API
      const summarizerAvailability = await Summarizer.availability();

      if (summarizerAvailability !== 'unavailable') {
        this.summarizer = await Summarizer.create({
          type: 'key-points',
          format: 'plain-text',
          length: 'short'
        });
      }

      console.log('SafeInnocence: AI models initialized');
    } catch (error) {
      console.error('SafeInnocence: AI initialization error:', error);
    }
  }

  /**
   * Analyze the entire page
   */
  async analyzePage() {
    if (!this.session) {
      return;
    }

    // If social media, analyze comments instead of blocking page
    if (this.isSocialMedia) {
      await this.analyzeSocialMediaContent();
    } else {
      // Regular page analysis
      await this.analyzeImages();
      await this.analyzeTextContent();
      this.evaluatePageSafety();
    }
  }

  /**
   * Analyze images on the page
   */
  async analyzeImages() {
    try {
      // Get all images
      const images = Array.from(document.querySelectorAll('img'));

      // Sort by size (largest first)
      images.sort((a, b) => {
        const areaA = a.naturalWidth * a.naturalHeight;
        const areaB = b.naturalWidth * b.naturalHeight;
        return areaB - areaA;
      });

      // Categorize images by size
      const largeImages = [];
      const mediumImages = [];
      const smallImages = [];

      images.forEach(img => {
        const area = img.naturalWidth * img.naturalHeight;
        if (area > 300000) { // Large: > 547x547
          largeImages.push(img);
        } else if (area > 50000) { // Medium: > 224x224
          mediumImages.push(img);
        } else if (area > 10000) { // Small but significant
          smallImages.push(img);
        }
      });

      this.totalImages = largeImages.length + mediumImages.length + smallImages.length;
      this.analyzedImages = 0;

      // Analyze large images first
      for (const img of largeImages) {
        const result = await this.analyzeImage(img, 'large');
        this.updateProgress();

        if (result && result.inappropriate) {
          // Block page immediately if large image is inappropriate
          this.blockPage('Large inappropriate image detected');
          return;
        }
      }

      // Analyze medium images
      for (const img of mediumImages) {
        const result = await this.analyzeImage(img, 'medium');
        this.updateProgress();

        if (result && result.inappropriate) {
          this.mediumImagesBlocked++;

          // Block page if 3 or more medium images are inappropriate
          if (this.mediumImagesBlocked >= 3) {
            this.blockPage('Multiple inappropriate images detected');
            return;
          }
        }
      }

      // Analyze small images
      for (const img of smallImages.slice(0, 10)) {
        await this.analyzeImage(img, 'small');
        this.updateProgress();
      }
    } catch (error) {
      console.error('SafeInnocence: Image analysis error:', error);
    }
  }

  /**
   * Analyze a single image
   */
  async analyzeImage(imgElement, size = 'medium') {
    try {
      if (!this.session) return null;

      // Skip if already analyzed
      if (imgElement.dataset.safeInnocenceAnalyzed) {
        return null;
      }

      // Convert image to data for analysis
      const imageData = await this.getImageData(imgElement);

      if (!imageData) {
        imgElement.dataset.safeInnocenceAnalyzed = 'true';
        return null;
      }

      // Analyze image content using AI
      const prompt = `Analyze this image for inappropriate content for children.
                     Check for: violence, adult content, self-harm, hate symbols, extremism, cyberbullying, substance abuse, threats, disturbing imagery.
                     Respond only with JSON format: {"inappropriate": boolean, "reason": string, "severity": "low"|"medium"|"high", "categories": []}`;

      const response = await this.session.prompt([
        {
          role: 'user',
          content: [
            { type: 'text', value: prompt },
            { type: 'image', value: imageData }
          ]
        }
      ], {
        outputLanguage: 'en'
      });

      const result = this.parseAIResponse(response);

      if (result && result.inappropriate) {
        this.blockedContentCount++;
        this.blurOrRemoveImage(imgElement, result);
      }

      imgElement.dataset.safeInnocenceAnalyzed = 'true';
      imgElement.dataset.safeInnocenceSize = size;

      return result;
    } catch (error) {
      console.error('SafeInnocence: Single image analysis error:', error);
      imgElement.dataset.safeInnocenceAnalyzed = 'true';
      return null;
    }
  }

  /**
   * Get image data for analysis
   */
  async getImageData(imgElement) {
    try {
      // Check if image is loaded
      if (!imgElement.complete || imgElement.naturalWidth === 0) {
        await new Promise((resolve) => {
          imgElement.onload = resolve;
          imgElement.onerror = resolve;
          setTimeout(resolve, 2000);
        });
      }

      // Calculate optimal size (max 512x512)
      const maxDimension = 512;
      const rect = imgElement.getBoundingClientRect();
      let targetWidth = rect.width || imgElement.naturalWidth || imgElement.width;
      let targetHeight = rect.height || imgElement.naturalHeight || imgElement.height;

      if (targetWidth > maxDimension || targetHeight > maxDimension) {
        const aspectRatio = targetWidth / targetHeight;
        if (targetWidth > targetHeight) {
          targetWidth = maxDimension;
          targetHeight = Math.round(maxDimension / aspectRatio);
        } else {
          targetHeight = maxDimension;
          targetWidth = Math.round(maxDimension * aspectRatio);
        }
      }

      // Strategy 1: Try to use chrome.tabs.captureVisibleTab for screenshots
      if (this.isCrossOriginImage(imgElement)) {
        try {
          // Get element position
          const scrollX = window.scrollX;
          const scrollY = window.scrollY;

          // Use chrome API to capture screenshot
          const dataUrl = await chrome.runtime.sendMessage({
            action: 'captureElement',
            rect: {
              x: rect.left + scrollX,
              y: rect.top + scrollY,
              width: rect.width,
              height: rect.height
            }
          });

          if (dataUrl) {
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            return blob;
          }
        } catch (captureError) {
          // Fall through to canvas method
        }
      }

      // Strategy 2: Try fetch for cross-origin images
      let imageToUse = imgElement;
      const isCrossOrigin = this.isCrossOriginImage(imgElement);

      if (isCrossOrigin) {
        try {
          const response = await fetch(imgElement.src);
          if (!response.ok) throw new Error('Fetch failed');

          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);

          const tempImg = new Image();
          tempImg.src = objectUrl;

          await new Promise((resolve, reject) => {
            tempImg.onload = resolve;
            tempImg.onerror = reject;
            setTimeout(reject, 2000);
          });

          imageToUse = tempImg;
          setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
        } catch (fetchError) {
          // Silently skip if both strategies fail
          return null;
        }
      }

      // Strategy 3: Canvas rendering
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Draw resized image
      ctx.drawImage(imageToUse, 0, 0, targetWidth, targetHeight);

      // Convert to blob
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.7);
      });

      return blob;
    } catch (error) {
      // Silently skip CORS errors
      if (error.name === 'SecurityError' || error.message?.includes('tainted')) {
        return null;
      }
      return null;
    }
  }

  /**
   * Check if image is cross-origin
   */
  isCrossOriginImage(img) {
    try {
      const imgUrl = new URL(img.src, window.location.href);
      return imgUrl.origin !== window.location.origin;
    } catch (e) {
      return false;
    }
  }

  /**
   * Blur or remove inappropriate image
   */
  blurOrRemoveImage(imgElement, analysisResult) {
    imgElement.style.filter = 'blur(20px)';
    imgElement.style.pointerEvents = 'none';
    imgElement.dataset.safeInnocenceBlocked = 'true';
    imgElement.title = 'Content blocked by SafeInnocence: ' + analysisResult.reason;

    // Add overlay
    const overlay = document.createElement('div');
    overlay.className = 'safe-innocence-overlay';
    overlay.textContent = '🛡️ Content Blocked';
    overlay.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(255, 0, 0, 0.8);
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      font-weight: bold;
      z-index: 10000;
    `;

    // Wrap image if needed
    if (imgElement.parentElement.style.position !== 'relative') {
      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.display = 'inline-block';
      imgElement.parentElement.insertBefore(wrapper, imgElement);
      wrapper.appendChild(imgElement);
      wrapper.appendChild(overlay);
    }
  }

  /**
   * Analyze text content on the page
   */
  async analyzeTextContent() {
    try {
      if (!this.session) return;

      // Get main text content
      const textElements = document.querySelectorAll('p, article, h1, h2, h3, div.content');
      let fullText = '';

      textElements.forEach(el => {
        fullText += el.innerText + '\n';
      });

      // Limit text length
      const textToAnalyze = fullText.substring(0, 5000);

      if (textToAnalyze.length < 100) {
        return; // Not enough text to analyze
      }

      // Summarize content first if summarizer is available
      let contentSummary = textToAnalyze;
      if (this.summarizer) {
        contentSummary = await this.summarizer.summarize(textToAnalyze, {
          context: 'Summarize the main topics and themes of this content'
        });
      }

      // Analyze content for appropriateness
      const prompt = `Analyze this content to determine if it's appropriate for children (under 13).

                     Check for these specific categories:
                     - Cyberbullying: Personal attacks, degrading language, intimidation
                     - Hate Speech: Discriminatory content targeting race, gender, religion, sexuality
                     - Threats: Threats of violence or harm
                     - Self-Harm: Content promoting self-harm or suicide
                     - Misinformation: False or misleading information
                     - Adult Content: Sexual or explicit material
                     - Substance Abuse: Promoting drugs or alcohol abuse
                     - Personal Information: Exposed PII (addresses, phone numbers, emails)
                     - Extremism: Violent extremism or radicalization
                     - Violence: Graphic violence, gore, disturbing themes

                     Content: ${contentSummary}

                     Respond only with JSON format: {"inappropriate": boolean, "reason": string, "severity": "low"|"medium"|"high", "categories": []}`;

      const response = await this.session.prompt(prompt, {
        outputLanguage: 'en'
      });
      const result = this.parseAIResponse(response);

      if (result && result.inappropriate) {
        this.blockedContentCount += result.severity === 'high' ? 5 : result.severity === 'medium' ? 3 : 1;

        // Store the analysis result
        this.pageAnalysisResult = result;
      }
    } catch (error) {
      console.error('SafeInnocence: Text analysis error:', error);
    }
  }

  /**
   * Parse AI response
   */
  parseAIResponse(response) {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback: check for keywords
      const lowerResponse = response.toLowerCase();
      const categories = [];

      if (lowerResponse.includes('cyberbullying') || lowerResponse.includes('bullying')) {
        categories.push('cyberbullying');
      }
      if (lowerResponse.includes('hate speech') || lowerResponse.includes('discriminatory')) {
        categories.push('hate_speech');
      }
      if (lowerResponse.includes('threat')) {
        categories.push('threats');
      }
      if (lowerResponse.includes('self-harm') || lowerResponse.includes('suicide')) {
        categories.push('self_harm');
      }
      if (lowerResponse.includes('misinformation') || lowerResponse.includes('false')) {
        categories.push('misinformation');
      }
      if (lowerResponse.includes('adult') || lowerResponse.includes('sexual') || lowerResponse.includes('explicit')) {
        categories.push('adult_content');
      }
      if (lowerResponse.includes('substance') || lowerResponse.includes('drugs') || lowerResponse.includes('alcohol')) {
        categories.push('substance_abuse');
      }
      if (lowerResponse.includes('personal information') || lowerResponse.includes('pii')) {
        categories.push('personal_information');
      }
      if (lowerResponse.includes('extremism') || lowerResponse.includes('radicalization')) {
        categories.push('extremism');
      }
      if (lowerResponse.includes('violence') || lowerResponse.includes('violent') || lowerResponse.includes('gore')) {
        categories.push('violence');
      }

      if (lowerResponse.includes('inappropriate') ||
          lowerResponse.includes('not safe') ||
          categories.length > 0) {
        return {
          inappropriate: true,
          reason: categories.length > 0 ? `Detected: ${categories.join(', ')}` : 'Content flagged by AI analysis',
          severity: 'medium',
          categories: categories
        };
      }

      return null;
    } catch (error) {
      console.error('SafeInnocence: Response parsing error:', error);
      return null;
    }
  }

  /**
   * Analyze social media content (comments, posts)
   */
  async analyzeSocialMediaContent() {
    try {
      // Analyze video thumbnails and post images on social media
      await this.analyzeSocialMediaImages();

      // Analyze comments based on platform
      await this.analyzeComments();

    } catch (error) {
      console.error('SafeInnocence: Social media analysis error:', error);
    }
  }

  /**
   * Analyze images specifically on social media (thumbnails, posts)
   */
  async analyzeSocialMediaImages() {
    try {
      const images = Array.from(document.querySelectorAll('img'));

      // Filter and categorize images
      const thumbnails = [];
      const otherImages = [];

      images.forEach(img => {
        const area = img.naturalWidth * img.naturalHeight;

        // Check if it's a video thumbnail or post image based on selectors and size
        const isYoutubeThumbnail = img.closest('ytd-thumbnail, #thumbnail, a#thumbnail, yt-thumbnail-view-model, yt-collection-thumbnail-view-model');
        const isInstagramPost = img.closest('article');
        const isTikTokVideo = img.closest('[data-e2e="video-item"]');
        const isTwitterMedia = img.closest('[data-testid="tweet"] img');
        const isFacebookPost = img.closest('div[role="article"]');

        if (isYoutubeThumbnail || isInstagramPost || isTikTokVideo || isTwitterMedia || isFacebookPost) {
          if (area > 10000) { // Significant size
            thumbnails.push(img);
          }
        } else if (area > 50000) {
          otherImages.push(img);
        }
      });

      this.totalImages = thumbnails.length + otherImages.length;
      this.analyzedImages = 0;

      // Analyze thumbnails first (these are important on social media)
      for (const img of thumbnails) {
        const result = await this.analyzeImage(img, 'thumbnail');
        this.updateProgress();

        // Don't block social media pages, just blur the image
        if (result && result.inappropriate) {
          this.blockedContentCount++;
        }
      }

      // Analyze other large images
      for (const img of otherImages.slice(0, 20)) {
        const result = await this.analyzeImage(img, 'large');
        this.updateProgress();

        if (result && result.inappropriate) {
          this.blockedContentCount++;
        }
      }

    } catch (error) {
      console.error('SafeInnocence: Social media image analysis error:', error);
    }
  }

  /**
   * Analyze comments on social media platforms
   */
  async analyzeComments() {
    const commentSelectors = this.getCommentSelectors();

    if (!commentSelectors) {
      console.warn('SafeInnocence: No comment selectors for this platform');
      return;
    }

    const comments = document.querySelectorAll(commentSelectors.join(', '));
    console.log(`SafeInnocence: Found ${comments.length} comments to analyze`);

    let analyzedCount = 0;
    for (const comment of comments) {
      if (comment.dataset.safeInnocenceAnalyzed) {
        continue;
      }

      await this.analyzeComment(comment);
      analyzedCount++;

      // Update progress
      if (this.progressIndicator) {
        const status = document.getElementById('safe-innocence-status');
        if (status) {
          status.textContent = `Analyzing comments: ${analyzedCount}/${comments.length}`;
        }
      }
    }
  }

  /**
   * Get comment selectors for different platforms
   */
  getCommentSelectors() {
    const selectors = {
      'youtube': [
        '#content-text',
        'yt-formatted-string#content-text',
        '#comment #content-text'
      ],
      'instagram': [
        'span._ap3a._aaco._aacu._aacx._aad7._aade',
        'span[dir="auto"]',
        'div.C4VMK > span'
      ],
      'twitter': [
        'div[data-testid="tweetText"]',
        'div[lang] > span'
      ],
      'facebook': [
        'div[dir="auto"]',
        'span[dir="auto"]',
        'div.x1lliihq'
      ],
      'reddit': [
        'div[data-testid="comment"]',
        'div.md p',
        'div._292iotee19Lmt0MUIr9ejT'
      ],
      'discord': [
        'div[class*="messageContent"]',
        'div.markup'
      ],
      'tiktok': [
        'p[data-e2e="comment-level-1"]',
        'span[data-e2e="comment-level-2"]'
      ]
    };

    return selectors[this.socialMediaPlatform] || null;
  }

  /**
   * Analyze a single comment
   */
  async analyzeComment(commentElement) {
    try {
      if (!this.session) return;

      const commentText = commentElement.innerText?.trim();

      if (!commentText || commentText.length < 10) {
        commentElement.dataset.safeInnocenceAnalyzed = 'true';
        return;
      }

      const prompt = `Analyze this comment for inappropriate content for children.
                     Check for: cyberbullying, hate speech, threats, self-harm, adult content, substance abuse, violence, extremism, personal information.
                     Comment: "${commentText}"
                     Respond only with JSON: {"inappropriate": boolean, "reason": string, "severity": "low"|"medium"|"high", "categories": []}`;

      const response = await this.session.prompt(prompt, {
        outputLanguage: 'en'
      });
      const result = this.parseAIResponse(response);

      if (result && result.inappropriate) {
        this.replaceInappropriateComment(commentElement, result);
      }

      commentElement.dataset.safeInnocenceAnalyzed = 'true';
    } catch (error) {
      console.error('SafeInnocence: Comment analysis error:', error);
      commentElement.dataset.safeInnocenceAnalyzed = 'true';
    }
  }

  /**
   * Replace inappropriate comment with warning
   */
  replaceInappropriateComment(commentElement, analysisResult) {
    const replacement = document.createElement('div');
    replacement.className = 'safe-innocence-blocked-comment';
    replacement.style.cssText = `
      background: #fff3e0;
      border: 2px solid #ff9800;
      border-radius: 8px;
      padding: 12px 16px;
      margin: 4px 0;
      font-family: Arial, sans-serif;
    `;

    const icon = document.createElement('span');
    icon.textContent = '🛡️ ';
    icon.style.cssText = 'font-size: 16px;';

    const text = document.createElement('span');
    text.style.cssText = 'color: #e65100; font-weight: 500; font-size: 14px;';
    text.textContent = `Content removed by SafeInnocence`;

    const reason = document.createElement('div');
    reason.style.cssText = 'color: #666; font-size: 12px; margin-top: 4px;';
    reason.textContent = `Reason: ${analysisResult.reason}`;

    const categories = document.createElement('div');
    if (analysisResult.categories && analysisResult.categories.length > 0) {
      categories.style.cssText = 'color: #999; font-size: 11px; margin-top: 4px;';
      categories.textContent = `Categories: ${analysisResult.categories.join(', ')}`;
    }

    replacement.appendChild(icon);
    replacement.appendChild(text);
    replacement.appendChild(reason);
    if (analysisResult.categories && analysisResult.categories.length > 0) {
      replacement.appendChild(categories);
    }

    // Replace the original comment
    if (commentElement.parentElement) {
      commentElement.style.display = 'none';
      commentElement.parentElement.insertBefore(replacement, commentElement);
    }
  }

  /**
   * Evaluate overall page safety
   */
  evaluatePageSafety() {
    // Don't block social media pages
    if (this.isSocialMedia) {
      return;
    }

    // Threshold for blocking entire page
    const blockThreshold = this.settings.sensitivity === 'high' ? 3 :
                          this.settings.sensitivity === 'medium' ? 5 : 7;

    if (this.blockedContentCount >= blockThreshold) {
      this.blockPage();
    }
  }

  /**
   * Block the entire page
   */
  blockPage(reason = null) {
    // Hide progress indicator
    this.hideProgressIndicator();

    // Create blocking overlay
    const overlay = document.createElement('div');
    overlay.id = 'safe-innocence-page-block';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      padding: 40px;
      border-radius: 10px;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;

    const icon = document.createElement('div');
    icon.style.cssText = 'font-size: 64px; margin-bottom: 20px;';
    icon.textContent = '🛡️';

    const title = document.createElement('h2');
    title.textContent = 'Page Blocked by SafeInnocence';
    title.style.cssText = 'color: #d32f2f; margin-bottom: 20px; font-family: Arial, sans-serif;';

    const message = document.createElement('p');
    message.textContent = `This page contains content that may not be appropriate for children. ${
      reason || (this.pageAnalysisResult ? this.pageAnalysisResult.reason : 'Multiple inappropriate elements detected.')
    }`;
    message.style.cssText = 'color: #333; margin-bottom: 30px; line-height: 1.6; font-family: Arial, sans-serif;';

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 10px; justify-content: center;';

    const goBackButton = document.createElement('button');
    goBackButton.textContent = 'Go Back';
    goBackButton.style.cssText = `
      padding: 12px 24px;
      background: #d32f2f;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
      font-family: Arial, sans-serif;
    `;
    goBackButton.onclick = () => window.history.back();

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close Page';
    closeButton.style.cssText = `
      padding: 12px 24px;
      background: #666;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
      font-family: Arial, sans-serif;
    `;
    closeButton.onclick = () => window.close();

    buttonContainer.appendChild(goBackButton);
    buttonContainer.appendChild(closeButton);

    modal.appendChild(icon);
    modal.appendChild(title);
    modal.appendChild(message);
    modal.appendChild(buttonContainer);
    overlay.appendChild(modal);

    document.body.appendChild(overlay);

    // Prevent scrolling
    document.body.style.overflow = 'hidden';
  }

  /**
   * Setup mutation observer for dynamic content
   */
  setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            // Check for new images
            if (node.tagName === 'IMG') {
              this.analyzeImage(node);
            } else if (node.querySelectorAll) {
              const images = node.querySelectorAll('img');
              images.forEach(img => this.analyzeImage(img));

              // Check for new comments on social media
              if (this.isSocialMedia) {
                const commentSelectors = this.getCommentSelectors();
                if (commentSelectors) {
                  const comments = node.querySelectorAll(commentSelectors.join(', '));
                  comments.forEach(comment => {
                    if (!comment.dataset.safeInnocenceAnalyzed) {
                      this.analyzeComment(comment);
                    }
                  });
                }
              }
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Setup scroll observer for lazy-loaded content
    this.setupScrollObserver();
  }

  /**
   * Setup scroll observer to analyze content loaded on scroll
   */
  setupScrollObserver() {
    let scrollTimeout;
    let lastScrollTime = 0;

    const handleScroll = () => {
      const currentTime = Date.now();

      // Throttle scroll events (max once per 500ms)
      if (currentTime - lastScrollTime < 500) {
        return;
      }

      lastScrollTime = currentTime;

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.analyzeNewContent();
      }, 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  /**
   * Analyze new content that appears after scroll
   */
  async analyzeNewContent() {
    try {
      // Find unanalyzed images
      const unanalyzedImages = Array.from(document.querySelectorAll('img:not([data-safe-innocence-analyzed])'));

      if (unanalyzedImages.length > 0) {
        console.log(`SafeInnocence: Analyzing ${unanalyzedImages.length} new images after scroll`);

        for (const img of unanalyzedImages.slice(0, 10)) { // Limit to 10 at a time
          await this.analyzeImage(img);
        }
      }

      // Find unanalyzed comments on social media
      if (this.isSocialMedia) {
        const commentSelectors = this.getCommentSelectors();
        if (commentSelectors) {
          const unanalyzedComments = Array.from(
            document.querySelectorAll(commentSelectors.map(sel => `${sel}:not([data-safe-innocence-analyzed])`).join(', '))
          );

          if (unanalyzedComments.length > 0) {
            console.log(`SafeInnocence: Analyzing ${unanalyzedComments.length} new comments after scroll`);

            for (const comment of unanalyzedComments.slice(0, 5)) { // Limit to 5 at a time
              await this.analyzeComment(comment);
            }
          }
        }
      }
    } catch (error) {
      console.error('SafeInnocence: Error analyzing new content:', error);
    }
  }

  /**
   * Show progress indicator
   */
  showProgressIndicator() {
    this.progressIndicator = document.createElement('div');
    this.progressIndicator.id = 'safe-innocence-progress';
    this.progressIndicator.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
      color: white !important;
      padding: 15px 20px !important;
      border-radius: 10px !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
      z-index: 2147483647 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;
      min-width: 250px !important;
      max-width: 300px !important;
      pointer-events: auto !important;
      animation: slideInRight 0.3s ease-out !important;
    `;

    const icon = document.createElement('div');
    icon.style.cssText = 'font-size: 24px !important; margin-bottom: 8px !important; text-align: center !important; line-height: 1 !important;';
    icon.textContent = '🛡️';

    const title = document.createElement('div');
    title.style.cssText = 'font-weight: bold !important; font-size: 14px !important; margin-bottom: 8px !important; text-align: center !important; color: white !important;';
    title.textContent = 'SafeInnocence';

    const status = document.createElement('div');
    status.id = 'safe-innocence-status';
    status.style.cssText = 'font-size: 12px !important; margin-bottom: 10px !important; text-align: center !important; opacity: 0.9 !important; color: white !important;';
    status.textContent = 'Analyzing page content...';

    const progressBarContainer = document.createElement('div');
    progressBarContainer.style.cssText = `
      width: 100% !important;
      height: 6px !important;
      background: rgba(255, 255, 255, 0.3) !important;
      border-radius: 3px !important;
      overflow: hidden !important;
    `;

    const progressBar = document.createElement('div');
    progressBar.id = 'safe-innocence-progress-bar';
    progressBar.style.cssText = `
      width: 0% !important;
      height: 100% !important;
      background: white !important;
      border-radius: 3px !important;
      transition: width 0.3s ease !important;
    `;

    progressBarContainer.appendChild(progressBar);

    this.progressIndicator.appendChild(icon);
    this.progressIndicator.appendChild(title);
    this.progressIndicator.appendChild(status);
    this.progressIndicator.appendChild(progressBarContainer);

    document.body.appendChild(this.progressIndicator);
  }

  /**
   * Update progress indicator
   */
  updateProgress() {
    this.analyzedImages++;

    if (this.progressIndicator) {
      const progressBar = document.getElementById('safe-innocence-progress-bar');
      const status = document.getElementById('safe-innocence-status');

      if (progressBar && this.totalImages > 0) {
        const percentage = Math.round((this.analyzedImages / this.totalImages) * 100);
        progressBar.style.width = percentage + '%';
        status.textContent = `Analyzing images: ${this.analyzedImages}/${this.totalImages}`;
      }
    }
  }

  /**
   * Hide progress indicator
   */
  hideProgressIndicator() {
    if (this.progressIndicator) {
      this.progressIndicator.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => {
        if (this.progressIndicator && this.progressIndicator.parentNode) {
          this.progressIndicator.parentNode.removeChild(this.progressIndicator);
        }
        this.progressIndicator = null;
      }, 300);
    }
  }
}

// Initialize analyzer when page loads
const analyzer = new ContentAnalyzer();
analyzer.init();
