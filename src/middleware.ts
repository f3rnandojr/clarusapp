// src/middleware.ts - VERSÃO SIMPLIFICADA
import { NextResponse } from 'next/server';

export function middleware() {
  // ✅ PERMITE TUDO - SEM VERIFICAÇÃO
  return NextResponse.next();
}

export const config = {
  matcher: [] // ✅ NÃO APLICA A NENHUMA ROTA
};