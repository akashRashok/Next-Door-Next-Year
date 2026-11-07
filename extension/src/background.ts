declare const chrome: any;
export {};

chrome.action.onClicked.addListener(async (tab: { id?: number }) => {
  if (tab.id !== undefined) await chrome.sidePanel.open({ tabId: tab.id });
});
