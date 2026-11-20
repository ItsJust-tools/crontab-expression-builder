import type { Exporter } from '@itsjust/core';

const jsonExporter: Exporter = {
  format: 'json',
  export: async (_element, _options, stateSerializer) => {
    const content = stateSerializer?.() ?? '{}';
    return {
      success: true,
      data: content,
      filename: 'cron-expression.json',
      format: 'json' as const,
    };
  },
};

export default jsonExporter;
