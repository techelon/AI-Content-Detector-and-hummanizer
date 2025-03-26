let isSidePanelOpen = false;

chrome.runtime.onInstalled.addListener(async (details) => {
  chrome.tabs.query({}, (tabs) => {
    for (let tab of tabs) {
      if (tab.id && tab.url?.startsWith("http")) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"], // Your content script filename
        });
      }
    }
  });
  if (chrome.sidePanel && chrome.sidePanel.setOptions) {
    chrome.sidePanel
      .setOptions({ enabled: true })
      .catch((error) =>
        console.error("Error setting side panel options:", error)
      );
  } else {
    console.error("Side Panel API is not available in this environment.");
  }

  // if (details.reason === "install") {
  //   // Check if the auth prompt was already shown
  //   const { authPromptShown } = await chrome.storage.local.get(
  //     "authPromptShown"
  //   );

  //   if (!authPromptShown) {
  //     // Open the side panel

  //     chrome.notifications.create("install-notification", {
  //       type: "basic",
  //       iconUrl: "icon.png", // Ensure you have this icon in your extension
  //       title: "Welcome to Detecting AI Extension!",
  //       message: "Click here to get started.",
  //       priority: 2,
  //     });

  //     // Set flag so this doesn't happen again
  //     chrome.storage.local.set({ authPromptShown: true });
  //   }
  // }
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "sidePanel") {
    chrome.sidePanel.setOptions({ enabled: true });
    // When the side panel connects, set the flag to true
    isSidePanelOpen = true;

    // Log that the side panel has opened
    port.onMessage.addListener((message) => {
      if (message.action === "sidePanelOpened") {
        console.log("Side panel is open.");

        // Now only run the token check if the side panel is open
        chrome.storage.local.get("detectToken", (data) => {
          if (!data.detectToken) {
            chrome.cookies.get(
              { url: "https://detecting-ai.com", name: "detectToken" },
              (cookie) => {
                if (cookie) {
                  chrome.storage.local.set({ detectToken: cookie.value });
                  chrome.runtime.sendMessage({
                    action: "setToken",
                    token: cookie.value,
                  });
                } else {
                  console.log("User is not logged in.");
                }
              }
            );
          } else {
          }
        });
      }
    });

    // Disconnect when side panel closes
    port.onDisconnect.addListener(() => {
      isSidePanelOpen = false;
      chrome.storage.local.remove("highlightedText", () => {
        console.log("Data removed!");
      });
      chrome.storage.local.remove("feature", () => {
        console.log("Data removed!");
      });
      console.log("Side panel is closed.");
    });
  }
});

// Function to get the state of sidePanel

function checkSidePanelStatus() {
  if (isSidePanelOpen) {
    chrome.runtime.sendMessage({
      action: "checkSidePanelStatus",
      status: isSidePanelOpen,
    });
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openSidePanel") {
    chrome.storage.local.set({ highlightedText: message.text });

    chrome.storage.local.set({ feature: message.feature });

    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs.length) {
        console.error("No active tab found.");
        return;
      }

      try {
        await chrome.sidePanel.open({ tabId: sender.tab.id });
        await chrome.sidePanel.setOptions({
          tabId: sender.tab.id,
          path: "index.html",
          enabled: true,
          // Ensure this is accessible
        });

        checkSidePanelStatus();
      } catch (error) {
        console.error("Failed to open side panel:", error);
      }
    });
  }
});

// remove token from cookies on logout or token expiration
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "REMOVE_COOKIE") {
    chrome.cookies.remove(
      { url: "https://detecting-ai.com", name: "detectToken" },
      (details) => {
        console.log("Cookie removed:", details);
        sendResponse({ success: true });
      }
    );
    return true; // Required to use sendResponse asynchronously
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openSignupPage") {
    chrome.tabs.create({ url: "https://detecting-ai.com/signup" });
  }

  if (message.action === "openloginSuccessPage") {
    chrome.tabs.create({
      url: "https://detecting-ai.com/extension-login-success",
    });
  }
  if (message.action === "openPricingPage") {
    chrome.tabs.create({ url: "https://detecting-ai.com/pricing" });
  }
  if (message.action === "openLoginPage") {
    chrome.tabs.create({
      url: "https://detecting-ai.com/login?from_extension=extension",
    });
  }

  if (message.action === "toggleIcon") {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, message).catch((err) => {
            console.warn(`Failed to send message to tab ${tab.id}:`, err);
          });
        }
      });
    });
  }
  if (message.action === "closeSidePanel") {
    chrome.sidePanel.setOptions({ enabled: false });
    chrome.sidePanel.setOptions({ enabled: true });
  }

  if (message.action === "openNewPage") {
    chrome.tabs.create({ url: message.link });
  }
});

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));
