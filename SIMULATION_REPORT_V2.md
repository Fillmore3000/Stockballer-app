# ProSpect Yield Simulation Report V2
## Enhanced Formula with Devaluation Factors

**Generated:** January 30, 2026  
**Total Players Analyzed:** 25

---

## 📊 Enhanced Pricing Formula

```
Price = (Base_Yield - Penalties) × Form_Multiplier × Age_Multiplier
```

### Yield Factors (Positive)
| Action | Payout |
|--------|--------|
| Goal Scored | $0.25 |
| Assist | $0.12 |
| Match Played | $0.02 |
| Clean Sheet (GK/DEF) | $0.10 |

### 🔴 NEW: Penalty Deductions (Negative)
| Risk Factor | Deduction |
|-------------|-----------|
| Yellow Card | -$0.05 |
| Red Card | -$0.50 |
| Penalty Missed | -$0.15 |
| Own Goal | -$0.25 |
| Missed Match | -$0.03/game |

### Form Multiplier
Based on player rating (API-Football):
- Rating 7.5+ → **1.20x - 1.30x** (Excellent form)
- Rating 7.0 - 7.5 → **1.10x - 1.20x** (Good form)
- Rating 6.5 - 7.0 → **1.00x - 1.10x** (Average)
- Rating < 6.5 → **0.70x - 0.95x** (Poor form)

### Age Multipliers
| Age Range | Multiplier | Description |
|-----------|------------|-------------|
| Under 20 | **15x** | High growth potential |
| 20-27 | **12x** | Prime years |
| Over 27 | **8x** | Experience premium |

### Price Bounds
- **Minimum:** $5.00 (floor price)
- **Maximum:** $100.00 (ceiling price)

---

## 🎯 Scenario Summaries

### 1️⃣ MAINTAIN FORM
*Player continues at current rate for rest of season (38 remaining matches)*

| Metric | Value |
|--------|-------|
| Avg Current Price | **$27.36** |
| Avg Projected Price | **$37.88** |
| Avg Price Change | **+$10.52 (+38.4%)** |
| Total Market Cap | $684,021 → $946,981 |

**Top Gainers:**
1. E. Smith Rowe: +1,900%
2. M. Rashford: +434%
3. E. Majetschak: +107%
4. M. Mount: +92%
5. Denis Suárez: +90%

---

### 2️⃣ IMPROVED FORM (+20%)
*Player improves performance by 20%*

| Metric | Value |
|--------|-------|
| Avg Current Price | **$27.36** |
| Avg Projected Price | **$38.70** |
| Avg Price Change | **+$11.34 (+41.4%)** |
| Total Market Cap | $684,021 → $967,403 |

**Top Gainers:**
1. E. Smith Rowe: +1,900%
2. M. Rashford: +492%
3. Cole Palmer: +112%
4. Ollie Watkins: +112%
5. Luis Diaz: +112%

---

### 3️⃣ DECLINED FORM (-30%)
*Player performance drops by 30%*

| Metric | Value |
|--------|-------|
| Avg Current Price | **$27.36** |
| Avg Projected Price | **$36.28** |
| Avg Price Change | **+$8.91 (+32.6%)** |
| Total Market Cap | $684,021 → $906,883 |

**Top Gainers (still positive due to remaining matches):**
1. E. Smith Rowe: +1,900%
2. M. Rashford: +319%
3. Cole Palmer: +93%

**Note:** Even with -30% form decline, players with remaining matches still gain value due to base match yield.

---

### 4️⃣ INJURY (Season-Ending)
*Player is injured and misses remaining matches*

| Metric | Value |
|--------|-------|
| Avg Current Price | **$27.36** |
| Avg Projected Price | **$26.24** |
| Avg Price Change | **-$1.12 (-4.1%)** |
| Total Market Cap | $684,021 → $656,010 |

**Top Losers (Price Drops):**
1. Denis Suárez: **-28.4%** (missed match penalties)
2. M. Mount: **-24.1%**
3. E. Majetschak: **-13.7%**
4. M. Rashford: **-12.8%**
5. B. Saka: **-12.8%**

---

## 📈 Key Formula Insights

### Penalty Impact Examples

**J. Bellingham (tokenId 12):**
- Raw Yield: $3.83
- Yellow Card Penalty: -$0.25 (5 cards × $0.05)
- Red Card Penalty: -$0.50 (1 card × $0.50)
- Penalty Miss Penalty: -$0.15 (1 miss × $0.15)
- **Total Penalties: -$0.90**
- Net Yield: $2.93
- Form Multiplier: 1.15x (rating 7.48)
- Age Multiplier: 12x
- **Final Price: $40.40**

**Bruno Fernandes (tokenId 13):**
- Raw Yield: $3.94
- Yellow Card Penalty: -$0.25 (5 cards)
- Red Card Penalty: **-$1.00** (2 red cards!)
- **Total Penalties: -$1.25**
- Net Yield: $2.69
- Form Multiplier: 1.16x (rating 7.61)
- Age Multiplier: 8x (age 31)
- **Final Price: $24.88**

### Injury Scenario Analysis

When a player gets injured:
1. **No new yield generated** (no goals, assists, matches)
2. **Missed match penalties accumulate** (-$0.03/game × remaining games)
3. **Form multiplier drops** to 1.0x or lower
4. **Price floors at $5.00** (minimum protection)

Example: A player missing 17 matches would incur:
- $0.03 × 17 = **-$0.51 in penalties**

---

## 💰 Dividend Projections

Based on MAINTAIN_FORM scenario:

| Player | Season Dividend | Weekly | Monthly |
|--------|-----------------|--------|---------|
| Mohamed Salah | $12.20 | $0.32 | $1.22 |
| H. Kane | $8.08 | $0.21 | $0.81 |
| Gabriel Martinelli | $6.44 | $0.17 | $0.64 |
| J. Bellingham | $3.83 | $0.10 | $0.38 |
| Bruno Fernandes | $3.94 | $0.10 | $0.39 |

---

## ⚠️ Data Quality Notes

Some players show 0 stats due to API-Football ID mismatches:
- Cole Palmer, Ollie Watkins, Luis Diaz, Moises Caicedo

Wrong players returned:
- M. Saracchi (Boca Juniors) - should be different player
- E. Majetschak (Erzgebirge Aue) - should be different player

**Recommendation:** Update targetPlayers.json with correct API-Football player IDs.

---

## 🔧 Formula Implementation

The enhanced formula now includes:
- ✅ Base yield from goals, assists, matches, clean sheets
- ✅ Yellow card penalties (-$0.05 each)
- ✅ Red card penalties (-$0.50 each)
- ✅ Penalty miss penalties (-$0.15 each)
- ✅ Own goal penalties (-$0.25 each)
- ✅ Missed match penalties (-$0.03 per game)
- ✅ Form multiplier based on player rating (0.7x - 1.3x)
- ✅ Age multiplier (8x, 12x, or 15x)
- ✅ Full breakdown in yieldData.breakdown object

---

*Report generated from SIMULATION_REPORT_V2.json*
