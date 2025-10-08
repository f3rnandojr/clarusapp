
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { BasicleanLogo } from '@/components/basiclean-logo';

export default function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password })
      });

      if (response.ok) {
        router.push('/dashboard');
      } else {
        const data = await response.json();
        toast({
          title: "Falha no Login",
          description: data.error || "Credenciais inválidas. Verifique seus dados.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
          title: "Erro de Conexão",
          description: "Não foi possível conectar ao servidor. Tente novamente mais tarde.",
          variant: "destructive"
        });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg sm:p-8">
        <div className="flex flex-col items-center text-center">
            <BasicleanLogo className="h-10 text-accent mb-4" />
            <h1 className="text-3xl font-bold text-foreground sr-only">Basiclean</h1>
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
