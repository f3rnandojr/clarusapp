import { NextRequest, NextResponse } from 'next/server';
import { getSyncStatus } from '@/lib/actions';
import { syncService } from '@/lib/sync-service';

export async function GET(request: NextRequest) {
  try {
    const configStatus = await getSyncStatus();
    const serviceStatus = syncService.getStatus();

    return NextResponse.json({
      success: true,
      data: {
        config: configStatus,
        service: serviceStatus,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
