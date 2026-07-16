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
  month: number;
  year: number;
}

function calcularIdade(birth: string): number | null {
  if (!birth) return null;

  // Tentar extrair a data "YYYY-MM-DD" de forma segura
  const raw = birth.includes('T') ? birth.split('T')[0] : birth;
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  let birthDate: Date;

  if (match) {
    const [, year, month, day] = match;
    // Criar Date no timezone local a partir de componentes numéricos (evita interpretar como UTC)
    birthDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  } else {
    // Fallback para outros formatos
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

export function BirthdaysModal({ isOpen, onClose, birthdays, loading, month, year }: BirthdaysModalProps) {
  const today = new Date();
  const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year;
  const currentDay = today.getDate();

  const monthName = format(new Date(year, month - 1, 1), 'MMMM', { locale: ptBR });
  const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // Separar aniversariantes do dia e do mês
  const { todayBirthdays, otherBirthdays } = useMemo(() => {
    const today: Birthday[] = [];
    const others: Birthday[] = [];
    
    birthdays.forEach(birthday => {
      const isBirthdayToday = isCurrentMonth && birthday.birthDay === currentDay;
      if (isBirthdayToday) {
        today.push(birthday);
      } else {
        others.push(birthday);
      }
    });
    
    // Ordenar outros por dia do mês
    others.sort((a, b) => a.birthDay - b.birthDay);
    
    return { todayBirthdays: today, otherBirthdays: others };
  }, [birthdays, isCurrentMonth, currentDay]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Aniversariantes de ${capitalizedMonthName} ${year}`}
      size="lg"
    >
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : birthdays.length === 0 ? (
          <div className="text-center py-12">
            <Cake size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">
              Nenhum aniversariante em {capitalizedMonthName}
            </p>
          </div>
        ) : (
          <>
            {/* Lista de aniversariantes */}
            <div className="space-y-3">
              {/* Aniversariantes do dia */}
              {todayBirthdays.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Cake size={16} className="text-pink-600" />
                    Aniversariantes do dia
                  </h3>
                  {todayBirthdays.map((birthday) => {
                    const idade = calcularIdade(birthday.birth);
                    
                    return (
                      <div
                        key={birthday.id}
                        className="border rounded-lg px-4 py-3 transition-all bg-pink-50 border-pink-300 shadow-md"
                      >
                        {/* Header: Nome/badges à esquerda, data à direita */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          {/* Nome e badges */}
                          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                            <span className="font-medium text-gray-900 text-sm truncate max-w-xs uppercase" title={birthday.name}>
                              {formatMemberName(birthday.name)}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                              {getCongregationDisplayName(birthday.congregation) || '—'}
                            </span>
                          </div>
                          
                          {/* Data do aniversário */}
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap bg-pink-100 text-pink-700">
                            <Cake size={14} />
                            {String(birthday.birthDay).padStart(2, '0')}/{String(birthday.birthMonth).padStart(2, '0')} 🎉
                          </div>
                        </div>
                        
                        {/* Idade e contatos */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                          {idade !== null && <span>{idade} Anos</span>}
                          {birthday.phone && (
                            <a
                              href={`tel:${birthday.phone.replace(/\D/g, '')}`}
                              className="flex items-center gap-1 cursor-pointer text-gray-600 hover:text-blue-600 transition-colors"
                            >
                              <Phone size={14} className="transition-colors" />
                              {birthday.phone}
                            </a>
                          )}
                          {birthday.whatsapp && (
                            <a
                              href={`https://wa.me/${birthday.whatsapp.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 cursor-pointer text-gray-600 hover:text-green-600 transition-colors"
                            >
                              <MessageCircle size={14} className="transition-colors" />
                              {birthday.whatsapp}
                            </a>
                          )}
                          {birthday.email && (
                            <a
                              href={`mailto:${birthday.email}`}
                              className="flex items-center gap-1 cursor-pointer text-gray-600 hover:text-blue-600 transition-colors"
                            >
                              <Mail size={14} className="transition-colors" />
                              {birthday.email}
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Aniversariantes do mês */}
              {otherBirthdays.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Cake size={16} className="text-gray-600" />
                    Aniversariantes do mês
                  </h3>
                  {otherBirthdays.map((birthday) => {
                    const idade = calcularIdade(birthday.birth);
                    
                    return (
                      <div
                        key={birthday.id}
                        className="border rounded-lg px-4 py-3 transition-all bg-white border-gray-200"
                      >
                        {/* Header: Nome/badges à esquerda, data à direita */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          {/* Nome e badges */}
                          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                            <span className="font-medium text-gray-900 text-sm truncate max-w-xs uppercase" title={birthday.name}>
                              {formatMemberName(birthday.name)}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                              {getCongregationDisplayName(birthday.congregation) || '—'}
                            </span>
                          </div>
                          
                          {/* Data do aniversário */}
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap bg-pink-100 text-pink-700">
                            <Cake size={14} />
                            {String(birthday.birthDay).padStart(2, '0')}/{String(birthday.birthMonth).padStart(2, '0')}
                          </div>
                        </div>
                        
                        {/* Idade e contatos */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                          {idade !== null && <span>{idade} Anos</span>}
                          {birthday.phone && (
                            <a
                              href={`tel:${birthday.phone.replace(/\D/g, '')}`}
                              className="flex items-center gap-1 cursor-pointer text-gray-600 hover:text-blue-600 transition-colors"
                            >
                              <Phone size={14} className="transition-colors" />
                              {birthday.phone}
                            </a>
                          )}
                          {birthday.whatsapp && (
                            <a
                              href={`https://wa.me/${birthday.whatsapp.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 cursor-pointer text-gray-600 hover:text-green-600 transition-colors"
                            >
                              <MessageCircle size={14} className="transition-colors" />
                              {birthday.whatsapp}
                            </a>
                          )}
                          {birthday.email && (
                            <a
                              href={`mailto:${birthday.email}`}
                              className="flex items-center gap-1 cursor-pointer text-gray-600 hover:text-blue-600 transition-colors"
                            >
                              <Mail size={14} className="transition-colors" />
                              {birthday.email}
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </>
        )}
      </div>
    </Modal>
  );
}
