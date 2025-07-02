import { generateUUID } from '@/lib/utils';
import { DataStreamWriter, tool } from 'ai';
import { z } from 'zod';
import { Session } from 'next-auth';

interface QueryDatabaseProps {
  session: Session;
  dataStream: DataStreamWriter;
}

function jsonToCsv(json: any[]): string {
  if (!Array.isArray(json) || json.length === 0) return '';
  const headers = Object.keys(json[0]);
  const csvRows = [headers.join(',')];
  for (const row of json) {
    csvRows.push(headers.map(h => JSON.stringify(row[h] ?? '')).join(','));
  }
  return csvRows.join('\n');
}

export const queryDatabase = ({ session, dataStream }: QueryDatabaseProps) =>
  tool({
    description:
      'Query an external database using a prompt. The result will be shown as a sheet (CSV table).',
    parameters: z.object({
      prompt: z.string().describe('The query or prompt for the database'),
    }),
    execute: async ({ prompt }) => {
      const id = generateUUID();
      const kind = 'sheet';
      const title = prompt;

      dataStream.writeData({
        type: 'kind',
        content: kind,
      });
      dataStream.writeData({
        type: 'id',
        content: id,
      });
      dataStream.writeData({
        type: 'title',
        content: title,
      });
      dataStream.writeData({
        type: 'clear',
        content: '',
      });

      let csv = '';
      try {
        const response = await fetch('https://your-external-api.com/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        const json = await response.json();
        csv = jsonToCsv(json);
      } catch (e) {
        csv = 'Error fetching or converting data.';
      }

      dataStream.writeData({
        type: 'sheet-delta',
        content: csv,
      });
      dataStream.writeData({ type: 'finish', content: '' });

      return {
        id,
        title,
        kind,
        content: 'A sheet artifact was created from the database query.',
      };
    },
  });