
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    // Esta rota de API foi substituída por uma Server Action em @/lib/actions.
    // Manter a rota pode causar confusão. A lógica foi movida para a ação 'login'.
    return NextResponse.json({ error: 'This API endpoint is deprecated. Please use Server Actions.' }, { status: 404 });
}
