'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { login as loginAction } from '@/lib/actions';
import Image from 'next/image';

export default function LoginPage() {
  const [login, setLogin]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append('login', login);
    formData.append('password', password);

    try {
      const result = await loginAction(null, formData);
      if (result?.error) {
        toast({ title: "Falha no Login", description: result.error, variant: "destructive" });
        setLoading(false);
      }
    } catch (error: any) {
      if (error?.message?.includes('NEXT_REDIRECT')) return;
      toast({ title: "Erro de Conexão", description: "Não foi possível conectar ao servidor.", variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#A0E9FF]/50 bg-white p-6 shadow-lg sm:p-8">

        {/* Logo + brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <Image
            src="/logo_180x180.png"
            alt="Hygra"
            width={60}
            height={60}
            className="rounded-2xl mb-4 shadow-md"
          />
          <h1 className="text-3xl font-black text-[#0F4C5C] tracking-tight mb-1">Hygra</h1>
          <p className="text-sm text-gray-400 font-medium">Gestão de Higienização</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="login"
              className="text-[10px] font-black uppercase tracking-widest text-[#0F4C5C]/60 ml-1"
            >
              Usuário
            </Label>
            <Input
              id="login"
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="seu.usuario"
              required
              disabled={loading}
              className="bg-white border-[#A0E9FF] h-12 rounded-xl text-[#0F4C5C] placeholder:text-gray-300 focus-visible:ring-[#A0E9FF]/50 focus-visible:border-[#A0E9FF]"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="password"
              className="text-[10px] font-black uppercase tracking-widest text-[#0F4C5C]/60 ml-1"
            >
              Senha
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              className="bg-white border-[#A0E9FF] h-12 rounded-xl text-[#0F4C5C] placeholder:text-gray-300 focus-visible:ring-[#A0E9FF]/50 focus-visible:border-[#A0E9FF]"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-[#A0E9FF] hover:bg-[#7ed8f0] text-[#0F4C5C] font-black uppercase tracking-widest shadow-sm active:scale-[.98] transition-all mt-2"
          >
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Entrar no Sistema"}
          </Button>
        </form>

      </div>
    </div>
  );
}
