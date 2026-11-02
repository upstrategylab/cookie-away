# Product Hunt launch kit

Everything to paste into https://www.producthunt.com/posts/new. Assets are in this folder.

## Before you launch

1. **Wait for the Chrome Web Store approval.** Product Hunt visitors click once and expect "Add to Chrome". A "load it unpacked from GitHub" install loses most of them. Once it's approved:
   - upload 4.2.4 (`store/cookie-away-4.2.4.zip`) as the first update;
   - ask Claude to switch the site's install button and "in review" tag to the store link.
2. **Self-hunt.** Post it from your own account as the maker. Hunters no longer make much difference.
3. **Schedule it** in the Product Hunt form rather than posting live. A Product Hunt day starts at 00:01 Pacific, which is **09:01 in Stockholm**. Schedule for 00:01 to get the full 24 hours.
4. **Pick the day.** Tuesday to Thursday has the most traffic and the most competition. A small free open-source tool has a better shot at the top five on a Sunday or Monday.
5. **Line up your people, but don't ask for upvotes.** Product Hunt penalises vote rings and direct "please upvote" messages. Send friends and your LinkedIn and X followers the link with "we're live on Product Hunt, I'd love your feedback". Comments count for more than votes anyway.
6. **Be around all day** to answer every comment, especially "doesn't work on site X". Offer to look at it, then fix it in public.

## Listing

**Name:** Cookie Away

**Tagline** (max 60 characters). Pick one:
- Rejects cookie banners for you, even the sneaky ones *(recommended: says what it does)*
- Says no to cookie banners, even three screens deep
- A googly-eyed monster that clicks "Reject" for you *(most fun, says least)*

**Description** (max 260; this is 251):
> Cookie Away is a free, open-source Chrome extension that rejects cookie banners for you. No reject button? It opens the settings, switches everything off and saves. It never pays to say no, checks every click, and we published its results on 69 sites.

**Links:**
- Website: https://www.cookieaway.com
- GitHub: https://github.com/upstrategylab/cookie-away
- Chrome Web Store: add once approved

**Topics:** Chrome Extensions, Privacy, Open Source, Browser Extensions

**Pricing:** Free

**Thumbnail:** `thumbnail-240.gif` (Kooky looks around, then chomps). Use `thumbnail-240.png` if the uploader rejects the GIF.

**Gallery** (1270 × 760), in this order:
1. `gallery-1-hero.png`: "Say no to cookies, nicely."
2. `gallery-2-before-after.png`: TechRadar without and with Cookie Away
3. `gallery-3-how.png`: the three steps
4. `gallery-4-results.png`: the comparison with Consent-O-Matic. Or use `gallery-4b-results-neutral.png`, which shows our own numbers only. Consent-O-Matic is well liked on Product Hunt, so the neutral one is the safer choice; the comparison stays on cookieaway.com/benchmarks.
5. `gallery-5-open.png`: private and open source

**Video** (optional, YouTube or Loom link): the square promo from `promo/out/`. Upload it to YouTube as unlisted and paste the link.

## Maker's first comment

Post this the moment it goes live. It's in your voice; edit freely.

> Hey Product Hunt 👋
>
> Like most people I'd got into the habit of hitting "Accept all" on every cookie banner just to get to the page (the reject button is usually there, it's just been made a lot more work). So I built a small Chrome extension that says no for me, and gave it a mascot called Kooky, because his eyes are all funny and so, frankly, is the whole consent-banner situation.
>
> Clicking reject turned out to be the easy part. A lot of news sites hide it behind a settings screen full of "legitimate interests", some only let you reject if you subscribe, and some even run two consent tools at once. Cookie Away works through the settings when it has to, switches everything off and saves, and on pay-or-accept walls it leaves the choice to you rather than paying or giving in.
>
> I wanted to know whether it actually works, so we tested it against Consent-O-Matic (which is great) on 69 European sites and published every result, misses included. It answered 26 of the 27 banners that had a free "no", and never once ended up on a payment page.
>
> It's free and MIT licensed, with no server and no analytics, and the website doesn't set a single cookie (obviously).
>
> If you find a site where it doesn't work, drop the link in the comments and Kooky will take a look. And if you type "cookie" on the website, something might happen.

## Replies worth having ready

- **"How is this different from I Still Don't Care About Cookies / uBlock annoyances?"** Those hide banners. Hiding doesn't tell the site you said no, and some sites keep tracking until you answer. Cookie Away answers.
- **"And from Consent-O-Matic?"** Consent-O-Matic uses hand-written rules per consent tool and is excellent where it has them. Cookie Away has rules for 27 tools as well, but also reads unknown banners by their wording in about 20 languages, and it never takes a paid route. The full comparison is at cookieaway.com/benchmarks.
- **"Does it send my data anywhere?"** No server and no analytics. The only exception is the optional Jev fallback, which is off by default and uses your own API key.
- **"Firefox / Safari?"** Chromium only for now (Chrome, Edge, Brave, Arc). A Firefox port would be a good first pull request.

## On the day

- [ ] 09:01 Stockholm: check the post is live and post the maker comment
- [ ] Share on LinkedIn and X with the Product Hunt link (the LinkedIn post in `promo/posts.md` works with one line added)
- [ ] Reply to every comment within the hour
- [ ] Turn any "doesn't work on X" into a GitHub issue, and reply with the link once it's fixed
- [ ] Next day: add the Product Hunt badge to the site footer if it placed well
