let tooltip;
let featuresList;
let timeout;
let showTooltip;
chrome.storage.local.get("toggle", (result) => {
  if (result.toggle !== undefined) {
    showTooltip = result.toggle;
  } else {
    showTooltip = true;
  }
});

document.addEventListener("mouseup", async (event) => {
  const selectedText = window.getSelection().toString().trim();
  const wordCount = selectedText?.trim().split(/\s+/).length;

  if (!selectedText || wordCount < 10 || !showTooltip) {
    // removeTooltip();
    return;
  }

  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.id = "ai-tools-tooltip";
    tooltip.style.position = "absolute";
    tooltip.style.padding = "8px";
    tooltip.style.background = "#1a1a1a";
    tooltip.style.color = "#fff";
    tooltip.style.borderRadius = "8px";
    tooltip.style.cursor = "pointer";
    tooltip.style.fontSize = "14px";
    tooltip.style.zIndex = "100000";
    tooltip.style.transition = "opacity 0.2s ease";
    tooltip.innerHTML = `<img src="${chrome.runtime.getURL(
      "icon.png"
    )}" width="30" height="30" alt="logo" />`;
    document.body.appendChild(tooltip);

    // Prevent disappearing when hovering
    tooltip.addEventListener("mouseenter", () => clearTimeout(timeout));
    tooltip.addEventListener("mouseleave", startRemoveTimer);

    tooltip.addEventListener("click", () => {
      showFeaturesList(selectedText, event.pageX, event.pageY);
    });
  }

  tooltip.style.left = `${event.pageX}px`;
  tooltip.style.top = `${event.pageY - 30}px`;
  tooltip.style.opacity = "1";
});

// Create a new <style> element
const style = document.createElement("style");
style.textContent = `
  .feature-item {
    padding: 6px;
    cursor: pointer;
    transition: background-color 0.2s ease-in-out;
  }

  .feature-item:hover {
    background-color: #f0f0f0;
    border-radius: 4px;
  }
`;

// Append the style element to the document head
document.head.appendChild(style);

function showFeaturesList(text, x, y) {
  if (!featuresList) {
    featuresList = document.createElement("div");
    featuresList.id = "ai-tools-features";
    featuresList.style.position = "absolute";
    featuresList.style.width = "180px";
    featuresList.style.background = "#ffffff";
    featuresList.style.color = "#000";
    featuresList.style.boxShadow = "0px 4px 6px rgba(0,0,0,0.1)";
    featuresList.style.borderRadius = "8px";
    featuresList.style.padding = "10px";
    featuresList.style.zIndex = "10000";
    featuresList.style.transition = "opacity 0.2s ease";
    featuresList.innerHTML = `
        <div class="feature-item" data-action="detect">Detect AI</div>
        <div class="feature-item" data-action="plagiarism">Plagiarism Checker</div>
        <div class="feature-item" data-action="humanize">Humanizer</div>
        <div class="feature-item" data-action="factcheck">Fact Checker</div>
      `;

    document.body.appendChild(featuresList);

    featuresList.addEventListener("click", (event) => {
      const action = event.target.getAttribute("data-action");

      if (action) {
        chrome.runtime.sendMessage({
          action: "openSidePanel",
          text,
          feature: action,
        });
        removeTooltip();
      }
    });

    // Prevent disappearing when hovering
    featuresList.addEventListener("mouseenter", () => clearTimeout(timeout));
    featuresList.addEventListener("mouseleave", startRemoveTimer);
  }

  featuresList.style.left = `${x}px`;
  featuresList.style.top = `${y + 20}px`;
  featuresList.style.opacity = "1";
}

function startRemoveTimer() {
  timeout = setTimeout(removeTooltip, 500);
}

function removeTooltip() {
  if (tooltip) {
    tooltip.remove();
    tooltip = null;
  }
  if (featuresList) {
    featuresList.remove();
    featuresList = null;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleIcon") {
    showTooltip = message.show;
    chrome.storage.local.set({ toggle: message.show });
  }
});
