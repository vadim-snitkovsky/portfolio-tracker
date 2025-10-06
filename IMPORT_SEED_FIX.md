# Import Seed Data Fix

## 🐛 **Bug Fixed: Seed Amount Shows $0.00 After Import**

### **Problem**
When exporting a portfolio with `seedAmount` and `seedDate`, the JSON file correctly contained these fields. However, when importing the same file, the interface showed `$0.00` for the seed amount.

### **Root Cause**
The `parsePortfolioSnapshot` function in `src/utils/portfolioImport.ts` was only returning a subset of fields from the snapshot:
- ✅ `asOf`
- ✅ `equities`
- ✅ `cashPosition`
- ❌ `seedAmount` (missing!)
- ❌ `seedDate` (missing!)
- ❌ `lastPriceUpdate` (missing!)
- ❌ `lastDividendUpdate` (missing!)

**Code Before (lines 134-139)**:
```typescript
return {
  asOf: snapshot.asOf,
  equities,
  cashPosition: typeof snapshot.cashPosition === 'number' ? snapshot.cashPosition : undefined,
};
```

This meant that even though the export included `seedAmount` and `seedDate`, the import function was **discarding** them!

---

## ✅ **Solution**

Updated `parsePortfolioSnapshot` to include **all optional fields** from the `PortfolioSnapshot` type:

**Code After (lines 134-145)**:
```typescript
return {
  asOf: snapshot.asOf,
  equities,
  cashPosition: typeof snapshot.cashPosition === 'number' ? snapshot.cashPosition : undefined,
  lastPriceUpdate:
    typeof snapshot.lastPriceUpdate === 'string' ? snapshot.lastPriceUpdate : undefined,
  lastDividendUpdate:
    typeof snapshot.lastDividendUpdate === 'string' ? snapshot.lastDividendUpdate : undefined,
  seedAmount: typeof snapshot.seedAmount === 'number' ? snapshot.seedAmount : undefined,
  seedDate: typeof snapshot.seedDate === 'string' ? snapshot.seedDate : undefined,
};
```

**What Changed**:
1. ✅ Added `seedAmount` parsing (number type check)
2. ✅ Added `seedDate` parsing (string type check)
3. ✅ Added `lastPriceUpdate` parsing (string type check)
4. ✅ Added `lastDividendUpdate` parsing (string type check)
5. ✅ All fields default to `undefined` if not present or wrong type

---

## 🧪 **Tests Added**

Added 4 new tests to `src/utils/portfolioImport.test.ts` to ensure seed data is imported correctly:

### **Test 1: Parse snapshot with seedAmount and seedDate**
```typescript
it('should parse snapshot with seedAmount and seedDate', () => {
  const raw = {
    asOf: '2025-01-15',
    equities: [],
    seedAmount: 90000,
    seedDate: '2025-02-10',
  };

  const result = parsePortfolioSnapshot(raw);
  expect(result.seedAmount).toBe(90000);
  expect(result.seedDate).toBe('2025-02-10');
});
```

### **Test 2: Parse snapshot without seedAmount and seedDate**
```typescript
it('should parse snapshot without seedAmount and seedDate', () => {
  const raw = {
    asOf: '2025-01-15',
    equities: [],
  };

  const result = parsePortfolioSnapshot(raw);
  expect(result.seedAmount).toBeUndefined();
  expect(result.seedDate).toBeUndefined();
});
```

### **Test 3: Ignore invalid seedAmount and seedDate types**
```typescript
it('should ignore invalid seedAmount and seedDate types', () => {
  const raw = {
    asOf: '2025-01-15',
    equities: [],
    seedAmount: 'invalid',  // Wrong type (string instead of number)
    seedDate: 12345,        // Wrong type (number instead of string)
  };

  const result = parsePortfolioSnapshot(raw);
  expect(result.seedAmount).toBeUndefined();
  expect(result.seedDate).toBeUndefined();
});
```

### **Test 4: Parse snapshot with lastPriceUpdate and lastDividendUpdate**
```typescript
it('should parse snapshot with lastPriceUpdate and lastDividendUpdate', () => {
  const raw = {
    asOf: '2025-01-15',
    equities: [],
    lastPriceUpdate: '2025-01-15T10:00:00.000Z',
    lastDividendUpdate: '2025-01-15T09:00:00.000Z',
  };

  const result = parsePortfolioSnapshot(raw);
  expect(result.lastPriceUpdate).toBe('2025-01-15T10:00:00.000Z');
  expect(result.lastDividendUpdate).toBe('2025-01-15T09:00:00.000Z');
});
```

