# Dividend Portfolio Facts: product spec

## What this is

A tracker for one person's income portfolio. You tell it what you bought and when, it pulls
prices and dividend history from Polygon.io, and it answers five questions a brokerage
statement never quite does:

1. How much money did I actually put in, and how much has come back as dividends?
2. What is the account worth today, cash included, against what I contributed?
3. Which of my shares were bought with dividends, and what would the account look like if I had
   kept those dividends as cash instead?
4. Are my funds paying me out of their own principal? (Net asset value erosion, the covered-call
   ETF problem.)
5. Month by month, when did the money go in and when did it come back?

Everything runs in the browser and saves to localStorage. There is no server, no login, and no
sync. The target user is someone holding dividend stocks, monthly-paying ETFs such as the
YieldMax family, or money market funds alongside them, who wants the numbers and is willing to
type in their lots.

## What it is not

It does not talk to a brokerage. Lots are entered by hand in the Holdings Manager or imported
from a JSON file this app exported earlier. It does not model sells: a lot can be deleted, which
erases it from history, but there is no realized gain, no wash sale, and no cost basis method
other than a blended average. It is not tax software. Prices are previous-day closes, not live
quotes. It is not multi-user; several portfolios can be saved, but they all belong to whoever is
sitting at the browser.

## The data model

A portfolio is two things: a snapshot and a list of purchase lots.

The snapshot holds the account-level facts and a metadata cache per symbol. Account-level:
`asOf`, the `seedAmount` and `seedDate` (the cash you opened the account with), and an
optional `cashPosition`. Per symbol, under `equityMetadata`: name, sector, `currentPrice`, a
list of dividends (each an ex-dividend date and a cash amount per share), and `navHistory`, a
list of monthly closing prices. The share count in the metadata is always zero. Positions are
derived from lots, never stored in the snapshot. Older files used a field called `equities`;
the app renames it on load.

A purchase lot is one buy: symbol, trade date, shares, price per share, and an optional
`fundingSource` of `seed`, `dividend`, or `external`. Shares are floating point, so DRIP
fractions are fine. When the funding source is missing the strategy tab infers it (rules below).

A saved portfolio is a named snapshot plus lots. Any number can live in localStorage; one is
active. The keys are `portfolio-snapshot`, `portfolio-custom-lots`, `saved-portfolios`, and
`active-portfolio-id`.

Four symbols are treated as cash and never sent to the market data API: CASH, SPAXX, FDRXX,
FCASH. You can hold them as lots so the account total is right; they just never get a quote.

## The five tabs

**Portfolio Overview.** Five tiles: market value, cost basis, unrealized P&L, net total return
with its return percentage, and dividends collected with cumulative yield on cost. Below them,
Recent Payouts lists the eight most recent dividend payments and the income received in the
trailing twelve months.

**Equity Performance.** One row per symbol with shares, thirteen sortable numeric columns
(market value, cost basis, unrealized P&L, total return, ROI, NAV peak, current NAV, NAV
erosion, total dividends, yield on cost, last dividend), and an expandable panel with the NAV
metrics and the full dividend history sized by shares owned at each payment.

**Cash Flow & Investment.** The seed tile is editable in place. Tiles for total cash invested,
total dividends received, net cash flow, current cash balance, dividend ROI, and true ROI. Then a
month-by-month table with running totals; each month expands to the individual purchases and
dividend payments, and a dividend can be deleted from there if the data source got it wrong.

**Strategy Analysis.** Compares the account as it is, with dividends reinvested where the lots
say so, against a what-if where every dividend was kept as cash and only the seed- and
external-funded lots were ever bought. Shows the benefit in dollars and in return percentage,
then a row-by-row table. A collapsible section shows how each lot was classified. This tab also
carries a JSON loader that replaces the current portfolio for the session; it duplicates the
Data menu's import and reads as a leftover from development.

**Holdings Manager.** Add, edit, and delete lots. Lots are grouped by symbol with the blended
average cost and total cost per symbol, and each lot shows a funding source badge.

Two controls sit outside the tabs. The Data menu refreshes prices, refreshes dividends,
exports or imports JSON, and clears storage. The portfolio manager creates, saves, switches,
renames, and deletes saved portfolios.

## Data sources and refresh

Prices come from Polygon's previous-close aggregate. Each price refresh also pulls twelve months
of monthly closes for the NAV history, so a refresh costs two calls per symbol. Dividends come
from Polygon's dividends reference filtered to ex-dividend dates on or after the earliest of
your lot dates and your seed date, up to 100 records per symbol. The free tier allows five calls
a minute, which is why the buttons are manual and there is no auto-refresh.

The API key lives in a `VITE_POLYGON_API_KEY` build variable. In development Vite proxies the
calls through `/api/polygon`. In a production build the key is compiled into the JavaScript and
sent from the browser, so anyone who loads the deployed site can read it. That is fine for a
personal deployment behind your own URL and not fine for a shared one.

