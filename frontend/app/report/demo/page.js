'use client';

import ReportDashboard from '../../../components/ReportDashboard';
import { demoReport } from '../../../lib/demoReport';

export default function DemoReportPage() {
  return <ReportDashboard report={demoReport} onReset={() => { window.location.href = '/'; }} />;
}
