import { redirect } from 'next/navigation';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GroupsRedirect({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const qs = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((v) => qs.append(key, v));
    } else {
      qs.set(key, value);
    }
  }

  const query = qs.toString();
  redirect(query ? `/ministries?${query}` : '/ministries');
}
