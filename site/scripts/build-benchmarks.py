"""Builds site/benchmarks.html and the homepage result numbers from site/data/benchmarks.json.

python3 site/scripts/build-benchmarks.py

The JSON is written by hand from the headless test runs (see "How we test" on the page). Outcome codes:
  rejected      banner gone, consent tool records 0 consents
  gone          banner gone, consent not readable
  up            banner still up
  fixed         missed in the run, fixed in the version released since (re-checked on that site)
  left          pay-or-accept wall left for the reader, no payment page
  refused-wall  refused, then a second accept-or-subscribe screen (consent recorded as refused)
  paypage       clicked through to a subscription or payment page
  accepted      accepted tracking
  blocked       the site blocked the test browser
"""
import html, json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / 'data/benchmarks.json').read_text())
sites = data['sites']

LABEL = {
    'rejected': ('ok', 'Rejected'), 'gone': ('ok', 'Banner gone'), 'fixed': ('warn', 'Missed, fixed since'),
    'up': ('bad', 'Banner stayed'), 'left': ('plain', 'Left for you'), 'refused-wall': ('plain', 'Refused, then a pay wall'),
    'paypage': ('bad', 'Sent to a payment page'), 'accepted': ('bad', 'Accepted tracking'), 'blocked': ('plain', 'Blocked by the site'),
}
GOOD_FREE = {'rejected', 'gone'}

def tally(tool):
    free = [s for s in sites if s['kind'] == 'free' and s[tool] != 'blocked']
    walls = [s for s in sites if s['kind'] == 'wall']
    return {
        'free_ok': sum(s[tool] in GOOD_FREE for s in free), 'free_n': len(free),
        'free_ok_now': sum(s[tool] in GOOD_FREE | {'fixed'} for s in free),
        'wall_safe': sum(s[tool] in {'left', 'refused-wall', 'rejected'} for s in walls), 'wall_n': len(walls),
        'paypage': sum(s[tool] == 'paypage' for s in walls), 'accepted': sum(s[tool] == 'accepted' for s in sites if s[tool]),
    }

ca, com = tally('ca'), tally('com')
tested = sum(s['kind'] in ('free', 'wall') for s in sites)

def tag(code):
    if not code: return '<span class="ca-micro">–</span>'
    cls, text = LABEL[code]
    return f'<span class="ca-tag ca-tag--{cls}{" ca-tag--plain" if cls == "plain" else ""}">{text}</span>'

KIND = {'free': 'Free to reject', 'wall': 'Pay or accept', 'none': 'No banner', 'notice': 'Notice only', 'captcha': 'Blocked us'}
rows = []
for s in sorted(sites, key=lambda s: (['free', 'wall', 'notice', 'none', 'captcha'].index(s['kind']), s['site'])):
    rows.append(f'<tr data-kind="{s["kind"]}"><td>{html.escape(s["site"])}</td><td>{KIND[s["kind"]]}</td><td>{tag(s.get("ca"))}</td><td>{tag(s.get("com"))}</td><td class="ca-micro">{html.escape(s.get("note", ""))}</td></tr>')

page = (ROOT / 'benchmarks.template.html').read_text()
fill = {
    'TESTED': tested, 'ALL': len(sites), 'DATE': data['date'], 'CA_VERSION': data['cookieAway'], 'COM_VERSION': data['consentOMatic'],
    'CA_FREE': f'{ca["free_ok"]} of {ca["free_n"]}', 'COM_FREE': f'{com["free_ok"]} of {com["free_n"]}',
    'CA_FREE_NOW': f'{ca["free_ok_now"]} of {ca["free_n"]}',
    'CA_WALL': f'{ca["wall_safe"]} of {ca["wall_n"]}', 'COM_WALL': f'{com["wall_safe"]} of {com["wall_n"]}',
    'CA_PAY': ca['paypage'], 'COM_PAY': com['paypage'], 'CA_ACC': ca['accepted'], 'COM_ACC': com['accepted'],
    'ROWS': '\n        '.join(rows), 'UNSEEN_CA': data['firstRunUnseen']['ca'], 'UNSEEN_COM': data['firstRunUnseen']['com'],
}
for k, v in fill.items(): page = page.replace('{{' + k + '}}', str(v))
assert '{{' not in page, re.findall(r'{{\w+}}', page)
(ROOT / 'benchmarks.html').write_text(page)

# Homepage numbers
ix = (ROOT / 'index.html').read_text()
for k, v in {'free': f'{ca["free_ok_now"]}/{ca["free_n"]}', 'wall': f'{ca["wall_safe"]}/{ca["wall_n"]}', 'pay': str(ca['paypage']), 'tested': str(len(sites))}.items():
    ix = re.sub(rf'(<[^>]+data-bench="{k}"[^>]*>).*?(</)', rf'\g<1>{v}\g<2>', ix, count=0, flags=re.S)
(ROOT / 'index.html').write_text(ix)
print(json.dumps({'cookieAway': ca, 'consentOMatic': com, 'tested': tested}, indent=1))
