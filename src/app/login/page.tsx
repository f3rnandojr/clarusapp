'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    console.log('🔐 1. Iniciando login...');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password })
      });

      console.log('🔐 2. Response status:', response.status);
      console.log('🔐 3. Response ok:', response.ok);
      
      const data = await response.json();
      console.log('🔐 4. Response data:', data);

      if (response.ok) {
        console.log('🔐 5. Login OK - Redirecionando para o dashboard...');
        // O fluxo de QR code agora é tratado inteiramente pelo dashboard.
        // A página de login simplesmente redireciona para lá após o sucesso.
        router.push('/dashboard');
      } else {
        console.log('🔐 5. Login FALHOU');
        toast({
          title: "Falha no Login",
          description: data.error || "Credenciais inválidas. Verifique seus dados.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('💥 Erro de Conexão:', error);
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
