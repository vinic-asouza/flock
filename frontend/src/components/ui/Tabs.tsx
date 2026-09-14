'use client';

import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  panelId?: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  ariaLabel?: string;
}

export function Tabs({
  tabs,
  activeTab,
  onTabChange,
  ariaLabel = 'Abas',
}: TabsProps) {
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    tabRefs.current.get(activeTab)?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }, [activeTab]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight') {
      nextIndex = (index + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    onTabChange(nextTab.id);
    tabRefs.current.get(nextTab.id)?.focus();
  };

  return (
    <div className="min-w-0 overflow-hidden border-b border-gray-200">
      <nav
        className="-mb-px flex overflow-x-auto"
        role="tablist"
        aria-label={ariaLabel}
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(element) => {
              if (element) {
                tabRefs.current.set(tab.id, element);
              } else {
                tabRefs.current.delete(tab.id);
              }
            }}
            id={`${tab.id}-tab`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={tab.panelId}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`
              flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2
              text-sm font-medium transition-colors first:pl-1 last:pr-1
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary
              ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            {tab.icon && <span>{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
