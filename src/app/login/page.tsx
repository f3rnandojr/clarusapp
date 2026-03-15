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
    
    const formData = new FormData();
    formData.append('login', login);
    formData.append('password', password);

    try {
      // Chamada direta para a Server Action
      const result = await loginAction(null, formData);

      if (result?.error) {
        toast({
          title: "Falha no Login",
          description: result.error,
          variant: "destructive"
        });
        setLoading(false);
      }
      // O Next.js gerencia o redirecionamento interno da Action.
      // Se não houver erro, a página será redirecionada automaticamente.
    } catch (error: any) {
       // Silencia o erro se for um redirecionamento interno do Next.js
       if (error?.message?.includes('NEXT_REDIRECT')) {
         return;
       }
       
       console.error('💥 Erro no Login:', error);
       toast({
          title: "Erro de Conexão",
          description: "Não foi possível conectar ao servidor. Verifique sua rede.",
          variant: "destructive"
        });
       setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-card p-6 shadow-2xl sm:p-8">
        <div className="flex flex-col items-center text-center">
            <h1 className="text-4xl font-black text-sky-400 mb-2 tracking-tighter">Basiclean</h1>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
              Gestão de Higienização
            </p>
        </div>
        
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Usuário</Label>
            <Input 
              id="login"
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="seu.usuario"
              required
              disabled={loading}
              className="bg-slate-900/50 border-slate-800 h-12 rounded-xl focus:ring-sky-500/20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" id="pass-label" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Senha</Label>
            <Input 
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              className="bg-slate-900/50 border-slate-800 h-12 rounded-xl focus:ring-sky-500/20"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-900 font-black uppercase tracking-widest transition-all shadow-lg shadow-sky-500/20 mt-2">
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Entrar no Sistema"}
          </Button>
        </form>
        
        <div className="mt-6 text-center">
            <p className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-tighter">
              Utilize as credenciais fornecidas pela TI
            </p>
        </div>
      </div>
    </div>
  );
}
