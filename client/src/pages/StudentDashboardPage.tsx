import React from 'react';
import { ParentConnect } from '../components/ParentConnect.js';

export const StudentDashboardPage: React.FC = () => {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <ParentConnect />
    </div>
  );
};
