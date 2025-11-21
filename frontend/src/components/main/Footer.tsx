'use client';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="h-12 bg-white border-t border-gray-200 px-6 flex items-center justify-center">
      <p className="text-xs text-gray-500">
        © {currentYear} Flock App. Todos os direitos reservados.
      </p>
    </footer>
  );
}
