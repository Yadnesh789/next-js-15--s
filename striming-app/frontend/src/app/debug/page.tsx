'use client';

import { useState } from 'react';

export default function DebugPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/videos');
      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({ error: error.message });
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>API Debug Page</h1>
      <button onClick={testAPI} disabled={loading}>
        {loading ? 'Testing...' : 'Test API'}
      </button>
      
      {result && (
        <pre style={{ background: '#f5f5f5', padding: '10px', marginTop: '20px' }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
