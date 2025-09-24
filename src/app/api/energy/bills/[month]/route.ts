import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { energyBills } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { month: string } }
) {
  try {
    const monthParam = params.month;

    if (!monthParam) {
      return NextResponse.json({
        error: "Month parameter is required",
        code: "MISSING_MONTH_PARAM"
      }, { status: 400 });
    }

    // Extract YYYY-MM format from parameter
    let monthFormat: string;
    
    // Handle YYYY-MM-DD format (extract YYYY-MM)
    if (monthParam.match(/^\d{4}-\d{2}-\d{2}$/)) {
      monthFormat = monthParam.substring(0, 7); // Extract YYYY-MM
    }
    // Handle YYYY-MM format
    else if (monthParam.match(/^\d{4}-\d{2}$/)) {
      monthFormat = monthParam;
    }
    else {
      return NextResponse.json({
        error: "Invalid month format. Expected YYYY-MM or YYYY-MM-DD",
        code: "INVALID_MONTH_FORMAT"
      }, { status: 400 });
    }

    // Validate month is valid calendar month
    const [year, month] = monthFormat.split('-');
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return NextResponse.json({
        error: "Invalid month. Month must be between 01-12",
        code: "INVALID_MONTH_VALUE"
      }, { status: 400 });
    }

    // Query database for energy bill matching the month
    const bill = await db.select()
      .from(energyBills)
      .where(eq(energyBills.billingMonth, monthFormat))
      .limit(1);

    if (bill.length === 0) {
      return NextResponse.json({
        error: `No energy bill found for month ${monthFormat}`,
        code: "BILL_NOT_FOUND"
      }, { status: 404 });
    }

    // Format monetary values to 2 decimal places
    const formattedBill = {
      ...bill[0],
      basicMonthlyCharge: Number(bill[0].basicMonthlyCharge.toFixed(2)),
      energyChargeTier1Rate: Number(bill[0].energyChargeTier1Rate.toFixed(5)),
      energyChargeTier1Cost: Number(bill[0].energyChargeTier1Cost.toFixed(2)),
      energyChargeTier2Rate: Number(bill[0].energyChargeTier2Rate.toFixed(5)),
      energyChargeTier2Cost: Number(bill[0].energyChargeTier2Cost.toFixed(2)),
      fuelCost: Number(bill[0].fuelCost.toFixed(2)),
      franchiseFee: Number(bill[0].franchiseFee.toFixed(2)),
      grossReceiptsTax: Number(bill[0].grossReceiptsTax.toFixed(2)),
      publicServiceTax: Number(bill[0].publicServiceTax.toFixed(2)),
      totalBillAmount: Number(bill[0].totalBillAmount.toFixed(2))
    };

    return NextResponse.json(formattedBill, { status: 200 });

  } catch (error) {
    console.error('GET energy bill error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error,
      code: "INTERNAL_SERVER_ERROR"
    }, { status: 500 });
  }
}