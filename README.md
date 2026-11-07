# Medic

A home-screen web app for a firefighter/paramedic: training that plans itself around the shift rotation. No accounts, no server, works offline. Everything is saved on the phone it's used on.

| App | What it does |
| --- | --- |
| 💪 **Fitness** | A training program built around your shifts. On shift: a 20-minute "between calls" workout you can drop when the tones go. The day after a 24: recovery (walk, mobility, sleep reset). Days off: strength, intervals and a fireground circuit, until the week's target is hit. Tick sets, record weights (it shows last time's), rate effort, and track benchmarks (body weight, push-ups, plank, 1.5-mile run, resting heart rate). |
| 🚒 **Shifts** | Your rotation (24/48, 48/96, Kelly, 3-in-9, 12s or custom) with trades, overtime and time off. Add it to your phone calendar, or **send it to Compass** so the household calendar stays in step. |

**Coming next:** rig checks, an offline protocol reference, and recovery tools (sleep after nights, a private decompression journal).

## How the training works

- **Level** sets the dose and the weekly target: getting back into it (3 sessions, 2 sets), training now and then (4, 3 sets), already training (5, 4 sets).
- **Goals** set the order of sessions. Weight loss or conditioning adds an extra interval day; job-specific puts the fireground circuit earlier.
- **Equipment** picks each exercise's version: full gym, dumbbells/kettlebell, or bodyweight. On shift it uses the station gym if you have one.
- Missed days don't skip ahead: the next session is always the one after the last you finished. You can swap today's session for any other.
- If you note an injury, it's shown on every workout as a reminder. This is a general program, not medical advice: stop anything that hurts sharply or keeps getting worse, and clear new training with your doctor if you've had heart or blood pressure problems.

## Putting it online

1. On GitHub, open this repo → **Settings → Pages**.
2. **Source:** *Deploy from a branch*, pick the branch and `/ (root)`, **Save**.
3. After a minute it's live at `https://hecticmedic.github.io/medic/`.
4. On your phone, open that link and **Add to Home Screen** (Safari → Share on iPhone; Chrome → ⋮ on Android).

## Sending shifts to Compass

Medic → Shifts → **🏠 Send rotation to Compass** makes a link. On the Compass phone, copy the link, then open Compass → Shifts → Rotation → **📋 Paste shift link**. Send it again after a trade or overtime so both calendars match.

## Privacy

The code here is public; your data isn't. Workouts, weights, benchmarks and shifts stay in the phone's browser storage. **Save backup** downloads a file to the phone. Never upload a backup to this repo.
