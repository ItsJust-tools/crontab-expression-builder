import type { ToolConfig } from '@itsjust/core';
import packageJson from '../../package.json';

export const templateBaseVersion = packageJson.version;

const toolConfig = {
  id: '1795183469',
  name: 'Crontab Expression Builder',
  description:
    'Build cron expressions by clicking scheduling options. See a plain-English description and the next five run times, with 5- and 6-field modes, presets, and shareable links.',
  version: '1.0.0',
  exportFormats: ['json', 'png', 'jpeg', 'webp', 'pdf'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: '#0ea5e9',
    accentHover: '#0284c7',
    accentSubtle: 'rgba(14, 165, 233, 0.08)',
    brand: 'Crontab Builder',
    icon: '⏰',
  },
  shortcuts: [
    {
      title: 'Crontab Expression Builder',
      shortcuts: [
        {
          keys: 'Ctrl+K',
          label: 'Clear all fields',
          description: 'reset every field back to the every-minute default',
        },
        {
          keys: 'Ctrl+Shift+C',
          label: 'Copy expression',
          description: 'copy the generated cron expression to the clipboard',
        },
      ],
    },
  ],
} satisfies ToolConfig;

export default toolConfig;
