import React from 'react';
import { AdminPanel } from '../components/AdminPanel.js';

export const AdminDashboardPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <AdminPanel />
    </div>
  );
};

