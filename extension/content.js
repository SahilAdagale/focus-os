window.addEventListener('message', (event) => {
    if (event.source !== window) return
    if (event.data?.source !== 'focus-os-web') return

    chrome.runtime.sendMessage(event.data, (response) => {
        window.postMessage({
            source: 'focus-os-extension',
            requestId: event.data.requestId,
            type: `${event.data.type}_RESULT`,
            response: response || { ok: false }
        }, window.location.origin)
    })
})
