# Custom display font — drop the file here

The VELMAN OS wordmark (and any `.font-display` element) will use a font called
**Cyberpunk Waifus** if it can find one. It is not on Google Fonts, so it can't
be fetched automatically — you supply the file.

## To enable it

1. Download the font (DaFont / FontSpace / wherever you obtained it) and check
   its licence allows what you intend — note this folder is committed to a
   **public GitHub repo**, so redistribution rights matter.
2. Drop the file into this folder named exactly one of:

   ```
   app/public/fonts/CyberpunkWaifus.woff2   ← best (smallest)
   app/public/fonts/CyberpunkWaifus.ttf
   app/public/fonts/CyberpunkWaifus.otf
   ```

3. Hard-refresh the app. That's it — no code change needed.

`.ttf`/`.otf` work fine. To convert to `woff2` (roughly 1/3 the size), use
<https://cloudconvert.com/ttf-to-woff2> or any similar converter.

## If you'd rather not host the file

Install the font on Windows instead (right-click → Install). The stylesheet
falls back to a locally-installed copy by family name before it tries these
files.

## If the file is missing

Nothing breaks — the wordmark falls back to **Orbitron**, exactly as it looks
today.
