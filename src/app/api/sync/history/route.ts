import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = await dbConnect();
    const collection = db.collection('sync_history');
    
    const history = await collection
      .find({})
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({
      success: true,
      data: history
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      // @ts-ignore
      error: error.message
    }, { status: 500 });
  }
}
