// This file is no longer needed as we are using Server Actions for user management.
// Keeping it commented out for reference, but it can be deleted.

/*
import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { CreateUserSchema } from '@/lib/schemas';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const db = await dbConnect();
    const users = await db.collection('users').find().sort({ name: 1 }).toArray();
    return NextResponse.json(users.map(u => ({...u, _id: u._id.toString()})));
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    console.log('🚨 API USERS - Criando usuário:', { name: body.name, login: body.login });

    const validatedFields = CreateUserSchema.safeParse(body);
    
    if (!validatedFields.success) {
      return NextResponse.json({ error: 'Dados inválidos.', fieldErrors: validatedFields.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, login, password } = validatedFields.data;
    
    const db = await dbConnect();
    
    const existingUser = await db.collection('users').findOne({ login });
    if (existingUser) {
      return NextResponse.json({ error: 'Este login já está em uso.' }, { status: 400 });
    }
    
    const result = await db.collection('users').insertOne({
      name,
      login, 
      password, // Lembrete: em produção, use hash (bcrypt)
      active: true,
      createdAt: new Date()
    });
    
    console.log('✅ API USERS - Usuário criado:', result.insertedId);
    return NextResponse.json({ 
      success: true, 
      message: 'Usuário criado com sucesso via API',
      id: result.insertedId 
    });
    
  } catch (error: any) {
    console.error('❌ API USERS - Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
*/
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    return NextResponse.json({ error: 'This API endpoint is deprecated. Please use Server Actions.' }, { status: 404 });
}
export async function POST(request: Request) {
    return NextResponse.json({ error: 'This API endpoint is deprecated. Please use Server Actions.' }, { status: 404 });
}