'use client';
import { useState } from 'react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: 'admin', password: 'admin' })
      });

      if (response.ok) {
        // ✅ REDIRECIONAMENTO DIRETO
        window.location.href = '/dashboard';
      } else {
        alert('Login falhou - use admin/admin');
      }
    } catch (error) {
      alert('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      background: 'hsl(var(--background))'
    }}>
      <div style={{
        background: 'hsl(var(--card))',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
        textAlign: 'center',
        border: '1px solid hsl(var(--border))'
      }}>
        <h1 style={{fontSize: '2rem', fontWeight: 'bold', color: 'hsl(var(--foreground))'}}>Clarus</h1>
        <p style={{color: 'hsl(var(--muted-foreground))', marginTop: '8px', marginBottom: '24px'}}>
          Faça login para continuar. Use: admin / admin
        </p>
        <form onSubmit={handleSubmit}>
          <button type="submit" disabled={loading} style={{ 
            width: '100%',
            padding: '10px 20px',
            background: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            opacity: loading ? 0.7 : 1
          }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
