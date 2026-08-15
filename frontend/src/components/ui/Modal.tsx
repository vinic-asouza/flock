'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Encolher o overlay à visual viewport (teclado iOS)
  useEffect(() => {
    if (!isOpen) return;
    const overlay = overlayRef.current;
    const vv = window.visualViewport;
    if (!overlay || !vv) return;

    const sync = () => {
      overlay.style.top = `${vv.offsetTop}px`;
      overlay.style.height = `${vv.height}px`;
      overlay.style.bottom = 'auto';
    };

    sync();
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
      overlay.style.height = '';
      overlay.style.top = '';
      overlay.style.bottom = '';
    };
  }, [isOpen]);

  // Fechar modal com Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevenir scroll do body
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, closeOnEscape]);

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleTabKey = (event: KeyboardEvent) => {
        if (event.key === 'Tab') {
          if (event.shiftKey) {
            if (document.activeElement === firstElement) {
              event.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              event.preventDefault();
              firstElement.focus();
            }
          }
        }
      };

      document.addEventListener('keydown', handleTabKey);
      firstElement?.focus();

      return () => {
        document.removeEventListener('keydown', handleTabKey);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />
      
      {/* Modal */}
      <div
        ref={modalRef}
        className={clsx(
          'relative bg-white shadow-xl w-full overflow-hidden flex flex-col',
          'max-h-full sm:max-h-[min(90dvh,90%)]',
          'rounded-t-xl sm:rounded-lg',
          'mx-0 sm:mx-auto',
          sizeClasses[size]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 shrink-0 px-4 py-4 sm:p-6 border-b border-gray-200">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 break-words">{title}</h2>
            {description ? (
              <div className="text-sm text-gray-500 mt-1">{description}</div>
            ) : null}
          </div>
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 inline-flex items-center justify-center min-h-11 min-w-11 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Fechar modal"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain [&_input]:scroll-mb-24 [&_select]:scroll-mb-24 [&_textarea]:scroll-mb-24">
          {children}
        </div>

        {footer ? (
          <div className="shrink-0 border-t border-gray-200 bg-gray-50">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
} 