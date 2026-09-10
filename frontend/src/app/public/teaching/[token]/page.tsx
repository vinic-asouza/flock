'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertCircle, CheckCircle, Loader, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FlockLogo } from '@/components/ui/FlockLogo';
import apiService, { formatApiError } from '@/services/api';

type LinkInfo = {
  church_name: string;
  class_name: string;
  program_name?: string | null;
  enrollment_allowed: boolean;
};

export default function PublicTeachingPage() {
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
      const response = await apiService.validateTeachingPublicLink(token);
      setLinkInfo(response);
      setIsValid(Boolean(response.enrollment_allowed));
      if (!response.enrollment_allowed) {
        setError('Esta inscrição não está disponível.');
      } else {
        setError(null);
      }
      return response;
    } catch (err) {
      setIsValid(false);
      setError(formatApiError(err) || 'Esta inscrição não está disponível.');
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
      const result = await apiService.enrollViaTeachingPublicLink(token, {
        full_name: fullName,
        whatsapp,
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
      <div className="min-h-screen flex items-center justify-center bg-[#090725]">
        <Loader className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (outcome) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090725] px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center space-y-4">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
          <h1 className="text-xl font-semibold text-gray-900">
            {outcome === 'confirmed' ? 'Inscrição confirmada' : 'Inscrição enviada'}
          </h1>
          <p className="text-sm text-gray-600">
            {outcome === 'confirmed'
              ? `Sua inscrição em ${linkInfo?.class_name} foi confirmada para ${linkInfo?.church_name}.`
              : `Recebemos sua inscrição em ${linkInfo?.class_name} para ${linkInfo?.church_name}.`}
          </p>
          <Button
            className="min-h-11 w-full"
            onClick={() => {
              setOutcome(null);
              setFullName('');
              setWhatsapp('');
              setBirthDate('');
              setEmail('');
              refresh();
            }}
          >
            Realizar nova inscrição
          </Button>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090725] px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center space-y-4">
          <XCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h1 className="text-xl font-semibold text-gray-900">Inscrição indisponível</h1>
          <p className="text-sm text-gray-600">{error || 'Esta inscrição não está disponível.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090725] px-4 py-10">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <FlockLogo className="h-10 text-white" />
        </div>
        <div className="rounded-2xl bg-white p-6 sm:p-8 space-y-5">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Inscrição · {linkInfo?.class_name}</h1>
            <p className="text-sm text-gray-500 mt-1">{linkInfo?.church_name}</p>
          </div>

          {error ? (
            <div className="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nome completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="text-base"
            />
            <Input
              label="WhatsApp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              required
              className="text-base"
            />
            <Input
              label="Data de nascimento"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
              className="text-base"
            />
            <Input
              label="E-mail (opcional)"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-base"
            />
            <p className="text-xs text-gray-500">
              Seus dados serão usados pela igreja para esta inscrição.
            </p>
            <Button type="submit" className="min-h-11 w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader className="h-4 w-4 animate-spin" /> : 'Enviar inscrição'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
