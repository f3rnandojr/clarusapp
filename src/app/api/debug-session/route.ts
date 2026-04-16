import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decrypt, SESSION_COOKIE_NAME } from '@/lib/session';

export async function GET() {
  try {
    const cookie = cookies().get(SESSION_COOKIE_NAME)?.value;
    
    if (!cookie) {
      return NextResponse.json({ 
        error: 'Nenhum cookie de sessão encontrado',
        hasCookie: false 
      });
    }

    const decrypted = await decrypt(cookie);
    
    return NextResponse.json({
      hasCookie: true,
      cookieLength: cookie.length,
      decryptedSuccess: !!decrypted,
      decryptedData: decrypted,
      sessionSecret: process.env.SESSION_SECRET ? 'EXISTS' : 'MISSING'
    });
    
  } catch (error: any) {
    return NextResponse.json({
      error: 'Erro ao decriptar sessão',
      message: error.message
    }, { status: 500 });
  }
}
