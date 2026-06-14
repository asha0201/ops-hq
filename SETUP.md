# Operations HQ — setup guide

A calm command centre for your projects, sprints, recurring work, and (optionally) Google Calendar. Your data lives in your own browser. No server is required to run it.

There are three stages. Do them in order. Stage 1 gets you a working app live on the internet. Stages 2 and 3 are optional add-ons you can do later.

---

## Stage 1 — Put it online (about 10 minutes)

You do not need to know how to code. You are just uploading files.

### 1A. Put the files on GitHub
1. Make a free account at https://github.com if you do not have one.
2. Click the **+** (top right) → **New repository**.
3. Name it `ops-hq`. Leave it Public. Click **Create repository**.
4. On the next page click **uploading an existing file**.
5. Drag in every file from this folder: `index.html`, `app.js`, `sw.js`, `manifest.json`, `icon-192.png`, `icon-512.png`. (You do not need to upload this guide.)
6. Click **Commit changes**.

### 1B. Publish it with Netlify
1. Make a free account at https://www.netlify.com — choose **Sign up with GitHub** (simplest).
2. Click **Add new site** → **Import an existing project** → **GitHub**.
3. Pick your `ops-hq` repository.
4. Leave all build settings blank/default and click **Deploy**.
5. After a minute Netlify gives you a live address like `https://your-name-ops-hq.netlify.app`. That is your app. Open it.

That is it — the app works now. Add it to your laptop dock: in Chrome/Edge, open the site, then use the install icon in the address bar ("Install Operations HQ").

To update later: change a file on GitHub (or re-upload), and Netlify redeploys automatically.

---

## Stage 2 — Connect Google Calendar (optional, ~10 minutes one time)

This lets the app push your recurring work to Google Calendar, which then emails and pops up reminders on your laptop. The app talks to Google directly from your browser — no secret keys are stored anywhere.

### 2A. Create a Google OAuth Client ID
1. Go to https://console.cloud.google.com — sign in with the Google account whose calendar you use.
2. Top bar → project dropdown → **New Project** → name it `Ops HQ` → **Create**, then select it.
3. Left menu → **APIs & Services** → **Library**. Search **Google Calendar API** → open it → **Enable**.
4. Left menu → **APIs & Services** → **OAuth consent screen**:
   - User type: **External** → **Create**.
   - App name: `Operations HQ`. Add your email where asked. Save and continue through the steps (you can leave scopes empty). On **Test users**, add your own Google email. Save.
5. Left menu → **Credentials** → **Create Credentials** → **OAuth client ID**:
   - Application type: **Web application**.
   - Under **Authorised JavaScript origins**, click **Add URI** and paste your Netlify address exactly, e.g. `https://your-name-ops-hq.netlify.app` (no trailing slash).
   - Click **Create**. Copy the **Client ID** it shows you (a long string ending in `.apps.googleusercontent.com`).

### 2B. Put the Client ID into the app
1. On GitHub open `index.html` → click the pencil (Edit).
2. Find this line near the bottom:
   ```
   GOOGLE_CLIENT_ID: ""
   ```
3. Paste your Client ID between the quotes:
   ```
   GOOGLE_CLIENT_ID: "1234567890-abcdef.apps.googleusercontent.com"
   ```
4. **Commit changes.** Netlify redeploys in about a minute.
5. Open the app → **Calendar** tab → **Connect Google Calendar** → approve. Then **Add these to my calendar** drops your daily ad-work, evening review, and weekly review in as recurring events with email + popup reminders.

If connecting fails, the usual cause is the Netlify address in step 2A not matching exactly (http vs https, or a trailing slash). Fix it in the Google Console and try again.

---

## Stage 3 — Notion (optional, later)

Notion needs a small secure backend (a Netlify Function) to hold your Notion token, because that token must never sit in front-end code. This is the most advanced step and is deliberately left out for now. When you are ready, ask and it can be added as a `netlify/functions/notion.js` file plus a token stored in Netlify's environment variables.

---

## Everyday use

- **Today** — your daily plan in six parts (critical, deep work, quick wins, follow-ups, monitoring, strategic).
- **Sprints** — current / upcoming / backlog, with You vs Assoc tags for Vasantha.
- **Projects** — full registry; anything untouched 4+ days gets flagged.
- **Recurring** — marks itself "Due now" based on frequency; hit **Done** to reset.
- **Calendar** — push reminders to Google (once Stage 2 is done).

**Back up your data:** Projects tab → **Export backup** saves a file. **Import backup** restores it. Do this occasionally, and before clearing your browser, since the data lives in this browser only.
