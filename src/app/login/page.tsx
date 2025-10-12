'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { login as loginAction } from '@/lib/actions';

export default function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    console.log('🔐 1. Iniciando login com Server Action...');
    
    const formData = new FormData();
    formData.append('login', login);
    formData.append('password', password);

    try {
      // A Server Action 'login' irá lidar com a lógica, cookies e redirecionamento.
      // Se houver um erro, ela o retornará. Se for bem-sucedida, o Next.js
      // seguirá o `redirect` dentro da ação.
      const result = await loginAction(null, formData);
      console.log('🔐 [DEBUG LOGIN RESULT]', result);

      if (result?.error) {
        console.log('❌ Erro no login:', result.error);
        toast({
          title: "Falha no Login",
          description: result.error,
          variant: "destructive"
        });
        setLoading(false);
      }
      // Se o login for bem-sucedido, a ação `login` redirecionará internamente.
      // O código aqui só será executado em caso de erro, então não precisamos de um `else`.
      // O `setLoading(false)` só é necessário no caminho do erro, pois no sucesso, a página será recarregada.
    } catch (error) {
       console.error('💥 Erro Inesperado:', error);
       toast({
          title: "Erro Inesperado",
          description: "Ocorreu um erro durante o login. Tente novamente.",
          variant: "destructive"
        });
       setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg sm:p-8">
        <div className="flex flex-col items-center text-center">
            <h1 className="text-4xl font-bold text-accent mb-4">Basiclean</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Faça login para gerenciar a higienização.
            </p>
             <p className="mt-1 text-xs text-muted-foreground/80">
              (Use admin/admin para testar)
            </p>
        </div>
        
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login">Usuário</Label>
            <Input 
              id="login"
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="seu.usuario"
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input 
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}
