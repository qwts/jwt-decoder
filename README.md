# JWT Decoder

A Chromium extension that decodes a pasted JWT and shows its header, payload,
and signature with syntax highlighting. Vanilla JavaScript; Manifest V3.

## Load unpacked

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this repository root.

The popup is `popup.html`. Decoder logic lives in `src/`.

## Development

There is no build step. Edit the source files and reload the extension.

## License

MIT. See `LICENSE`.
