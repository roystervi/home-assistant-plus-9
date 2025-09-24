import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { energyReadings, energyBills } from '@/db/schema';
import { eq, like, sum, gte, lte, and } from 'drizzle-orm';

// Helper function to get actual days in a month
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// Helper function to check if a year is a leap year
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

// Helper function to calculate custom billing period dates
function getCustomBillingPeriodDates(billingMonth: string, startDay: number, endDay: number) {
  const [year, month] = billingMonth.split('-').map(Number);
  
  // Start date
  const startDate = new Date(year, month - 1, startDay);
  
  // Calculate end date
  let endYear = year;
  let endMonth = month;
  let actualEndDay = endDay;
  
  // If end day is less than start day, it's in the next month
  if (endDay < startDay) {
    endMonth += 1;
    if (endMonth > 12) {
      endMonth = 1;
      endYear += 1;
    }
  }
  
  // Adjust end day for months with fewer days
  const daysInEndMonth = new Date(endYear, endMonth, 0).getDate();
  if (actualEndDay > daysInEndMonth) {
    actualEndDay = daysInEndMonth;
  }
  
  const endDate = new Date(endYear, endMonth - 1, actualEndDay);
  
  // Calculate actual days billed
  const timeDiff = endDate.getTime() - startDate.getTime();
  const daysBilled = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates
  
  return {
    startDate,
    endDate,
    daysBilled,
    startDateString: startDate.toISOString().split('T')[0],
    endDateString: endDate.toISOString().split('T')[0]
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { month: string } }
) {
  try {
    const { month } = params;
    const { searchParams } = new URL(request.url);
    const shouldSave = searchParams.get('save') === 'true';
    
    // Custom billing period parameters
    const customPeriod = searchParams.get('customPeriod') === 'true';
    const providedStartDate = searchParams.get('startDate');
    const providedEndDate = searchParams.get('endDate');
    const startDay = parseInt(searchParams.get('startDay') || '1');
    const endDay = parseInt(searchParams.get('endDay') || '31');

    // Validate month format (YYYY-MM)
    const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!monthRegex.test(month)) {
      return NextResponse.json({
        error: 'Invalid month format. Expected YYYY-MM (e.g., 2024-12)',
        code: 'INVALID_MONTH_FORMAT'
      }, { status: 400 });
    }

    let daysBilled: number;
    let dateRangeQuery: any;
    let dateRangeInfo: any;

    if (customPeriod && providedStartDate && providedEndDate) {
      // Use provided custom date range
      daysBilled = Math.ceil((new Date(providedEndDate).getTime() - new Date(providedStartDate).getTime()) / (1000 * 3600 * 24)) + 1;
      dateRangeQuery = and(
        gte(energyReadings.readingDate, providedStartDate),
        lte(energyReadings.readingDate, providedEndDate)
      );
      dateRangeInfo = {
        startDate: providedStartDate,
        endDate: providedEndDate,
        daysBilled,
        isCustomPeriod: true
      };
    } else if (customPeriod && startDay && endDay) {
      // Calculate custom billing period dates
      const customDates = getCustomBillingPeriodDates(month, startDay, endDay);
      daysBilled = customDates.daysBilled;
      dateRangeQuery = and(
        gte(energyReadings.readingDate, customDates.startDateString),
        lte(energyReadings.readingDate, customDates.endDateString)
      );
      dateRangeInfo = {
        startDate: customDates.startDateString,
        endDate: customDates.endDateString,
        daysBilled,
        isCustomPeriod: true,
        customPeriodDays: `${startDay}-${endDay}`
      };
    } else {
      // Use calendar month (original behavior)
      const [yearStr, monthStr] = month.split('-');
      const year = parseInt(yearStr);
      const monthNum = parseInt(monthStr);
      daysBilled = getDaysInMonth(year, monthNum);
      dateRangeQuery = like(energyReadings.readingDate, `${month}%`);
      dateRangeInfo = {
        startDate: `${month}-01`,
        endDate: `${month}-${daysBilled.toString().padStart(2, '0')}`,
        daysBilled,
        isCustomPeriod: false
      };
    }

    // Query energy readings for the specified period
    const readings = await db.select()
      .from(energyReadings)
      .where(dateRangeQuery);

    if (readings.length === 0) {
      return NextResponse.json({
        error: `No energy readings found for ${customPeriod ? 'custom billing period' : `month ${month}`}`,
        code: 'NO_READINGS_FOUND',
        period: dateRangeInfo
      }, { status: 404 });
    }

    // Calculate total kWh usage for the period
    const totalKwh = readings.reduce((sum, reading) => {
      return sum + (reading.monthlyKwh || reading.dailyKwh || 0);
    }, 0);

    if (totalKwh <= 0) {
      return NextResponse.json({
        error: `No valid kWh usage found for ${customPeriod ? 'custom billing period' : `month ${month}`}`,
        code: 'NO_USAGE_DATA',
        period: dateRangeInfo
      }, { status: 404 });
    }

    // Rate constants
    const BASIC_MONTHLY_CHARGE = 17.50;
    const TIER1_RATE = 0.06846;
    const TIER2_RATE = 0.08346;
    const TIER1_LIMIT = 1000;
    const FUEL_COST_RATE = 0.025;
    const FRANCHISE_FEE_RATE = 0.035;
    const GROSS_RECEIPTS_TAX_RATE = 0.045;
    const PUBLIC_SERVICE_TAX = 2.50;

    // Calculate bill components
    let basicMonthlyCharge = BASIC_MONTHLY_CHARGE;
    
    // Pro-rate basic monthly charge if custom period doesn't align with calendar month
    if (customPeriod && daysBilled !== getDaysInMonth(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]))) {
      const [year, monthNum] = month.split('-').map(Number);
      const calendarDays = getDaysInMonth(year, monthNum);
      basicMonthlyCharge = (BASIC_MONTHLY_CHARGE * daysBilled) / calendarDays;
    }
    
    // Tier 1 calculation (first 1000 kWh)
    const tier1Kwh = Math.min(totalKwh, TIER1_LIMIT);
    const tier1Cost = tier1Kwh * TIER1_RATE;
    
    // Tier 2 calculation (kWh above 1000)
    const tier2Kwh = Math.max(0, totalKwh - TIER1_LIMIT);
    const tier2Cost = tier2Kwh * TIER2_RATE;
    
    // Fuel cost (2.5% of energy charges)
    const energyCharges = tier1Cost + tier2Cost;
    const fuelCost = energyCharges * FUEL_COST_RATE;
    
    // Franchise fee (3.5% of energy + fuel costs)
    const franchiseFee = (energyCharges + fuelCost) * FRANCHISE_FEE_RATE;
    
    // Subtotal before taxes
    const subtotal = basicMonthlyCharge + energyCharges + fuelCost + franchiseFee;
    
    // Gross receipts tax (4.5% of subtotal)
    const grossReceiptsTax = subtotal * GROSS_RECEIPTS_TAX_RATE;
    
    // Public service tax (fixed amount, pro-rated for custom periods)
    let publicServiceTax = PUBLIC_SERVICE_TAX;
    if (customPeriod && daysBilled !== getDaysInMonth(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]))) {
      const [year, monthNum] = month.split('-').map(Number);
      const calendarDays = getDaysInMonth(year, monthNum);
      publicServiceTax = (PUBLIC_SERVICE_TAX * daysBilled) / calendarDays;
    }
    
    // Total bill amount
    const totalBillAmount = subtotal + grossReceiptsTax + publicServiceTax;

    // Calculate daily averages based on actual days in period
    const dailyKwhAverage = totalKwh / daysBilled;
    const dailyCostAverage = totalBillAmount / daysBilled;

    // Get date range of readings
    const readingDates = readings.map(r => r.readingDate).sort();
    const [year, monthNum] = month.split('-').map(Number);
    
    const dateRange = {
      start: dateRangeInfo.startDate,
      end: dateRangeInfo.endDate,
      count: readings.length,
      daysBilled: daysBilled,
      isLeapYear: isLeapYear(year),
      monthName: new Date(year, monthNum - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      isCustomPeriod: customPeriod,
      customPeriodInfo: customPeriod ? {
        startDay,
        endDay,
        actualStartDate: dateRangeInfo.startDate,
        actualEndDate: dateRangeInfo.endDate,
        daysBilled
      } : null
    };

    // Bill calculation breakdown
    const billBreakdown = {
      billingMonth: month,
      daysBilled: daysBilled,
      totalKwhUsed: Math.round(totalKwh * 100) / 100,
      dailyAverages: {
        kwhPerDay: Math.round(dailyKwhAverage * 100) / 100,
        costPerDay: Math.round(dailyCostAverage * 100) / 100
      },
      calculation: {
        basicMonthlyCharge: Math.round(basicMonthlyCharge * 100) / 100,
        energyCharges: {
          tier1: {
            kwh: Math.round(tier1Kwh * 100) / 100,
            rate: TIER1_RATE,
            cost: Math.round(tier1Cost * 100) / 100
          },
          tier2: {
            kwh: Math.round(tier2Kwh * 100) / 100,
            rate: TIER2_RATE,
            cost: Math.round(tier2Cost * 100) / 100
          },
          totalEnergyCost: Math.round(energyCharges * 100) / 100
        },
        fuelCost: {
          rate: FUEL_COST_RATE,
          amount: Math.round(fuelCost * 100) / 100
        },
        franchiseFee: {
          rate: FRANCHISE_FEE_RATE,
          amount: Math.round(franchiseFee * 100) / 100
        },
        subtotal: Math.round(subtotal * 100) / 100,
        grossReceiptsTax: {
          rate: GROSS_RECEIPTS_TAX_RATE,
          amount: Math.round(grossReceiptsTax * 100) / 100
        },
        publicServiceTax: Math.round(publicServiceTax * 100) / 100,
        totalBillAmount: Math.round(totalBillAmount * 100) / 100
      },
      sourceData: {
        readingsCount: readings.length,
        dateRange: dateRange,
        entities: [...new Set(readings.map(r => r.friendlyName))]
      }
    };

    // Handle save functionality if requested
    if (shouldSave) {
      // Check if bill already exists for this month
      const existingBill = await db.select()
        .from(energyBills)
        .where(eq(energyBills.billingMonth, month))
        .limit(1);

      if (existingBill.length > 0) {
        return NextResponse.json({
          error: `Bill for month ${month} already exists`,
          code: 'BILL_ALREADY_EXISTS',
          existingBill: existingBill[0]
        }, { status: 409 });
      }

      // Save the calculated bill
      const newBill = await db.insert(energyBills)
        .values({
          billingMonth: month,
          totalKwhUsed: Math.round(totalKwh * 100) / 100,
          basicMonthlyCharge: Math.round(basicMonthlyCharge * 100) / 100,
          energyChargeTier1Kwh: Math.round(tier1Kwh * 100) / 100,
          energyChargeTier1Rate: TIER1_RATE,
          energyChargeTier1Cost: Math.round(tier1Cost * 100) / 100,
          energyChargeTier2Kwh: Math.round(tier2Kwh * 100) / 100,
          energyChargeTier2Rate: TIER2_RATE,
          energyChargeTier2Cost: Math.round(tier2Cost * 100) / 100,
          fuelCost: Math.round(fuelCost * 100) / 100,
          franchiseFee: Math.round(franchiseFee * 100) / 100,
          grossReceiptsTax: Math.round(grossReceiptsTax * 100) / 100,
          publicServiceTax: Math.round(publicServiceTax * 100) / 100,
          totalBillAmount: Math.round(totalBillAmount * 100) / 100,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .returning();

      return NextResponse.json({
        ...billBreakdown,
        saved: true,
        billRecord: newBill[0]
      }, { status: 201 });
    }

    return NextResponse.json(billBreakdown);

  } catch (error) {
    console.error('GET energy bill calculation error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}