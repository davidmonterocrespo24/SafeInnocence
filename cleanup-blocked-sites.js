/**
 * Cleanup Script: Remove search engines and social media from blocked sites list
 *
 * Run this in the browser console on any page with the extension installed:
 * 1. Open DevTools (F12)
 * 2. Paste this entire script
 * 3. Press Enter
 *
 * This will clean up any search engines or social media sites that were
 * accidentally added to the blocked sites list.
 */

(async function cleanupBlockedSites() {
  console.log("SafeInnocence: Starting blocked sites cleanup...");

  // List of domains that should NEVER be in the blocked sites list
  const socialMediaAndSearchEngines = [
    // Search Engines
    "google.com",
    "google.",
    "bing.com",
    "duckduckgo.com",
    "yahoo.com",
    "yandex.com",
    "baidu.com",

    // Social Media
    "youtube.com",
    "youtu.be",
    "instagram.com",
    "twitter.com",
    "x.com",
    "facebook.com",
    "fb.com",
    "tiktok.com",
    "reddit.com",
    "discord.com",
    "twitch.tv",
    "snapchat.com",
    "linkedin.com",
    "pinterest.com",
    "tumblr.com",
    "whatsapp.com"
  ];

  try {
    // Get current blocked sites
    const result = await chrome.storage.local.get(["blockedSites"]);
    const blockedSites = result.blockedSites || [];

    console.log(`SafeInnocence: Found ${blockedSites.length} blocked sites`);

    // Filter out social media and search engines
    const cleanedSites = blockedSites.filter(site => {
      const url = site.url.toLowerCase();

      // Check if this URL contains any of the social media/search engine domains
      const isSocialMediaOrSearch = socialMediaAndSearchEngines.some(domain =>
        url.includes(domain)
      );

      if (isSocialMediaOrSearch) {
        console.log(`SafeInnocence: Removing ${site.url} from blocked list`);
        return false; // Remove it
      }

      return true; // Keep it
    });

    console.log(`SafeInnocence: Removed ${blockedSites.length - cleanedSites.length} social media/search engine entries`);
    console.log(`SafeInnocence: ${cleanedSites.length} blocked sites remaining`);

    // Save the cleaned list
    await chrome.storage.local.set({ blockedSites: cleanedSites });

    console.log("SafeInnocence: Cleanup complete! ✅");
    console.log("You can now visit Google, YouTube, and other social media sites without issues.");

  } catch (error) {
    console.error("SafeInnocence: Cleanup failed:", error);
  }
})();
