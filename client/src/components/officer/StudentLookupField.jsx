import React, { useState } from 'react';
import api from '../../utils/api';
import StudentCard from './StudentCard';

export default function StudentLookupField({ value, onChange }) {
  const [matric, setMatric]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleLookup(e) {
    e.preventDefault();
    if (!matric.trim()) return;
    setLoading(true);
    setError('');
    try {
      const student = await api.get(`/students/lookup/${encodeURIComponent(matric.trim())}`);
      onChange(student);
    } catch (err) {
      setError(err?.error || 'Student not found. Check the matric number and try again.');
      onChange(null);
    } finally {
      setLoading(false);
    }
  }

  if (value) {
    return <StudentCard student={value} onClear={() => { onChange(null); setMatric(''); }} />;
  }

  return (
    <div>
      <form onSubmit={handleLookup} className="flex gap-2">
        <input
          type="text"
          value={matric}
          onChange={e => setMatric(e.target.value)}
          placeholder="e.g. ENG/2021/043"
          className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/30 bg-white"
        />
        <button
          type="submit"
          disabled={loading || !matric.trim()}
          className="bg-maroon text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-maroon/90 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Looking up…' : 'Lookup'}
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