## How every number is computed

These are the rules the tests pin down. Percentages are carried as percent numbers (9.4, not
0.094) and formatted to one decimal. Currency is formatted to two decimals.

### Which dividends you were owed

The dividend dates from Polygon are ex-dividend dates. A lot earns a dividend only if its trade
date is strictly before the ex-date. Buying on the ex-date does not qualify, which matches how
markets settle it. The shares owned at a dividend are the sum of shares across lots bought before
that date, and the cash received is the amount per share times those shares. Dividends dated on
or before your first lot for that symbol are dropped entirely.

This one rule feeds every tab, which is the point. Before this spec the Overview tab multiplied
every dividend by today's share count, so a position built up over a year showed more dividend
income than the Cash Flow tab did for the same data.

### Per position

- Cost basis is the sum of shares times price across the symbol's lots. Average cost is cost
  basis divided by total shares.
- Market value is total shares times the current price.
- Unrealized P&L is market value minus cost basis.
- Total dividends is the sum of dividends received under the rule above.
- Net total return is market value plus total dividends minus cost basis. ROI is that divided
  by cost basis.
- Yield on cost is total dividends divided by cost basis. It is cumulative since the first lot,
  not annualized, so a position held for three years will show roughly three times the figure of
  one held for one year at the same yield.
- NAV peak is the highest monthly close in the history, or the current price if there is no
  history. Current NAV is the most recent monthly close, which can lag the daily price by up to a
  month. NAV erosion is peak minus current, over peak.
- A symbol that has lots but no quote yet is priced at its most recent trade until you refresh.

### Portfolio totals

Sums of the per-position figures. Portfolio ROI is total return over total cost basis; portfolio
yield on cost is total dividends over total cost basis.

### Trailing twelve-month income

Dividends whose ex-date falls in the window that ends today and opens one year before today,
open at the start and closed at the end. Recent Payouts shows it as a dollar figure; the strategy
tab divides it by market value to get a yield.

### The account

- Contributions are the seed plus the cost of every lot marked as externally funded. This is the
  denominator for every return figure.
- Invested is the cost of all lots.
- Cash balance is contributions minus invested plus dividends received. It goes negative when
  the lots cost more than the money you have told the app about, which is a signal to add a seed
  or mark some lots as external deposits.
- Total account value is market value plus cash balance.
- True ROI is total account value minus contributions, over contributions. Uninvested seed and
  dividends sitting as cash count; before this spec they did not, which penalized anyone who had
  not deployed the whole seed and flattered the reinvestment side of the strategy comparison.
- Dividend ROI is dividends received over contributions.
- When contributions are zero the cash balance and both ROI tiles show a dash and ask for a
  seed, rather than dividing by zero or showing a made-up default.

### Monthly cash flow

Every lot lands in the calendar month of its trade date as cash invested; every dividend lands in
the month of its ex-date as dividends received. Net cash flow for a month is dividends minus
invested, so buying is an outflow. Running totals accumulate oldest to newest. The table's
footer repeats the totals.

### Funding classification

An explicit funding source on a lot always wins. Unlabeled lots are classified in trade-date
order against the seed as a budget: if the whole lot fits in what is left of the seed it is seed
funded and draws the seed down; if it does not fit it is dividend funded and the seed is left
untouched, so a later, smaller lot can still be seed funded. Dividend and external lots never draw
the seed. A lot is never split. The heuristic is only as good as the labels around it; if your
history matters, label the lots.

### Strategy comparison

Both sides use the account arithmetic above with the same contributions. The current side uses
all lots. The collection side uses only the seed- and external-funded lots, and keeps every
dividend those lots earned as cash. The reinvestment benefit is the difference in total account
value, which works out to the reinvested shares at today's price, minus what they cost, plus the
dividends those shares earned along the way. The table also shows, for each side, the dividends
kept as cash, the trailing twelve-month dividends, and that figure over market value as a yield.

## Known limits

Deleting a lot rewrites history; there is no sell. The sample portfolio uses pay dates for its
dividends while live data uses ex-dates, so the sample is a demo, not a reference. A dividend
refresh replaces a symbol's whole dividend list, so a dividend you deleted by hand comes back on
the next refresh. Dates are compared as `YYYY-MM-DD` strings in local time; an export made in one
time zone and imported in another can shift a lot by a day at midnight. The funding inference
cannot know about deposits you never recorded.

## Quality bar

Vitest with jsdom and Testing Library. Coverage thresholds are enforced in CI on lines,
functions, branches, and statements, and the math in this document is asserted with exact,
hand-computed figures against a fixture in `src/test/fixtures.ts`. Prettier and ESLint run on
every commit through lint-staged and again in CI.

## Not planned, or not yet

Charts of income and NAV over time would help and are the most likely next feature. Sells and
realized gains are the largest missing piece of the model and would touch every calculation
above. Multi-currency, tax reports, and benchmark comparison are listed in the README's future
list; none of them has a design.
