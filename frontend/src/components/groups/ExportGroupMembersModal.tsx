'use client';

import {
  ExportMemberFieldsModal,
  type ExportMemberFieldsModalProps,
} from '@/components/members/ExportMemberFieldsModal';

type ExportGroupMembersModalProps = Omit<
  ExportMemberFieldsModalProps,
  'title' | 'description'
>;

export function ExportGroupMembersModal(props: ExportGroupMembersModalProps) {
  return (
    <ExportMemberFieldsModal
      {...props}
      title="Exportar lista de membros do ministério"
      description="Selecione os campos dos membros que deseja incluir no PDF. O documento incluirá também o nome do ministério, congregação e dados do responsável."
    />
  );
}
