export type MemberExportFieldCategory =
  | 'personal'
  | 'contact'
  | 'ecclesiastical'
  | 'address';

export interface MemberExportFieldOption {
  id: string;
  label: string;
  category: MemberExportFieldCategory;
}

/** Catálogo de campos da lista de membros (PDF e CSV). Sem questionário eclesiástico nem legado. */
export const MEMBER_EXPORT_FIELD_OPTIONS: MemberExportFieldOption[] = [
  { id: 'name', label: 'Nome', category: 'personal' },
  { id: 'age', label: 'Idade', category: 'personal' },
  { id: 'birth', label: 'Data de Nascimento', category: 'personal' },
  { id: 'gender', label: 'Gênero', category: 'personal' },
  { id: 'marital_status', label: 'Estado Civil', category: 'personal' },
  { id: 'hometown', label: 'Natural de', category: 'personal' },
  { id: 'wedding_date', label: 'Data do Casamento', category: 'personal' },
  { id: 'spouse', label: 'Cônjuge', category: 'personal' },
  { id: 'spouse_is_member', label: 'Cônjuge é membro', category: 'personal' },
  { id: 'father_name', label: 'Nome do Pai', category: 'personal' },
  { id: 'father_is_member', label: 'Pai é membro', category: 'personal' },
  { id: 'mother_name', label: 'Nome da Mãe', category: 'personal' },
  { id: 'mother_is_member', label: 'Mãe é membro', category: 'personal' },
  { id: 'occupation', label: 'Profissão', category: 'personal' },
  { id: 'children', label: 'Filhos', category: 'personal' },
  { id: 'phone', label: 'Telefone', category: 'contact' },
  { id: 'whatsapp', label: 'WhatsApp', category: 'contact' },
  { id: 'email', label: 'Email', category: 'contact' },
  { id: 'active', label: 'Status', category: 'ecclesiastical' },
  { id: 'congregation', label: 'Congregação', category: 'ecclesiastical' },
  { id: 'admission', label: 'Tipo de Recebimento', category: 'ecclesiastical' },
  { id: 'admission_date', label: 'Data de Recebimento', category: 'ecclesiastical' },
  { id: 'address', label: 'Endereço', category: 'address' },
  { id: 'address_number', label: 'Número', category: 'address' },
  { id: 'complement', label: 'Complemento', category: 'address' },
  { id: 'neighborhood', label: 'Bairro', category: 'address' },
  { id: 'city', label: 'Cidade', category: 'address' },
  { id: 'state', label: 'Estado', category: 'address' },
  { id: 'cep', label: 'CEP', category: 'address' },
];

export const MEMBER_EXPORT_CATEGORIES: Record<MemberExportFieldCategory, string> = {
  personal: 'Informações Pessoais',
  contact: 'Contato',
  ecclesiastical: 'Informações Eclesiásticas',
  address: 'Endereço',
};
