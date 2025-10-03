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
      background: '#f5f5f5'
    }}>
      <form onSubmit={handleSubmit} style={{ 
        background: 'white', 
        padding: '40px', 
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h2>Clarus - Login</h2>
        <p>Use: admin / admin</p>
        <button type="submit" disabled={loading} style={{ 
          marginTop: '20px', 
          padding: '10px 20px',
          background: '#007acc',
          color: 'white',
          border: 'none',
          borderRadius: '4px'
        }}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}