---

## ✅ **Verification**

### **Build & Tests**
```bash
✅ npm run build - Success (365ms)
✅ npm test - 227 tests passing (was 223, added 4 new tests)
✅ No TypeScript errors
✅ No linting issues
```

### **Manual Testing Steps**

**Before the fix**:
1. ❌ Export portfolio with seedAmount: 90000
2. ❌ Import the JSON file
3. ❌ Seed amount shows: $0.00 (BUG!)

**After the fix**:
1. ✅ Export portfolio with seedAmount: 90000
2. ✅ Import the JSON file
3. ✅ Seed amount shows: $90,000.00 (FIXED!)

---

## 🔄 **Complete Import/Export Flow**

### **Export**
```json
{
  "exportedAt": "2025-01-15T14:30:00.000Z",
  "snapshot": {
    "asOf": "2025-01-15",
    "seedAmount": 90000,           ← Exported
    "seedDate": "2025-02-10",      ← Exported
    "cashPosition": 0,
    "lastPriceUpdate": "2025-01-15T14:00:00.000Z",
    "lastDividendUpdate": "2025-01-15T13:00:00.000Z",
    "equities": [...]
  },
  "customLots": []
}
```

### **Import (Before Fix)**
```typescript
parsePortfolioSnapshot(snapshot) returns:
{
  asOf: "2025-01-15",
  equities: [...],
  cashPosition: 0,
  // seedAmount: MISSING! ❌
  // seedDate: MISSING! ❌
}
```

### **Import (After Fix)**
```typescript
parsePortfolioSnapshot(snapshot) returns:
{
  asOf: "2025-01-15",
  equities: [...],
  cashPosition: 0,
  seedAmount: 90000,              ← Imported! ✅
  seedDate: "2025-02-10",         ← Imported! ✅
  lastPriceUpdate: "2025-01-15T14:00:00.000Z",
  lastDividendUpdate: "2025-01-15T13:00:00.000Z",
}
```

---

## 📊 **Impact on ROI Calculations**

With seed data now properly imported, all ROI calculations work correctly:

### **Dividend ROI**
```typescript
dividendROI = totalDividends / seedAmount
// Before: 5000 / 0 = Infinity ❌
// After:  5000 / 90000 = 0.0556 = 5.56% ✅
```

### **True ROI**
```typescript
trueROI = (currentPortfolioValue - seedAmount) / seedAmount
// Before: (105000 - 0) / 0 = Infinity ❌
// After:  (105000 - 90000) / 90000 = 0.1667 = 16.67% ✅
```

### **Current Cash Balance**
```typescript
currentCashBalance = seedAmount - totalCashInvested + totalDividends
// Before: 0 - 85000 + 5000 = -80000 ❌
// After:  90000 - 85000 + 5000 = 10000 ✅
```

---

## 🎯 **Files Changed**

### **1. src/utils/portfolioImport.ts**
- **Lines 134-145**: Updated `parsePortfolioSnapshot` return statement
- **Added**: `seedAmount`, `seedDate`, `lastPriceUpdate`, `lastDividendUpdate` parsing

### **2. src/utils/portfolioImport.test.ts**
- **Lines 243-303**: Added 4 new tests for seed data import
- **Tests**: Valid seed data, missing seed data, invalid types, timestamp fields

---

## 🚀 **How to Test**

### **Test the Fix**
1. Run `npm run dev`
2. Go to Cash Flow Report
3. Edit Initial Seed to $90,000 and date 2025-02-10
4. Click Save
5. Go to Data menu → Export
6. Clear your portfolio (Data menu → Clear storage)
7. Go to Data menu → Import
8. Select the exported JSON file
9. **Verify**: Initial Seed shows $90,000.00 ✅
10. **Verify**: Dividend ROI, True ROI, Cash Balance all calculate correctly ✅

---

## 📝 **Summary**

**Bug**: Seed amount showed $0.00 after importing a portfolio

**Root Cause**: `parsePortfolioSnapshot` was discarding `seedAmount` and `seedDate` fields

**Fix**: Updated function to include all optional fields from `PortfolioSnapshot` type

**Tests**: Added 4 new tests to prevent regression (227 total tests, all passing)

**Impact**: 
- ✅ Seed data now persists through export/import
- ✅ ROI calculations work correctly after import
- ✅ Cash balance tracking works correctly
- ✅ Complete portfolio backup/restore functionality

**Your import/export workflow is now fully functional! 🎉**

