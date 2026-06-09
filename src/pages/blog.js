import { initOffcanvasNav } from "../modules/navigation/offcanvasNav.js";
import { initMobileEnhancements } from "../modules/mobile/enhancements.js";

// Initialize shared navigation and mobile helpers.
initOffcanvasNav();
initMobileEnhancements();

// Interactive Video Showcase functionality
document.addEventListener("DOMContentLoaded", () => {
  const videoPlayer = document.getElementById("showcase-video");
  const videoSource = document.getElementById("showcase-video-src");
  const tabs = document.querySelectorAll(".video-tab");
  const captionText = document.getElementById("showcase-caption");
  
  if (!videoPlayer || tabs.length === 0) return;

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      // Remove active class from all tabs
      tabs.forEach(t => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      
      // Add active class to clicked tab
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      
      // Get attributes for the chosen video
      const videoSrc = tab.getAttribute("data-video-src");
      const videoTitle = tab.getAttribute("data-video-title");
      const videoDesc = tab.getAttribute("data-video-desc");

      // Update the source of the video player
      if (videoSource) {
        videoSource.src = videoSrc;
        videoPlayer.load();
        
        // Autoplay the video upon explicit user interaction
        videoPlayer.play().catch(err => {
          console.log("Autoplay was prevented by browser security rules:", err);
        });
      }
      
      // Smooth fade transition for description text
      if (captionText) {
        captionText.style.opacity = 0;
        setTimeout(() => {
          captionText.innerHTML = `<strong>${videoTitle}</strong> &mdash; ${videoDesc}`;
          captionText.style.opacity = 1;
        }, 150);
      }
    });
  });
});
