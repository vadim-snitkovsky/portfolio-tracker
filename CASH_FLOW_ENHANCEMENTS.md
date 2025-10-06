# Cash Flow Report Enhancements

## ✅ Features Added

### 1. **Editable Initial Seed** ✏️

**Feature**: Click the pencil icon on the "Initial Seed" tile to edit the seed amount and date.

**How it works**:
- Pencil icon appears in the top-right corner of the Initial Seed tile
- Click to enter edit mode
- Enter new seed amount and date
- Click "Save" to persist changes or "Cancel" to discard

**Implementation**:
- Added state management for edit mode
- Inline form with amount and date inputs
- Updates stored in `portfolioStore` via `setSnapshot()`
- Changes persist to localStorage

---

### 2. **Dividend ROI Tile** 📊

**Metric**: `Dividends / Initial Seed`

**What it shows**:
- Percentage return on your initial investment from dividends alone
- Example: If you seeded $90,000 and received $5,000 in dividends, ROI = 5.56%

**Formula**:
```typescript
dividendROI = (totalDividends / seedAmount) * 100
```

**Display**:
- Shows as percentage with + sign for positive returns
- Subtitle: "Dividends / Initial Seed"
- Always shows as positive trend (green)

---

### 3. **True ROI Tile** 📈

**Metric**: `(Current Portfolio Value - Initial Seed) / Initial Seed`

**What it shows**:
- Total return on investment including both unrealized gains and dividends
- Accounts for current market value vs. what you started with

**Formula**:
```typescript
trueROI = ((currentPortfolioValue - seedAmount) / seedAmount) * 100
```

**Display**:
- Shows as percentage with +/- sign
- Green for positive, red for negative
- Subtitle: "(Portfolio Value - Seed) / Seed"
- Color-coded trend indicator

**Example**:
- Initial Seed: $90,000
- Current Portfolio Value: $105,000
- True ROI: +16.67%

---

### 4. **Current Cash Balance Tile** 💰

**Metric**: `Initial Seed - Total Invested + Total Dividends`

**What it shows**:
- How much cash you have available (not invested in stocks)
- Tracks your uninvested capital

**Formula**:
```typescript
currentCashBalance = seedAmount - totalCashInvested + totalDividends
```

**Display**:
- Shows as currency amount
- Subtitle: "Seed - Invested + Dividends"

**Example**:
- Initial Seed: $90,000
- Total Invested: $85,000
- Total Dividends: $5,000
- Current Cash Balance: $10,000

---

## 📊 Updated Metrics Grid

The Cash Flow Report now shows **6 tiles** in this order:

1. **Initial Seed** (editable ✏️)
2. **Total Cash Invested**
3. **Total Dividends Received**
4. **Net Cash Flow**
5. **Current Cash Balance** (NEW)
6. **Dividend ROI** (NEW)
7. **True ROI** (NEW)

---

## 🔧 Technical Implementation

### State Management

```typescript
// Added to CashFlowReport component
const [isEditingSeed, setIsEditingSeed] = useState(false);
const [editSeedAmount, setEditSeedAmount] = useState('');
const [editSeedDate, setEditSeedDate] = useState('');
```

### Store Integration

```typescript
// Uses existing setSnapshot method
const setSnapshot = usePortfolioStore(state => state.setSnapshot);

// Updates snapshot with new seed values
setSnapshot({
  ...snapshot,
  seedAmount: newSeedAmount,
  seedDate: editSeedDate,
});
```

### Portfolio Value Calculation

```typescript
// Calculate current portfolio value
const currentPortfolioValue = useMemo(() => {
  const activePositions = equityViews
    .map(view => view.position)
    .filter(position => position.shares > 0);
  const metrics = calculatePortfolioMetrics(activePositions);
  return metrics.totalMarketValue;
}, [equityViews]);
```

### New Metrics in Totals

```typescript
const totals = useMemo(() => {
  // ... existing calculations ...
  
  // New calculations
  const dividendROI = seedAmount > 0 ? (totalDividends / seedAmount) * 100 : 0;
  const trueROI = seedAmount > 0 ? ((currentPortfolioValue - seedAmount) / seedAmount) * 100 : 0;
  const currentCashBalance = seedAmount - totalCashInvested + totalDividends;

  return {
    // ... existing metrics ...
    dividendROI,
    trueROI,
    currentCashBalance,
  };
}, [monthlyData, seedAmount, currentPortfolioValue]);
```

---

## 🎨 UI/UX Features

### Edit Mode UI

- **Pencil Icon**: Small, subtle, appears on hover
- **Inline Editing**: No modal, edits happen in place
- **Save/Cancel Buttons**: Clear actions with color coding
- **Input Validation**: Number input for amount, date picker for date

### Visual Indicators

- **Positive ROI**: Green color (`var(--color-positive)`)
- **Negative ROI**: Red color (`var(--color-negative)`)
- **Trend Labels**: Descriptive formulas for clarity

---

## 📈 Use Cases

### 1. **Track Dividend Income Performance**
Use **Dividend ROI** to see what percentage of your initial investment you've earned back through dividends alone.

### 2. **Monitor Total Investment Performance**
Use **True ROI** to see your overall return including both market gains and dividends.

### 3. **Manage Cash Reserves**
Use **Current Cash Balance** to know how much uninvested cash you have available for new purchases.

### 4. **Adjust Initial Seed**
If you add more capital to your account, update the **Initial Seed** to keep metrics accurate.

---

## 🔄 Data Flow

```
User clicks pencil icon
  ↓
Edit mode activated
  ↓
User enters new values
  ↓
User clicks Save
  ↓
setSnapshot() called
  ↓
portfolioStore updated
  ↓
localStorage persisted
  ↓
UI re-renders with new values
  ↓
All metrics recalculated
```

---

## ✅ Testing

All existing tests pass:
- ✅ 223 tests passing
- ✅ Build successful
- ✅ Linting clean
- ✅ No TypeScript errors

---

## 🚀 Future Enhancements

Potential additions:
- **Historical ROI Chart**: Track ROI over time
- **Multiple Seed Deposits**: Support adding capital at different dates
- **Cash Flow Projections**: Predict future dividends based on current holdings
- **Export to CSV**: Download cash flow data

---

## 📝 Summary

**What Changed**:
- ✅ Initial Seed is now editable with pencil icon
- ✅ Added Dividend ROI metric (dividends / seed)
- ✅ Added True ROI metric (portfolio value vs seed)
- ✅ Added Current Cash Balance metric (uninvested cash)
- ✅ All metrics update reactively when seed changes

**Benefits**:
- Better understanding of investment performance
- Track both dividend income and total returns
- Manage cash reserves effectively
- Flexible seed amount for capital additions

**Your Cash Flow Report is now a comprehensive investment tracking dashboard! 📊**

