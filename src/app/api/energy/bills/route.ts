import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { energyBills } from '@/db/schema';
import { eq, like, and, or, desc, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '6'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const id = searchParams.get('id');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    // Single record fetch
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const record = await db.select()
        .from(energyBills)
        .where(eq(energyBills.id, parseInt(id)))
        .limit(1);

      if (record.length === 0) {
        return NextResponse.json({ error: 'Energy bill not found' }, { status: 404 });
      }

      return NextResponse.json(record[0]);
    }

    // List with filtering
    let query = db.select().from(energyBills);
    let whereConditions = [];

    // Filter by specific month
    if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return NextResponse.json({ 
          error: "Month must be in format YYYY-MM",
          code: "INVALID_MONTH_FORMAT" 
        }, { status: 400 });
      }
      whereConditions.push(eq(energyBills.billingMonth, month));
    }

    // Filter by year
    if (year) {
      if (!/^\d{4}$/.test(year)) {
        return NextResponse.json({ 
          error: "Year must be in format YYYY",
          code: "INVALID_YEAR_FORMAT" 
        }, { status: 400 });
      }
      whereConditions.push(like(energyBills.billingMonth, `${year}-%`));
    }

    // Apply filters if any
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }

    // Default to last 6 months if no specific filters and no pagination params
    if (!month && !year && !searchParams.get('limit') && !searchParams.get('offset')) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const sixMonthsAgoStr = sixMonthsAgo.toISOString().substring(0, 7); // YYYY-MM format
      
      query = query.where(energyBills.billingMonth >= sixMonthsAgoStr);
    }

    const results = await query
      .orderBy(desc(energyBills.billingMonth))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results);

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const { 
      billingMonth, 
      totalKwhUsed,
      basicMonthlyCharge,
      energyChargeTier1Kwh,
      energyChargeTier1Rate,
      energyChargeTier1Cost,
      energyChargeTier2Kwh,
      energyChargeTier2Rate,
      energyChargeTier2Cost,
      fuelCost,
      franchiseFee,
      grossReceiptsTax,
      publicServiceTax,
      totalBillAmount
    } = requestBody;

    // Validate required fields
    if (!billingMonth) {
      return NextResponse.json({ 
        error: "Billing month is required",
        code: "MISSING_BILLING_MONTH" 
      }, { status: 400 });
    }

    if (totalKwhUsed === undefined || totalKwhUsed === null) {
      return NextResponse.json({ 
        error: "Total kWh used is required",
        code: "MISSING_TOTAL_KWH" 
      }, { status: 400 });
    }

    // Validate billing month format
    if (!/^\d{4}-\d{2}$/.test(billingMonth)) {
      return NextResponse.json({ 
        error: "Billing month must be in format YYYY-MM",
        code: "INVALID_BILLING_MONTH_FORMAT" 
      }, { status: 400 });
    }

    // Validate totalKwhUsed is positive
    if (totalKwhUsed <= 0) {
      return NextResponse.json({ 
        error: "Total kWh used must be a positive number",
        code: "INVALID_TOTAL_KWH" 
      }, { status: 400 });
    }

    // Validate cost fields are non-negative if provided
    const costFields = [
      { value: basicMonthlyCharge, name: 'basicMonthlyCharge' },
      { value: energyChargeTier1Cost, name: 'energyChargeTier1Cost' },
      { value: energyChargeTier2Cost, name: 'energyChargeTier2Cost' },
      { value: fuelCost, name: 'fuelCost' },
      { value: franchiseFee, name: 'franchiseFee' },
      { value: grossReceiptsTax, name: 'grossReceiptsTax' },
      { value: publicServiceTax, name: 'publicServiceTax' },
      { value: totalBillAmount, name: 'totalBillAmount' }
    ];

    for (const field of costFields) {
      if (field.value !== undefined && field.value !== null && field.value < 0) {
        return NextResponse.json({ 
          error: `${field.name} must be zero or positive`,
          code: "INVALID_COST_VALUE" 
        }, { status: 400 });
      }
    }

    // Check for duplicate billing month
    const existingBill = await db.select()
      .from(energyBills)
      .where(eq(energyBills.billingMonth, billingMonth))
      .limit(1);

    if (existingBill.length > 0) {
      return NextResponse.json({ 
        error: "A bill for this billing month already exists",
        code: "DUPLICATE_BILLING_MONTH" 
      }, { status: 409 });
    }

    // Auto-calculate costs if not provided
    const calculatedBasicMonthlyCharge = basicMonthlyCharge ?? 17.50;
    const calculatedTier1Rate = energyChargeTier1Rate ?? 0.06846;
    const calculatedTier2Rate = energyChargeTier2Rate ?? 0.08346;

    // Rate calculation logic (assuming first 1000 kWh is tier 1, rest is tier 2)
    const tier1Threshold = 1000;
    let calculatedTier1Kwh = energyChargeTier1Kwh;
    let calculatedTier2Kwh = energyChargeTier2Kwh;
    let calculatedTier1Cost = energyChargeTier1Cost;
    let calculatedTier2Cost = energyChargeTier2Cost;

    // Auto-calculate tier breakdown if not provided
    if (calculatedTier1Kwh === undefined || calculatedTier1Kwh === null) {
      calculatedTier1Kwh = Math.min(totalKwhUsed, tier1Threshold);
    }

    if (calculatedTier2Kwh === undefined || calculatedTier2Kwh === null) {
      calculatedTier2Kwh = Math.max(0, totalKwhUsed - tier1Threshold);
    }

    // Auto-calculate tier costs if not provided
    if (calculatedTier1Cost === undefined || calculatedTier1Cost === null) {
      calculatedTier1Cost = calculatedTier1Kwh * calculatedTier1Rate;
    }

    if (calculatedTier2Cost === undefined || calculatedTier2Cost === null) {
      calculatedTier2Cost = calculatedTier2Kwh * calculatedTier2Rate;
    }

    // Auto-calculate total if not provided
    let calculatedTotalBillAmount = totalBillAmount;
    if (calculatedTotalBillAmount === undefined || calculatedTotalBillAmount === null) {
      calculatedTotalBillAmount = calculatedBasicMonthlyCharge + 
                                   calculatedTier1Cost + 
                                   calculatedTier2Cost + 
                                   (fuelCost ?? 0) + 
                                   (franchiseFee ?? 0) + 
                                   (grossReceiptsTax ?? 0) + 
                                   (publicServiceTax ?? 0);
    }

    const now = new Date().toISOString();
    
    const insertData = {
      billingMonth,
      totalKwhUsed,
      basicMonthlyCharge: calculatedBasicMonthlyCharge,
      energyChargeTier1Kwh: calculatedTier1Kwh,
      energyChargeTier1Rate: calculatedTier1Rate,
      energyChargeTier1Cost: calculatedTier1Cost,
      energyChargeTier2Kwh: calculatedTier2Kwh,
      energyChargeTier2Rate: calculatedTier2Rate,
      energyChargeTier2Cost: calculatedTier2Cost,
      fuelCost: fuelCost ?? 0,
      franchiseFee: franchiseFee ?? 0,
      grossReceiptsTax: grossReceiptsTax ?? 0,
      publicServiceTax: publicServiceTax ?? 0,
      totalBillAmount: calculatedTotalBillAmount,
      createdAt: now,
      updatedAt: now
    };

    const newBill = await db.insert(energyBills)
      .values(insertData)
      .returning();

    return NextResponse.json(newBill[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const requestBody = await request.json();
    const { 
      billingMonth, 
      totalKwhUsed,
      basicMonthlyCharge,
      energyChargeTier1Kwh,
      energyChargeTier1Rate,
      energyChargeTier1Cost,
      energyChargeTier2Kwh,
      energyChargeTier2Rate,
      energyChargeTier2Cost,
      fuelCost,
      franchiseFee,
      grossReceiptsTax,
      publicServiceTax,
      totalBillAmount
    } = requestBody;

    // Check if record exists
    const existingRecord = await db.select()
      .from(energyBills)
      .where(eq(energyBills.id, parseInt(id)))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ error: 'Energy bill not found' }, { status: 404 });
    }

    // Validate billing month format if provided
    if (billingMonth && !/^\d{4}-\d{2}$/.test(billingMonth)) {
      return NextResponse.json({ 
        error: "Billing month must be in format YYYY-MM",
        code: "INVALID_BILLING_MONTH_FORMAT" 
      }, { status: 400 });
    }

    // Validate totalKwhUsed is positive if provided
    if (totalKwhUsed !== undefined && totalKwhUsed !== null && totalKwhUsed <= 0) {
      return NextResponse.json({ 
        error: "Total kWh used must be a positive number",
        code: "INVALID_TOTAL_KWH" 
      }, { status: 400 });
    }

    // Check for duplicate billing month if updating billing month
    if (billingMonth && billingMonth !== existingRecord[0].billingMonth) {
      const duplicateBill = await db.select()
        .from(energyBills)
        .where(eq(energyBills.billingMonth, billingMonth))
        .limit(1);

      if (duplicateBill.length > 0) {
        return NextResponse.json({ 
          error: "A bill for this billing month already exists",
          code: "DUPLICATE_BILLING_MONTH" 
        }, { status: 409 });
      }
    }

    // Validate cost fields are non-negative if provided
    const costFields = [
      { value: basicMonthlyCharge, name: 'basicMonthlyCharge' },
      { value: energyChargeTier1Cost, name: 'energyChargeTier1Cost' },
      { value: energyChargeTier2Cost, name: 'energyChargeTier2Cost' },
      { value: fuelCost, name: 'fuelCost' },
      { value: franchiseFee, name: 'franchiseFee' },
      { value: grossReceiptsTax, name: 'grossReceiptsTax' },
      { value: publicServiceTax, name: 'publicServiceTax' },
      { value: totalBillAmount, name: 'totalBillAmount' }
    ];

    for (const field of costFields) {
      if (field.value !== undefined && field.value !== null && field.value < 0) {
        return NextResponse.json({ 
          error: `${field.name} must be zero or positive`,
          code: "INVALID_COST_VALUE" 
        }, { status: 400 });
      }
    }

    // Prepare update data
    const updates = {};
    
    if (billingMonth !== undefined) updates.billingMonth = billingMonth;
    if (totalKwhUsed !== undefined) updates.totalKwhUsed = totalKwhUsed;
    if (basicMonthlyCharge !== undefined) updates.basicMonthlyCharge = basicMonthlyCharge;
    if (energyChargeTier1Kwh !== undefined) updates.energyChargeTier1Kwh = energyChargeTier1Kwh;
    if (energyChargeTier1Rate !== undefined) updates.energyChargeTier1Rate = energyChargeTier1Rate;
    if (energyChargeTier1Cost !== undefined) updates.energyChargeTier1Cost = energyChargeTier1Cost;
    if (energyChargeTier2Kwh !== undefined) updates.energyChargeTier2Kwh = energyChargeTier2Kwh;
    if (energyChargeTier2Rate !== undefined) updates.energyChargeTier2Rate = energyChargeTier2Rate;
    if (energyChargeTier2Cost !== undefined) updates.energyChargeTier2Cost = energyChargeTier2Cost;
    if (fuelCost !== undefined) updates.fuelCost = fuelCost;
    if (franchiseFee !== undefined) updates.franchiseFee = franchiseFee;
    if (grossReceiptsTax !== undefined) updates.grossReceiptsTax = grossReceiptsTax;
    if (publicServiceTax !== undefined) updates.publicServiceTax = publicServiceTax;
    if (totalBillAmount !== undefined) updates.totalBillAmount = totalBillAmount;

    updates.updatedAt = new Date().toISOString();

    const updated = await db.update(energyBills)
      .set(updates)
      .where(eq(energyBills.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Energy bill not found' }, { status: 404 });
    }

    return NextResponse.json(updated[0]);

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if record exists before deleting
    const existingRecord = await db.select()
      .from(energyBills)
      .where(eq(energyBills.id, parseInt(id)))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ error: 'Energy bill not found' }, { status: 404 });
    }

    const deleted = await db.delete(energyBills)
      .where(eq(energyBills.id, parseInt(id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Energy bill not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Energy bill deleted successfully',
      deletedRecord: deleted[0]
    });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}