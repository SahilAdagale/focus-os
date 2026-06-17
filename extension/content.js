window.addEventListener('message', (event) => {
    if (event.source !== window) return
    if (event.data?.source !== 'focus-os-web') return

    chrome.runtime.sendMessage(event.data)
})
