'use client';

import { useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Cake, Loader2, Mail, MessageCircle, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatMemberName } from '@/utils/formatMemberName';
import { getCongregationDisplayName } from '@/utils/congregation';

export interface Birthday {
  id: string;
  name: string;
  birth: string;
  birthDay: number;
  birthMonth: number;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  congregation?: {
    id: string;
    name: string;
    abbreviation?: string | null;
  } | null;
}

interface BirthdaysModalProps {
  isOpen: boolean;
  onClose: () => void;
  birthdays: Birthday[];
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
  onOpenMember?: (id: string, name: string) => void;
  month: number;
  year: number;
}

function calcularIdade(birth: string): number | null {
  if (!birth) return null;

  const raw = birth.includes('T') ? birth.split('T')[0] : birth;
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  let birthDate: Date;

  if (match) {
    const [, year, month, day] = match;
    birthDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  } else {
    birthDate = new Date(birth);
  }

  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

const contactLinkClass =
  'inline-flex items-center gap-1 h-5 px-0.5 cursor-pointer text-[11px] leading-4 text-gray-600 transition-colors';

function BirthdayCard({
  birthday,
  highlight,
  onOpenMember,
}: {
  birthday: Birthday;
  highlight: boolean;
  onOpenMember?: (id: string, name: string) => void;
}) {
  const idade = calcularIdade(birthday.birth);

  const hasDetails = idade !== null || Boolean(birthday.phone || birthday.whatsapp || birthday.email);

  return (
    <div
      className={
        highlight
          ? 'border rounded-md px-2.5 py-1.5 bg-pink-50 border-pink-300'
          : 'border rounded-md px-2.5 py-1.5 bg-white border-gray-200'
      }
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          {onOpenMember ? (
            <button
              type="button"
              onClick={() => onOpenMember(birthday.id, birthday.name)}
              className="font-medium text-gray-900 text-sm uppercase leading-5 rounded hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-left min-w-0 flex-1 truncate"
              title={birthday.name}
            >
              {formatMemberName(birthday.name)}
            </button>
          ) : (
            <span className="font-medium text-gray-900 text-sm uppercase leading-5 min-w-0 flex-1 truncate" title={birthday.name}>
              {formatMemberName(birthday.name)}
            </span>
          )}
          <span className="px-1.5 py-0 rounded-full text-[11px] leading-4 font-medium bg-gray-100 text-gray-700 shrink-0 max-w-[9rem] truncate">
            {getCongregationDisplayName(birthday.congregation) || '—'}
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0 rounded text-[11px] leading-4 font-semibold whitespace-nowrap bg-pink-100 text-pink-700 shrink-0">
            <Cake size={12} />
            {String(birthday.birthDay).padStart(2, '0')}/{String(birthday.birthMonth).padStart(2, '0')}
            {highlight ? ' 🎉' : null}
          </span>
        </div>
        {hasDetails && (
          <div className="flex flex-nowrap items-center gap-x-2.5 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {idade !== null && <span className="text-xs text-gray-500 whitespace-nowrap">{idade} anos</span>}
            {birthday.phone && (
              <a
                href={`tel:${birthday.phone.replace(/\D/g, '')}`}
                className={`${contactLinkClass} hover:text-blue-600`}
              >
                <Phone size={11} className="shrink-0" />
                <span className="truncate max-w-[120px]">{birthday.phone}</span>
              </a>
            )}
            {birthday.whatsapp && (
              <a
                href={`https://wa.me/${birthday.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`${contactLinkClass} hover:text-green-600`}
              >
                <MessageCircle size={11} className="shrink-0" />
                <span className="truncate max-w-[120px]">{birthday.whatsapp}</span>
              </a>
            )}
            {birthday.email && (
              <a
                href={`mailto:${birthday.email}`}
                className={`${contactLinkClass} hover:text-blue-600 min-w-0`}
              >
                <Mail size={11} className="shrink-0" />
                <span className="truncate max-w-[180px]">{birthday.email}</span>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function BirthdaysModal({
  isOpen,
  onClose,
  birthdays,
  loading,
  error = false,
  onRetry,
  onOpenMember,
  month,
  year,
}: BirthdaysModalProps) {
  const today = new Date();
  const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year;
  const currentDay = today.getDate();

  const monthName = format(new Date(year, month - 1, 1), 'MMMM', { locale: ptBR });
  const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const { todayBirthdays, otherBirthdays } = useMemo(() => {
    const todayList: Birthday[] = [];
    const others: Birthday[] = [];

    birthdays.forEach((birthday) => {
      const isBirthdayToday = isCurrentMonth && birthday.birthDay === currentDay;
      if (isBirthdayToday) {
        todayList.push(birthday);
      } else {
        others.push(birthday);
      }
    });

    others.sort((a, b) => a.birthDay - b.birthDay);

    return { todayBirthdays: todayList, otherBirthdays: others };
  }, [birthdays, isCurrentMonth, currentDay]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Aniversariantes de ${capitalizedMonthName} ${year}`}
      size="xl"
    >
      <div className="p-3 sm:p-4">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">Não foi possível carregar a lista</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="min-h-11 px-4 rounded-md text-sm font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Tentar
              </button>
            )}
          </div>
        ) : birthdays.length === 0 ? (
          <div className="text-center py-12">
            <Cake size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Nenhum aniversariante em {capitalizedMonthName}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayBirthdays.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                  <Cake size={14} className="text-pink-600" />
                  Aniversariantes do dia
                </h3>
                {todayBirthdays.map((birthday) => (
                  <BirthdayCard key={birthday.id} birthday={birthday} highlight onOpenMember={onOpenMember} />
                ))}
              </div>
            )}

            {otherBirthdays.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                  <Cake size={14} className="text-gray-600" />
                  Aniversariantes do mês
                </h3>
                {otherBirthdays.map((birthday) => (
                  <BirthdayCard key={birthday.id} birthday={birthday} highlight={false} onOpenMember={onOpenMember} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
