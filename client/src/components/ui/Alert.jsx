import React from 'react';

const types = {
  error:   'bg-red-50 border-red-200 text-red-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info:    'bg-blue-50 border-blue-200 text-blue-800',
};

export default function Alert({ type = 'info', children }) {
  return (
    <div className={`rounded-lg border p-4 text-sm ${types[type]}`}>
      {children}
    </div>
  );
}
