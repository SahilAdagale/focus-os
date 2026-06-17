# Focus OS Chrome Extension

MV3 extension for collecting browser attention events and sending them to the Focus OS backend.

## Load locally

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select this `extension` folder.
5. Open the extension popup and log in with your Focus OS account.

## Backend target

The default API base is:

```txt
http://localhost:8080/api
```

The extension sends events to:

```txt
POST /api/attention-events
POST /api/attention-events/bulk
```

## Session linking

The Active session ID field is optional. When set, events are attached to that MongoDB session `_id`, allowing the backend scoring service to include browser behavior in `focusScore`.

## Events collected

- `tab_switch`
- `tab_update`
- `distraction_visit`
- `idle_start`
- `idle_end`
- `active_window_change`

Failed sends are queued in `chrome.storage.local` and retried every minute or when the popup Flush button is pressed.
