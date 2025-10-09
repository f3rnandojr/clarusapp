
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { encrypt, SESSION_COOKIE_NAME } from '@/lib/session';
import { dbConnect } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { login, password } = await request.json();

    console.log('🔐 API LOGIN:', { login });

    const db = await dbConnect();
    const user = await db.collection('users').findOne({ login, password, active: true });

    if (user) {
      console.log('✅ API LOGIN - CREDENCIAIS VÁLIDAS PARA:', user.login);

      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
      const sessionData = { 
        user: { 
            _id: user._id.toString(), 
            name: user.name, 
            login: user.login,
            perfil: user.perfil || 'usuario'
        }, 
        expires 
      };
      
      const encryptedSession = await encrypt(sessionData);
      
      cookies().set(SESSION_COOKIE_NAME, encryptedSession, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: expires,
        sameSite: 'lax',
        path: '/',
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Login realizado com sucesso' 
      }, { status: 200 }); // Status 200 OK
    }

    console.log('❌ API LOGIN - CREDENCIAIS INVÁLIDAS PARA:', login);
    return NextResponse.json(
      { error: 'Credenciais inválidas' },
      { status: 401 }
    );
  } catch (error) {
    console.error('💥 API LOGIN - ERRO:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
