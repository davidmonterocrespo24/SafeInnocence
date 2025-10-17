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
      sensitivity: "high",
      enabled: true,
    };
    this.imageCache = new Map(); // key: src or derived key, value: {result, ts}
    this.analysisConcurrency = 2; // ajustar (3-6 recomendado)
    this.analysisTimeoutMs = 15000; // timeout por llamada AI
    this.prefilterKeywords = [
      "porn",
      "nsfw",
      "adult",
      "sex",
      "gore",
      "explicit",
    ]; // ejemplo
  }

  /**
   * Initialize the analyzer
   */
  async init() {
    try {
      console.log("SafeInnocence: Initializing content analyzer");

      // Load settings from storage
      const stored = await chrome.storage.local.get([
        "settings",
        "blockedSites",
      ]);
      if (stored.settings) {
        this.settings = { ...this.settings, ...stored.settings };
      }

      console.log("SafeInnocence: Settings loaded:", this.settings);

      if (!this.settings.enabled) {
        console.log("SafeInnocence: Extension is disabled");
        return;
      }

      // Check if this page is already blocked
      const currentUrl = window.location.href;
      const blockedSites = stored.blockedSites || [];
      const blockedSite = blockedSites.find(
        (site) =>
          currentUrl.includes(site.url) &&
          site.blockType === "total" &&
          !site.unblocked
      );

      if (blockedSite) {
        console.log(
          "SafeInnocence: Page already blocked, showing block screen"
        );
        // Show block page immediately
        this.blockPage(
          blockedSite.reason || "This page was previously blocked"
        );
        return;
      }

      // Check if AI APIs are available
      if (!("LanguageModel" in self && "Summarizer" in self)) {
        console.warn("SafeInnocence: AI APIs not available");
        return;
      }

      // Detect social media platforms
      this.detectSocialMedia();

      // Initialize AI models
      console.log("SafeInnocence: Initializing AI models...");
      await this.initializeAI();

      if (!this.session) {
        console.error("SafeInnocence: Failed to initialize AI session");
        return;
      }

      console.log("SafeInnocence: AI models initialized successfully");

      // Show progress indicator
      this.showProgressIndicator();

      // Start analyzing the page
      console.log("SafeInnocence: Starting page analysis");
      const pageWasBlocked = await this.analyzePage();

      console.log("SafeInnocence: Page analysis complete");

      // Only hide progress indicator if page wasn't blocked
      if (!pageWasBlocked) {
        this.hideProgressIndicator();
        // Set up mutation observer for dynamic content
        this.setupMutationObserver();
      }
    } catch (error) {
      console.error("SafeInnocence initialization error:", error);
    }
  }

  /**
   * Detect if page is a social media platform or search engine
   */
  detectSocialMedia() {
    const hostname = window.location.hostname.toLowerCase();
    const url = window.location.href.toLowerCase();

    // Check if it's Google Search - never block, only filter content
    if (
      (hostname.includes("google.com") || hostname.includes("google.")) &&
      url.includes("/search")
    ) {
      this.isSocialMedia = false;
      this.socialMediaPlatform = "google_search";
      console.log(
        "SafeInnocence: Detected Google Search - Using content filtering mode"
      );
      return;
    }

    // Check for other search engines
    const searchEngines = {
      "bing.com": "bing",
      "duckduckgo.com": "duckduckgo",
      "yahoo.com": "yahoo",
      "yandex.com": "yandex",
      "baidu.com": "baidu",
    };

    for (const [domain, engine] of Object.entries(searchEngines)) {
      if (hostname.includes(domain)) {
        this.isSocialMedia = true;
        this.socialMediaPlatform = engine;
        console.log(
          `SafeInnocence: Detected ${engine} - Using content filtering mode`
        );
        return;
      }
    }

    // Check for social media platforms
    const socialMediaDomains = {
      "youtube.com": "youtube",
      "youtu.be": "youtube",
      "instagram.com": "instagram",
      "twitter.com": "twitter",
      "x.com": "twitter",
      "facebook.com": "facebook",
      "fb.com": "facebook",
      "tiktok.com": "tiktok",
      "reddit.com": "reddit",
      "discord.com": "discord",
      "twitch.tv": "twitch",
      "snapchat.com": "snapchat",
      "linkedin.com": "linkedin",
      "pinterest.com": "pinterest",
      "tumblr.com": "tumblr",
      "whatsapp.com": "whatsapp",
    };

    for (const [domain, platform] of Object.entries(socialMediaDomains)) {
      if (hostname.includes(domain)) {
        this.isSocialMedia = true;
        this.socialMediaPlatform = platform;
        console.log(
          `SafeInnocence: Detected ${platform} - Using content filtering mode`
        );
        return;
      }
    }
  }

  async limitConcurrency(items, handler, limit = 4) {
    const results = [];
    const executing = new Set();
    for (const item of items) {
      const p = (async () => handler(item))();
      results.push(p);
      executing.add(p);
      const clean = () => executing.delete(p);
      p.then(clean).catch(clean);
      if (executing.size >= limit) {
        await Promise.race(executing);
      }
    }
    return Promise.all(results);
  }

  // Helper: fast cheap prefilter
  shouldAnalyzeImageFastCheck(img) {
    // evita analizar iconos muy pequeños, sprites, data-urls, etc.
    try {
      if (!img.src) return false;
      if ((img.naturalWidth || 0) * (img.naturalHeight || 0) < 5000)
        return false; // muy pequeño
      if (img.dataset.safeInnocenceAnalyzed) return false;
      const srcLower = img.src.toLowerCase();
      if (srcLower.startsWith("data:")) return true; // inline -> analyze
      for (const kw of this.prefilterKeywords)
        if (srcLower.includes(kw)) return true;
      // usar alt/title/contexto: si contienen palabras clave
      const contextText =
        (img.alt || "") +
        " " +
        (img.title || "") +
        " " +
        ((img.closest &&
          img.closest("figure,article,div")?.innerText?.slice(0, 200)) ||
          "");
      for (const kw of this.prefilterKeywords)
        if (contextText.toLowerCase().includes(kw)) return true;
      // otherwise, allow but deprioritize
      return true;
    } catch (e) {
      return true;
    }
  }

  async analyzeImages() {
    if (!this.session) return false;
    console.log("SafeInnocence: Starting optimized image analysis");

    const images = Array.from(document.querySelectorAll("img"));
    const visible = [];
    const offscreen = [];

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    function isLikelyVisible(img) {
      const r = img.getBoundingClientRect();
      return !(
        r.bottom < 0 ||
        r.top > viewportHeight ||
        r.right < 0 ||
        r.left > viewportWidth
      );
    }

    for (const img of images) {
      if (!this.shouldAnalyzeImageFastCheck(img)) continue;
      if (isLikelyVisible(img)) visible.push(img);
      else offscreen.push(img);
    }

    const toAnalyze = visible.concat(offscreen.slice(0, 40));
    this.totalImages = toAnalyze.length;
    this.analyzedImages = 0;
    this._pageBlocked = false; // bandera para detener procesamiento si bloqueamos la página

    const handler = async (img) => {
      if (this._pageBlocked) return null; // ya bloqueada por otra tarea

      // cacheKey robusto
      const cacheKey =
        (img.src && img.src.trim()) ||
        (img.dataset && img.dataset.src && img.dataset.src.trim()) ||
        (img.currentSrc && img.currentSrc.trim()) ||
        null;

      if (cacheKey && this.imageCache.has(cacheKey)) {
        const cached = this.imageCache.get(cacheKey);
        // expiración simple: 24h
        if (Date.now() - cached.ts < 24 * 60 * 60 * 1000) {
          // marcar analizada
          img.dataset.safeInnocenceAnalyzed = "true";

          // si la caché indica inapropiada -> incrementar contador y tomar acción
          if (cached.result?.inappropriate) {
            this.blockedContentCount++;
            this.blurOrRemoveImage(img, cached.result);

            // comprobar umbral inmediatamente
            if (this.evaluatePageSafety()) {
              this._pageBlocked = true;
              // actualizar progreso antes de salir
              this.updateProgress();
              return cached.result;
            }
          }

          // actualizar progreso (solo una vez NORMAL)
          this.updateProgress();
          return cached.result;
        } else {
          this.imageCache.delete(cacheKey);
        }
      }

      // obtener datos de la imagen
      const imageBlobOrBitmap = await this.getImageData(img).catch(() => null);
      if (!imageBlobOrBitmap) {
        img.dataset.safeInnocenceAnalyzed = "true";
        this.updateProgress();
        return null;
      }

      let result = null;
      try {
        result = await this.callAIWithTimeout(imageBlobOrBitmap, {
          img,
          timeout: this.analysisTimeoutMs,
        });
      } catch (e) {
        console.warn("AI call failed or timed out for image", e);
        result = null;
      }

      img.dataset.safeInnocenceAnalyzed = "true";

      if (cacheKey) this.imageCache.set(cacheKey, { result, ts: Date.now() });

      if (result?.inappropriate) {
        // **aquí** incrementamos siempre que la IA diga inapropiado
        this.blockedContentCount++;
        this.blurOrRemoveImage(img, result);

        // comprobar umbral inmediatamente
        if (this.evaluatePageSafety()) {
          this._pageBlocked = true;
          // actualizar progreso antes de salir
          this.updateProgress();
          return result;
        }
      }

      // un solo updateProgress por imagen analizada
      this.updateProgress();
      return result;
    };

    // Ejecutar con límite de concurrencia
    try {
      await this.limitConcurrency(toAnalyze, handler, this.analysisConcurrency);
    } catch (err) {
      // si alguna tarea lanzó por alguna razón, lo registramos pero seguimos
      console.warn("SafeInnocence: analyzeImages concurrency aborted:", err);
    }

    console.log("SafeInnocence: Optimized image analysis finished");
    return !!this._pageBlocked; // true si bloqueamos la página
  }

  /**
   * Analiza una imagen para detectar contenido inapropiado utilizando IA.
   * @param {HTMLElement} imgElement - El elemento de la imagen a analizar.
   * @param {string} [size='medium'] - El tamaño de la imagen para el registro.
   * @returns {Promise<object|null>} - El resultado del análisis o null si falla.
   */
  async analyzeImage(imgElement, size = "medium") {
    try {
      if (!this.session) {
        return null;
      }

      // Omitir si la imagen ya fue analizada previamente
      if (imgElement.dataset.safeInnocenceAnalyzed) {
        return null;
      }

      // Convertir la imagen a datos para el análisis
      const imageData = await this.getImageData(imgElement);

      if (!imageData) {
        imgElement.dataset.safeInnocenceAnalyzed = "true";
        return null;
      }

      // Prompt para que la IA analice el contenido de la imagen
      const prompt = `Analyze this image for inappropriate content for children.
                    Check for: violence, adult content, self-harm, hate symbols, extremism, 
                    cyberbullying, substance abuse, threats, disturbing imagery.

                    Respond only with JSON format: {
                      "inappropriate": boolean, 
                      "reason": string, 
                      "severity": "low"|"medium"|"high", 
                      "categories": []
                    }`;

      console.log(
        `SafeInnocence: Sending image analysis prompt for ${size} image`
      );

      const response = await this.session.prompt(
        [
          {
            role: "user",
            content: [
              {
                type: "text",
                value: prompt,
              },
              {
                type: "image",
                value: imageData,
              },
            ],
          },
        ],
        {
          outputLanguage: "en",
        }
      );

      console.log(`SafeInnocence: AI Response for ${size} image:`, response);

      const result = this.parseAIResponse(response);

      if (result && result.inappropriate) {
        this.blockedContentCount++;
        this.blurOrRemoveImage(imgElement, result);
      }

      // Marcar la imagen como analizada para no repetirla
      imgElement.dataset.safeInnocenceAnalyzed = "true";
      imgElement.dataset.safeInnocenceSize = size;

      return result;
    } catch (error) {
      console.error("SafeInnocence: Single image analysis error:", error);
      // Marcar como analizada incluso si hay un error para evitar reintentos infinitos
      imgElement.dataset.safeInnocenceAnalyzed = "true";
      return null;
    }
  }

  // Mejor getImageData usando createImageBitmap / OffscreenCanvas y reuso
  async getImageData(imgElement) {
    try {
      // Si la imagen está cross-origin y no se puede fetch -> fall back
      const isCross = this.isCrossOriginImage(imgElement);
      // Intentar usar createImageBitmap con fetch(blob) (mejor performance)
      let blob = null;
      if (isCross) {
        // intenta fetch con timeout y AbortController
        try {
          const ac = new AbortController();
          const id = setTimeout(() => ac.abort(), 4000);
          const resp = await fetch(imgElement.src, {
            signal: ac.signal,
            cache: "force-cache",
          });
          clearTimeout(id);
          if (!resp.ok) throw new Error("fetch failed");
          blob = await resp.blob();
        } catch (e) {
          // fall back: si no obtenemos blob, intentar captura via background (ext API) o devolver null
          return null;
        }
      } else {
        // same-origin: podemos crear bitmap directo desde <img> con createImageBitmap(img)
        try {
          if ("createImageBitmap" in window) {
            const bmp = await createImageBitmap(imgElement);
            return bmp; // createImageBitmap es aceptado por OffscreenCanvas o transferrable
          }
        } catch (e) {
          // ignore y continuar
        }
        // fallback: fetch blob
        try {
          const resp = await fetch(imgElement.src, { cache: "force-cache" });
          if (!resp.ok) throw new Error("fetch failed");
          blob = await resp.blob();
        } catch (e) {
          // fallback to drawing from element into canvas
          // we'll handle below
        }
      }

      // Si tenemos blob -> createImageBitmap(blob)
      if (blob) {
        if ("createImageBitmap" in window) {
          const bmp = await createImageBitmap(blob);
          return bmp;
        } else {
          // fallback: convert blob -> img -> draw to canvas
          const objectUrl = URL.createObjectURL(blob);
          const temp = new Image();
          temp.src = objectUrl;
          await new Promise((res, rej) => {
            temp.onload = res;
            temp.onerror = rej;
            setTimeout(res, 3000);
          });
          // draw to regular canvas
          const canvas = document.createElement("canvas");
          const maxDim = 512;
          const w = Math.min(maxDim, temp.naturalWidth || temp.width);
          const h = Math.min(maxDim, temp.naturalHeight || temp.height);
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(temp, 0, 0, w, h);
          const blobOut = await new Promise((resolve) =>
            canvas.toBlob(resolve, "image/jpeg", 0.7)
          );
          URL.revokeObjectURL(objectUrl);
          return blobOut;
        }
      }

      // último recurso: draw imageElement into canvas (same-origin or allowed)
      const canvas = document.createElement("canvas");
      const maxDim = 512;
      let targetW = imgElement.naturalWidth || imgElement.width || 256;
      let targetH = imgElement.naturalHeight || imgElement.height || 256;
      if (targetW > maxDim || targetH > maxDim) {
        const ratio = targetW / targetH;
        if (targetW > targetH) {
          targetW = maxDim;
          targetH = Math.round(maxDim / ratio);
        } else {
          targetH = maxDim;
          targetW = Math.round(maxDim * ratio);
        }
      }
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(imgElement, 0, 0, targetW, targetH);
      return await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.7)
      );
    } catch (err) {
      // si se produce CORS/tainted -> devuelve null (skip)
      return null;
    }
  }

  // callAIWithTimeout: wrapper que envuelve this.session.prompt con timeout
  async callAIWithTimeout(imageBlobOrBitmap, { img, timeout = 15000 } = {}) {
    // construir payload según tu API: si session.prompt acepta createImageBitmap, pásalo
    const ac = new AbortController();
    const id = setTimeout(() => ac.abort(), timeout);
    try {
      const prompt = [
        {
          role: "user",
          content: [
            {
              type: "text",
              value: "Analiza esta imagen para contenido inapropiado...",
            },
            { type: "image", value: imageBlobOrBitmap },
          ],
        },
      ];
      const respPromise = this.session.prompt(prompt, {
        outputLanguage: "en",
        signal: ac.signal,
      });
      const response = await respPromise;
      clearTimeout(id);
      return this.parseAIResponse(response);
    } catch (e) {
      clearTimeout(id);
      throw e;
    }
  }

  /**
   * Initialize AI models
   */
  async initializeAI() {
    try {
      // Check availability of Prompt API
      const promptAvailability = await LanguageModel.availability();

      if (promptAvailability === "unavailable") {
        console.warn("SafeInnocence: Prompt API unavailable");
        return;
      }

      // Create language model session for content analysis with image support
      console.log(
        "SafeInnocence: Creating LanguageModel session with image support"
      );
      this.session = await LanguageModel.create({
        systemPrompt: `You are a comprehensive content safety analyzer for child protection.
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
                     Respond with JSON format: {"inappropriate": boolean, "reason": string, "severity": "low"|"medium"|"high", "categories": []}`,
        expectedInputs: [
          { type: "text", languages: ["en", "es"] },
          { type: "image" },
        ],
        expectedOutputs: [{ type: "text", languages: ["en"] }],
        outputLanguage: "en",
      });

      console.log("SafeInnocence: LanguageModel session created successfully");

      // Check availability of Summarizer API
      const summarizerAvailability = await Summarizer.availability();

      if (summarizerAvailability !== "unavailable") {
        this.summarizer = await Summarizer.create({
          type: "key-points",
          format: "plain-text",
          length: "short",
        });
      }

      console.log("SafeInnocence: AI models initialized");
    } catch (error) {
      console.error("SafeInnocence: AI initialization error:", error);
    }
  }

  /**
   * Analyze the entire page
   * @returns {Promise<boolean>} - True if page was blocked, false otherwise
   */
  async analyzePage() {
    if (!this.session) {
      return false;
    }

    // If social media, analyze comments instead of blocking page
    if (this.isSocialMedia) {
      return await this.analyzeSocialMediaContent();
    } else {
      // Regular page analysis
      await this.analyzeImages();
      await this.analyzeTextContent();
      return this.evaluatePageSafety();
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
    // Check if element still exists in DOM
    if (!imgElement.parentElement) {
      return;
    }

    imgElement.style.filter = "blur(20px)";
    imgElement.style.pointerEvents = "none";
    imgElement.dataset.safeInnocenceBlocked = "true";
    imgElement.title =
      "Content blocked by SafeInnocence: " + analysisResult.reason;

    // Check if this is a YouTube video thumbnail - disable the video link
    const youtubeLink = imgElement.closest(
      "a#thumbnail, ytd-thumbnail a, yt-thumbnail-view-model a"
    );
    if (youtubeLink) {
      youtubeLink.style.pointerEvents = "none";
      youtubeLink.style.cursor = "not-allowed";
      youtubeLink.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };
      youtubeLink.href = "javascript:void(0)";

      // Also disable the parent video container
      const videoContainer = imgElement.closest(
        "ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, ytd-playlist-video-renderer"
      );
      if (videoContainer) {
        videoContainer.style.opacity = "0.5";
        videoContainer.style.pointerEvents = "none";
        videoContainer.style.cursor = "not-allowed";
      }
    }

    // Add overlay
    const overlay = document.createElement("div");
    overlay.className = "safe-innocence-overlay";
    overlay.textContent = "🛡️ Content Blocked";
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
      pointer-events: none;
    `;

    // Wrap image if needed
    if (imgElement.parentElement.style.position !== "relative") {
      const wrapper = document.createElement("div");
      wrapper.style.position = "relative";
      wrapper.style.display = "inline-block";
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
      const textElements = document.querySelectorAll(
        "p, article, h1, h2, h3, div.content"
      );
      let fullText = "";

      textElements.forEach((el) => {
        fullText += el.innerText + "\n";
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
          context: "Summarize the main topics and themes of this content",
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
        outputLanguage: "en",
      });
      const result = this.parseAIResponse(response);

      if (result && result.inappropriate) {
        this.blockedContentCount +=
          result.severity === "high" ? 5 : result.severity === "medium" ? 3 : 1;

        // Store the analysis result
        this.pageAnalysisResult = result;
      }
    } catch (error) {
      console.error("SafeInnocence: Text analysis error:", error);
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

      if (
        lowerResponse.includes("cyberbullying") ||
        lowerResponse.includes("bullying")
      ) {
        categories.push("cyberbullying");
      }
      if (
        lowerResponse.includes("hate speech") ||
        lowerResponse.includes("discriminatory")
      ) {
        categories.push("hate_speech");
      }
      if (lowerResponse.includes("threat")) {
        categories.push("threats");
      }
      if (
        lowerResponse.includes("self-harm") ||
        lowerResponse.includes("suicide")
      ) {
        categories.push("self_harm");
      }
      if (
        lowerResponse.includes("misinformation") ||
        lowerResponse.includes("false")
      ) {
        categories.push("misinformation");
      }
      if (
        lowerResponse.includes("adult") ||
        lowerResponse.includes("sexual") ||
        lowerResponse.includes("explicit")
      ) {
        categories.push("adult_content");
      }
      if (
        lowerResponse.includes("substance") ||
        lowerResponse.includes("drugs") ||
        lowerResponse.includes("alcohol")
      ) {
        categories.push("substance_abuse");
      }
      if (
        lowerResponse.includes("personal information") ||
        lowerResponse.includes("pii")
      ) {
        categories.push("personal_information");
      }
      if (
        lowerResponse.includes("extremism") ||
        lowerResponse.includes("radicalization")
      ) {
        categories.push("extremism");
      }
      if (
        lowerResponse.includes("violence") ||
        lowerResponse.includes("violent") ||
        lowerResponse.includes("gore")
      ) {
        categories.push("violence");
      }

      if (
        lowerResponse.includes("inappropriate") ||
        lowerResponse.includes("not safe") ||
        categories.length > 0
      ) {
        return {
          inappropriate: true,
          reason:
            categories.length > 0
              ? `Detected: ${categories.join(", ")}`
              : "Content flagged by AI analysis",
          severity: "medium",
          categories: categories,
        };
      }

      return null;
    } catch (error) {
      console.error("SafeInnocence: Response parsing error:", error);
      return null;
    }
  }

  /**
   * Analyze social media content (comments, posts)
   * @returns {Promise<boolean>} - True if page was blocked, false otherwise
   */
  async analyzeSocialMediaContent() {
    try {
      // Analyze video thumbnails and post images on social media
      await this.analyzeSocialMediaImages();

      // Analyze comments based on platform
      await this.analyzeComments();

      // Evaluate if threshold is exceeded - block page if needed
      const blockThreshold =
        this.settings.blockThreshold ||
        (this.settings.sensitivity === "high"
          ? 3
          : this.settings.sensitivity === "medium"
          ? 5
          : 7);

      console.log(
        `SafeInnocence: Blocked content count: ${this.blockedContentCount}, Threshold: ${blockThreshold}`
      );

      if (this.blockedContentCount >= blockThreshold) {
        // Block page temporarily but DON'T add to blocked sites list
        console.log(
          `SafeInnocence: Threshold exceeded (${this.blockedContentCount}/${blockThreshold}), blocking page temporarily`
        );
        this.blockPageTemporarily(
          `Too much inappropriate content detected: ${this.blockedContentCount} items`
        );
        return true; // Page was blocked
      } else if (this.blockedContentCount > 0) {
        // Just save as partial block if some content was filtered
        await this.saveBlockedSite(
          "partial",
          `${this.blockedContentCount} items filtered on ${this.socialMediaPlatform}`
        );
      }
      return false; // Page was not blocked
    } catch (error) {
      console.error("SafeInnocence: Social media analysis error:", error);
      return false;
    }
  }

  /**
   * Analyze images specifically on social media (thumbnails, posts)
   */
  async analyzeSocialMediaImages() {
    try {
      const images = Array.from(document.querySelectorAll("img"));

      // Filter and categorize images
      const thumbnails = [];
      const otherImages = [];

      images.forEach((img) => {
        const area = img.naturalWidth * img.naturalHeight;

        // Check if it's a video thumbnail or post image based on selectors and size
        const isYoutubeThumbnail = img.closest(
          "ytd-thumbnail, #thumbnail, a#thumbnail, yt-thumbnail-view-model, yt-collection-thumbnail-view-model"
        );
        const isInstagramPost = img.closest("article");
        const isTikTokVideo = img.closest('[data-e2e="video-item"]');
        const isTwitterMedia = img.closest('[data-testid="tweet"] img');
        const isFacebookPost = img.closest('div[role="article"]');

        if (
          isYoutubeThumbnail ||
          isInstagramPost ||
          isTikTokVideo ||
          isTwitterMedia ||
          isFacebookPost
        ) {
          if (area > 10000) {
            // Significant size
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
        const result = await this.analyzeImage(img, "thumbnail");
        this.updateProgress();

        // Don't block social media pages, just blur the image
        if (result && result.inappropriate) {
          this.blockedContentCount++;
        }
      }

      // Analyze other large images
      for (const img of otherImages.slice(0, 20)) {
        const result = await this.analyzeImage(img, "large");
        this.updateProgress();

        if (result && result.inappropriate) {
          this.blockedContentCount++;
        }
      }
    } catch (error) {
      console.error("SafeInnocence: Social media image analysis error:", error);
    }
  }

  /**
   * Analyze comments on social media platforms
   */
  async analyzeComments() {
    const commentSelectors = this.getCommentSelectors();

    if (!commentSelectors) {
      console.warn("SafeInnocence: No comment selectors for this platform");
      return;
    }

    const comments = document.querySelectorAll(commentSelectors.join(", "));
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
        const status = document.getElementById("safe-innocence-status");
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
      youtube: [
        "#content-text",
        "yt-formatted-string#content-text",
        "#comment #content-text",
      ],
      instagram: [
        "span._ap3a._aaco._aacu._aacx._aad7._aade",
        'span[dir="auto"]',
        "div.C4VMK > span",
      ],
      twitter: ['div[data-testid="tweetText"]', "div[lang] > span"],
      facebook: ['div[dir="auto"]', 'span[dir="auto"]', "div.x1lliihq"],
      reddit: [
        'div[data-testid="comment"]',
        "div.md p",
        "div._292iotee19Lmt0MUIr9ejT",
      ],
      discord: ['div[class*="messageContent"]', "div.markup"],
      tiktok: [
        'p[data-e2e="comment-level-1"]',
        'span[data-e2e="comment-level-2"]',
      ],
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
        commentElement.dataset.safeInnocenceAnalyzed = "true";
        return;
      }

      const prompt = `Analyze this comment for inappropriate content for children.
                     Check for: cyberbullying, hate speech, threats, self-harm, adult content, substance abuse, violence, extremism, personal information.
                     Comment: "${commentText}"
                     Respond only with JSON: {"inappropriate": boolean, "reason": string, "severity": "low"|"medium"|"high", "categories": []}`;

      console.log(
        `SafeInnocence: Sending comment analysis prompt:`,
        commentText.substring(0, 100)
      );

      const response = await this.session.prompt(prompt, {
        outputLanguage: "en",
      });

      console.log(`SafeInnocence: AI Response for comment:`, response);
      const result = this.parseAIResponse(response);

      if (result && result.inappropriate) {
        this.replaceInappropriateComment(commentElement, result);
      }

      commentElement.dataset.safeInnocenceAnalyzed = "true";
    } catch (error) {
      console.error("SafeInnocence: Comment analysis error:", error);
      commentElement.dataset.safeInnocenceAnalyzed = "true";
    }
  }

  /**
   * Replace inappropriate comment with warning
   */
  replaceInappropriateComment(commentElement, analysisResult) {
    const replacement = document.createElement("div");
    replacement.className = "safe-innocence-blocked-comment";
    replacement.style.cssText = `
      background: #fff3e0;
      border: 2px solid #ff9800;
      border-radius: 8px;
      padding: 12px 16px;
      margin: 4px 0;
      font-family: Arial, sans-serif;
    `;

    const icon = document.createElement("span");
    icon.textContent = "🛡️ ";
    icon.style.cssText = "font-size: 16px;";

    const text = document.createElement("span");
    text.style.cssText = "color: #e65100; font-weight: 500; font-size: 14px;";
    text.textContent = `Content removed by SafeInnocence`;

    const reason = document.createElement("div");
    reason.style.cssText = "color: #666; font-size: 12px; margin-top: 4px;";
    reason.textContent = `Reason: ${analysisResult.reason}`;

    const categories = document.createElement("div");
    if (analysisResult.categories && analysisResult.categories.length > 0) {
      categories.style.cssText =
        "color: #999; font-size: 11px; margin-top: 4px;";
      categories.textContent = `Categories: ${analysisResult.categories.join(
        ", "
      )}`;
    }

    replacement.appendChild(icon);
    replacement.appendChild(text);
    replacement.appendChild(reason);
    if (analysisResult.categories && analysisResult.categories.length > 0) {
      replacement.appendChild(categories);
    }

    // Replace the original comment
    if (commentElement.parentElement) {
      commentElement.style.display = "none";
      commentElement.parentElement.insertBefore(replacement, commentElement);
    }
  }

  /**
   * Evaluate overall page safety
   * @returns {boolean} - True if page was blocked, false otherwise
   */
  evaluatePageSafety() {
    // Don't block social media pages
    if (this.isSocialMedia) {
      return false;
    }

    // Threshold for blocking entire page
    const blockThreshold =
      this.settings.sensitivity === "high"
        ? 3
        : this.settings.sensitivity === "medium"
        ? 5
        : 7;

    if (this.blockedContentCount >= blockThreshold) {
      this.blockPage();
      return true; // Page was blocked
    }
    return false; // Page was not blocked
  }

  /**
   * Block page temporarily (without saving to blocked sites list)
   */
  blockPageTemporarily(reason = null) {
    // Hide progress indicator
    this.hideProgressIndicator();

    // Create blocking overlay (same as blockPage but without saving)
    this.createBlockOverlay(reason);
  }

  /**
   * Block the entire page (and save to blocked sites list)
   */
  async blockPage(reason = null) {
    // Hide progress indicator
    this.hideProgressIndicator();

    // Save blocked site to storage
    await this.saveBlockedSite("total", reason);

    // Create blocking overlay
    this.createBlockOverlay(reason);
  }

  /**
   * Create block overlay UI
   */
  createBlockOverlay(reason = null) {
    const overlay = document.createElement("div");
    overlay.id = "safe-innocence-page-block";
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

    const modal = document.createElement("div");
    modal.style.cssText = `
      background: white;
      padding: 40px;
      border-radius: 10px;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;

    const icon = document.createElement("div");
    icon.style.cssText = "font-size: 64px; margin-bottom: 20px;";
    icon.textContent = "🛡️";

    const title = document.createElement("h2");
    title.textContent = "Page Blocked by SafeInnocence";
    title.style.cssText =
      "color: #d32f2f; margin-bottom: 20px; font-family: Arial, sans-serif;";

    const message = document.createElement("p");
    message.textContent = `This page contains content that may not be appropriate for children. ${
      reason ||
      (this.pageAnalysisResult
        ? this.pageAnalysisResult.reason
        : "Multiple inappropriate elements detected.")
    }`;
    message.style.cssText =
      "color: #333; margin-bottom: 30px; line-height: 1.6; font-family: Arial, sans-serif;";

    const buttonContainer = document.createElement("div");
    buttonContainer.style.cssText =
      "display: flex; gap: 10px; justify-content: center;";

    const goBackButton = document.createElement("button");
    goBackButton.textContent = "Go Back";
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

    const closeButton = document.createElement("button");
    closeButton.textContent = "Close Page";
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
    document.body.style.overflow = "hidden";
  }

  /**
   * Save blocked site to storage
   */
  async saveBlockedSite(blockType, reason) {
    try {
      const currentUrl = window.location.href;
      const result = await chrome.storage.local.get(["blockedSites"]);
      const blockedSites = result.blockedSites || [];

      // Check if site already exists
      const existingIndex = blockedSites.findIndex((site) =>
        currentUrl.includes(site.url)
      );

      const siteData = {
        url: window.location.hostname + window.location.pathname,
        blockType: blockType,
        reason: reason || "Inappropriate content detected",
        timestamp: Date.now(),
      };

      if (existingIndex >= 0) {
        // Update existing entry
        blockedSites[existingIndex] = {
          ...blockedSites[existingIndex],
          ...siteData,
        };
      } else {
        // Add new entry
        blockedSites.push(siteData);
      }

      await chrome.storage.local.set({ blockedSites });
    } catch (error) {
      console.error("SafeInnocence: Error saving blocked site:", error);
    }
  }

  /**
   * Setup mutation observer for dynamic content
   */
  setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            // Element node
            // Check for new images
            if (node.tagName === "IMG") {
              this.analyzeImage(node);
            } else if (node.querySelectorAll) {
              const images = node.querySelectorAll("img");
              images.forEach((img) => this.analyzeImage(img));

              // Check for new comments on social media
              if (this.isSocialMedia) {
                const commentSelectors = this.getCommentSelectors();
                if (commentSelectors) {
                  const comments = node.querySelectorAll(
                    commentSelectors.join(", ")
                  );
                  comments.forEach((comment) => {
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
      subtree: true,
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

    window.addEventListener("scroll", handleScroll, { passive: true });
  }

  /**
   * Analyze new content that appears after scroll
   */
  async analyzeNewContent() {
    try {
      // Find unanalyzed images
      const unanalyzedImages = Array.from(
        document.querySelectorAll("img:not([data-safe-innocence-analyzed])")
      );

      if (unanalyzedImages.length > 0) {
        console.log(
          `SafeInnocence: Analyzing ${unanalyzedImages.length} new images after scroll`
        );

        for (const img of unanalyzedImages.slice(0, 10)) {
          // Limit to 10 at a time
          await this.analyzeImage(img);
        }
      }

      // Find unanalyzed comments on social media
      if (this.isSocialMedia) {
        const commentSelectors = this.getCommentSelectors();
        if (commentSelectors) {
          const unanalyzedComments = Array.from(
            document.querySelectorAll(
              commentSelectors
                .map((sel) => `${sel}:not([data-safe-innocence-analyzed])`)
                .join(", ")
            )
          );

          if (unanalyzedComments.length > 0) {
            console.log(
              `SafeInnocence: Analyzing ${unanalyzedComments.length} new comments after scroll`
            );

            for (const comment of unanalyzedComments.slice(0, 5)) {
              // Limit to 5 at a time
              await this.analyzeComment(comment);
            }
          }
        }
      }
    } catch (error) {
      console.error("SafeInnocence: Error analyzing new content:", error);
    }
  }

  /**
   * Show progress indicator
   */
  showProgressIndicator() {
    console.log("SafeInnocence: Showing progress indicator");

    this.progressIndicator = document.createElement("div");
    this.progressIndicator.id = "safe-innocence-progress";
    this.progressIndicator.style.cssText = `
      position: fixed !important;
      top: 15px !important;
      right: 15px !important;
      background: linear-gradient(135deg, #7c3aed 0%, #10b981 100%) !important;
      color: white !important;
      padding: 8px 12px !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4) !important;
      z-index: 2147483647 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;
      min-width: 180px !important;
      max-width: 220px !important;
      pointer-events: auto !important;
      animation: slideInRight 0.3s ease-out !important;
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
    `;

    const contentWrapper = document.createElement("div");
    contentWrapper.style.cssText =
      "flex: 1 !important; min-width: 0 !important;";

    const header = document.createElement("div");
    header.style.cssText =
      "display: flex !important; align-items: center !important; gap: 6px !important; margin-bottom: 4px !important;";

    const icon = document.createElement("span");
    icon.style.cssText =
      "font-size: 16px !important; line-height: 1 !important;";
    icon.textContent = "🛡️";

    const title = document.createElement("span");
    title.style.cssText =
      "font-weight: 600 !important; font-size: 11px !important; color: white !important;";
    title.textContent = "SafeInnocence";

    header.appendChild(icon);
    header.appendChild(title);

    const status = document.createElement("div");
    status.id = "safe-innocence-status";
    status.style.cssText =
      "font-size: 10px !important; opacity: 0.9 !important; color: white !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important;";
    status.textContent = "Analyzing...";

    const progressBarContainer = document.createElement("div");
    progressBarContainer.style.cssText = `
      width: 100% !important;
      height: 3px !important;
      background: rgba(255, 255, 255, 0.3) !important;
      border-radius: 2px !important;
      overflow: hidden !important;
      margin-top: 4px !important;
    `;

    const progressBar = document.createElement("div");
    progressBar.id = "safe-innocence-progress-bar";
    progressBar.style.cssText = `
      width: 0% !important;
      height: 100% !important;
      background: white !important;
      border-radius: 2px !important;
      transition: width 0.3s ease !important;
    `;

    progressBarContainer.appendChild(progressBar);

    contentWrapper.appendChild(header);
    contentWrapper.appendChild(status);
    contentWrapper.appendChild(progressBarContainer);

    const closeButton = document.createElement("button");
    closeButton.style.cssText = `
      background: rgba(255, 255, 255, 0.2) !important;
      border: none !important;
      color: white !important;
      width: 20px !important;
      height: 20px !important;
      border-radius: 4px !important;
      cursor: pointer !important;
      font-size: 14px !important;
      line-height: 1 !important;
      padding: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      flex-shrink: 0 !important;
      transition: background 0.2s !important;
    `;
    closeButton.textContent = "×";
    closeButton.title = "Close (analysis continues)";
    closeButton.onclick = () => this.hideProgressIndicator();
    closeButton.onmouseenter = () => {
      closeButton.style.background = "rgba(255, 255, 255, 0.3) !important";
    };
    closeButton.onmouseleave = () => {
      closeButton.style.background = "rgba(255, 255, 255, 0.2) !important";
    };

    this.progressIndicator.appendChild(contentWrapper);
    this.progressIndicator.appendChild(closeButton);

    document.body.appendChild(this.progressIndicator);
  }

  /**
   * Update progress indicator
   */
  updateProgress() {
    this.analyzedImages++;

    if (this.progressIndicator) {
      const progressBar = document.getElementById(
        "safe-innocence-progress-bar"
      );
      const status = document.getElementById("safe-innocence-status");

      if (progressBar && this.totalImages > 0) {
        const percentage = Math.round(
          (this.analyzedImages / this.totalImages) * 100
        );
        progressBar.style.width = percentage + "%";
        status.textContent = `Analyzing images: ${this.analyzedImages}/${this.totalImages}`;
      }
    }
  }

  /**
   * Hide progress indicator
   */
  hideProgressIndicator() {
    if (this.progressIndicator) {
      this.progressIndicator.style.animation = "slideOutRight 0.3s ease-out";
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
