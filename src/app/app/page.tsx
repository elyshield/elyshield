import type { Metadata } from 'next';
import { AppClient } from './app-client';

export const metadata: Metadata = {
  title: 'ElyShield | Post-Quantum Security Infrastructure on Elysium',
  description: 'Quantum-safe encryption, in your browser. Files never leave your device.',
};

export default function AppPage() {
  return <AppClient />;
}