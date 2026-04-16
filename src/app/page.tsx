import { redirect } from 'next/navigation';

export default function Home() {
  // A lógica de proteção agora está no middleware.ts
  // Esta página pode redirecionar para o dashboard como padrão.
  redirect('/dashboard');
}
