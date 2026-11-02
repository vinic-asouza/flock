'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertCircle, CheckCircle, Loader, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FlockLogo } from '@/components/ui/FlockLogo';
import apiService, { formatApiError } from '@/services/api';
import { maskPhoneInput } from '@/utils';
import { formatEventDateTime } from '@/components/events/EventUi';

type LinkInfo = {
  church_name: string;
  event_name: string;
  starts_at?: string | null;
  ends_at?: string | null;
  location?: string | null;
  enrollment_allowed: boolean;
  full?: boolean;
};

export default function PublicEventPage() {
  const params = useParams();
  const token = params.token as string;

  const [isValidating, setIsValidating] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null);
  const [outcome, setOutcome] = useState<'confirmed' | 'submitted' | null>(null);

  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [email, setEmail] = useState('');

  const refresh = useCallback(async () => {
    try {
      const response = await apiService.validateEventPublicLink(token);
      setLinkInfo(response);
      const allowed = Boolean(response.enrollment_allowed) && !response.full;
      setIsValid(allowed);
      if (response.full) {
        setError('Inscrições encerradas (vagas esgotadas).');
      } else if (!response.enrollment_allowed) {
        setError('Esta inscrição não está disponível.');
      } else {
        setError(null);
      }
      return response;
    } catch {
      setIsValid(false);
      setError('Esta inscrição não está disponível.');
      return null;
    }
  }, [token]);

  useEffect(() => {
    (async () => {
      try {
        setIsValidating(true);
        await refresh();
      } finally {
        setIsValidating(false);
      }
    })();
  }, [refresh]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      const result = await apiService.enrollViaEventPublicLink(token, {
        full_name: fullName,
        whatsapp: whatsapp.replace(/\D/g, ''),
        birth_date: birthDate,
        email: email || undefined,
      });
      setOutcome(result.outcome === 'confirmed' ? 'confirmed' : 'submitted');
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/10 to-white">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (outcome) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/10 to-white p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center space-y-4">
          <CheckCircle className="mx-auto h-12 w-12 text-emerald-500" />
          <h1 className="text-xl font-semibold text-gray-900">
            {outcome === 'confirmed' ? 'Inscrição confirmada' : 'Inscrição enviada'}
          </h1>
          <p className="text-sm text-gray-600">
            {outcome === 'confirmed'
              ? `Sua inscrição em ${linkInfo?.event_name} foi confirmada para ${linkInfo?.church_name}.`
              : `Recebemos sua inscrição em ${linkInfo?.event_name} para ${linkInfo?.church_name}.`}
          </p>
          <Button
            className="min-h-11 w-full"
            onClick={() => {
              setOutcome(null);
              setFullName('');
              setWhatsapp('');
              setBirthDate('');
              setEmail('');
              void refresh();
            }}
          >
            Realizar nova inscrição
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-white px-4 py-10">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <FlockLogo className="h-10" />
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-lg space-y-5">
          {linkInfo ? (
            <div className="space-y-1 text-center">
              <p className="text-sm text-gray-500">{linkInfo.church_name}</p>
              <h1 className="text-xl font-semibold text-gray-900">{linkInfo.event_name}</h1>
              <p className="text-sm text-gray-600">{formatEventDateTime(linkInfo.starts_at)}</p>
              {linkInfo.location ? <p className="text-sm text-gray-500">{linkInfo.location}</p> : null}
            </div>
          ) : null}

          {!isValid ? (
            <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              <XCircle className="h-5 w-5 shrink-0" />
              <span>{error || 'Esta inscrição não está disponível.'}</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Nome completo *"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="text-base"
              />
              <Input
                label="WhatsApp *"
                value={whatsapp}
                onChange={(e) => setWhatsapp(maskPhoneInput(e.target.value))}
                required
                className="text-base"
              />
              <Input
                label="Data de nascimento *"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
                className="text-base"
              />
              <Input
                label="E-mail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-base"
              />
              <p className="text-xs text-gray-500">
                Seus dados serão usados pela igreja para esta inscrição.
              </p>
              {error ? (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              ) : null}
              <Button type="submit" className="min-h-11 w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader className="h-4 w-4 animate-spin mr-2" /> : null}
                Inscrever-se
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
