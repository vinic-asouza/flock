'use client';

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { X } from 'lucide-react';
import { MainNavLinks } from '@/components/main/MainNavLinks';

type MobileNavDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50 md:hidden">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/40 transition data-closed:opacity-0 data-enter:duration-200 data-leave:duration-150"
      />

      <div className="fixed inset-0 flex justify-start">
        <DialogPanel
          transition
          className="flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] transition data-closed:-translate-x-full data-enter:duration-200 data-leave:duration-150"
        >
          <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4 shrink-0">
            <DialogTitle className="text-sm font-semibold text-gray-900">Menu</DialogTitle>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              aria-label="Fechar menu"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <MainNavLinks onNavigate={onClose} />
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
