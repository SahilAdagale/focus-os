function postReady() {
    window.postMessage({
        source: 'focus-os-extension',
        type: 'FOCUS_OS_CONTENT_READY',
        response: { ok: true }
    }, window.location.origin)
}

postReady()

let readyPings = 0
const readyInterval = setInterval(() => {
    postReady()
    readyPings += 1
    if (readyPings >= 10) {
        clearInterval(readyInterval)
    }
}, 1000)

window.addEventListener('message', (event) => {
    if (event.source !== window) return
    if (event.data?.source !== 'focus-os-web') return

    chrome.runtime.sendMessage(event.data, (response) => {
        const runtimeError = chrome.runtime.lastError?.message

        window.postMessage({
            source: 'focus-os-extension',
            requestId: event.data.requestId,
            type: `${event.data.type}_RESULT`,
            response: response || {
                ok: false,
                error: runtimeError || 'Extension background did not respond'
            }
        }, window.location.origin)
    })
})
