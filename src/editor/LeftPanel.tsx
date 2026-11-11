import React, { useState } from 'react';
import { FileText, Images, Layers, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { ElementLibrary } from './ElementLibrary';
import { LayersPanel } from './LayersPanel';
import { PagesPanel } from './PagesPanel';
import { EditorAssetsPanel } from './EditorAssetsPanel';

type Tab = 'add' | 'layers' | 'pages' | 'assets';

const TABS: Array<{ id: Tab; label: string; icon: typeof Plus }> = [
  { id: 'add', label: 'Add', icon: Plus },
  { id: 'layers', label: 'Layers', icon: Layers },
  { id: 'pages', label: 'Pages', icon: FileText },
  { id: 'assets', label: 'Assets', icon: Images },
];

export function LeftPanel() {
  const [tab, setTab] = useState<Tab>('add');

  return (
    <aside className="flex w-[258px] shrink-0 flex-col border-r border-white/[0.06] bg-[#0a0a11]">
      <div className="grid grid-cols-4 gap-0.5 border-b border-white/[0.06] p-1.5">
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg py-1.5 text-[9.5px] font-medium transition',
                active
                  ? 'bg-white/[0.07] text-white'
                  : 'text-[#70708a] hover:bg-white/[0.04] hover:text-[#c8c8da]'
              )}
            >
              <item.icon size={13} className={active ? 'text-accent-soft' : undefined} />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === 'add' ? <ElementLibrary /> : null}
      {tab === 'layers' ? <LayersPanel /> : null}
      {tab === 'pages' ? <PagesPanel /> : null}
      {tab === 'assets' ? <EditorAssetsPanel /> : null}
    </aside>
  );
}
