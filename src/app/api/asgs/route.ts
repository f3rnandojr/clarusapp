// This file is no longer needed as we are using Server Actions.
// Keeping it commented out for reference, but it can be deleted.
/*
import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    console.log('🔐 API ASGS - Sessão:', session ? `AUTENTICADO COMO ${session.user.login}`: 'NÃO AUTENTICADO');
    
    if (!session) {
      return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 });
    }

    const { name } = await request.json();
    console.log('📝 API ASGS - Criando colaborador:', name);
    
    if (!name) {
      return NextResponse.json({ error: 'O nome é obrigatório.' }, { status: 400 });
    }

    const db = await dbConnect();
    
    const lastAsg = await db.collection('asgs').find().sort({ code: -1 }).limit(1).toArray();
    let nextCode = 'ASG001';
    if (lastAsg.length > 0 && lastAsg[0].code) {
      const lastCode = lastAsg[0].code;
      const prefix = lastCode.match(/[A-Z]+/)?.[0] || 'ASG';
      const lastNumber = parseInt(lastCode.replace(prefix, ''), 10);
      const nextNumber = lastNumber + 1;
      nextCode = `${prefix}${String(nextNumber).padStart(3, '0')}`;
    }

    const result = await db.collection('asgs').insertOne({
      name,
      code: nextCode,
      status: 'available',
      active: true,
      createdAt: new Date()
    });
    
    console.log('✅ API ASGS - Colaborador criado:', result.insertedId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Colaborador criado com sucesso!',
      id: result.insertedId 
    });
    
  } catch (error: any) {
    console.error('❌ API ASGS - Erro:', error);
    return NextResponse.json(
      { error: 'Erro interno: ' + error.message },
      { status: 500 }
    );
  }
}
*/

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    return NextResponse.json({ error: 'This API endpoint is deprecated. Please use Server Actions.' }, { status: 404 });
}
