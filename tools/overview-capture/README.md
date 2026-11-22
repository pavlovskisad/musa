# Recording the app clips for `/overview`

Scripts that produce the clips and the still on the supplier overview page. Nothing here is part of the app or its build.

## How it works

- `vite.capture.config.js` serves the real app with three stand-ins: sign-in (`privy-stub.js`), the clock (`simtime-stub.js`, one second is one day) and chain reads (`chain-stub.js`, fixed reserve figures). Tier numbers are the app's own.
- The recorders freeze the page clock, step it one frame at a time, and place every CSS animation by hand. The frame rate of the result does not depend on how fast screenshots are taken.
- Each frame is captured until two captures in a row are identical, which removes frames where a layer had not finished painting.
- `demo-ui.js` draws the tap marks, the sign-in sheet and the card sheet. Those two sheets are mock-ups: the app signs in through Privy and has no payment provider connected.

## Run

Needs Playwright with Chromium, and ffmpeg. Neither is a project dependency.

```
npx vite --config tools/overview-capture/vite.capture.config.js     # leave running

node tools/overview-capture/film.cjs home 8           # home screen, 8 seconds
node tools/overview-capture/film.cjs detail 8         # one position
node tools/overview-capture/film.cjs profile 0.2      # profile still: use frame f0005.png
node tools/overview-capture/flow.cjs                  # sign-in and new order, two clips
```

Frames land in `tools/overview-capture/film/<clip>/` (ignored by git). To check a clip for one-frame flicker, from this folder: `python3 flick.py <clip>`.

## Encode

Site video, from this folder:

```
ffmpeg -framerate 30 -i film/home/f%04d.png -c:v libx264 -preset slower -crf 18 \
  -profile:v high -level 4.0 -refs 5 -pix_fmt yuv420p -movflags +faststart -an app-home.mp4
```

Animated image for the hosted copy in `docs/partner/`:

```
ffmpeg -framerate 30 -i film/home/f%04d.png -vf "scale=520:-2:flags=lanczos" \
  -c:v libwebp_anim -lossless 0 -q:v 72 -compression_level 6 -loop 0 app-home.webp
```

Clip names on the page: `app-login`, `app-order`, `app-home`, `app-mine` (the `detail` recording), each with an `-poster.jpg`, and `app-profile.webp`.
