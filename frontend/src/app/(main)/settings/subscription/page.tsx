import { redirect } from 'next/navigation';

export default function SettingsSubscriptionRedirectPage() {
  redirect('/settings?tab=payment');
}
