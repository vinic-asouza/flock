'use client';

import {
  ExportMemberFieldsModal,
  type ExportMemberFieldsModalProps,
} from '@/components/members/ExportMemberFieldsModal';

type ExportCongregationMembersModalProps = Omit<
  ExportMemberFieldsModalProps,
  'title' | 'description'
>;

export function ExportCongregationMembersModal(props: ExportCongregationMembersModalProps) {
  return (
    <ExportMemberFieldsModal
      {...props}
      title="Exportar lista de membros da congregação"
      description="Selecione os campos dos membros que deseja incluir no PDF. O arquivo inclui todos os membros ativos desta congregação, independentemente da busca no modal."
    />
  );
}
