import { generateUUID } from '@/lib/utils';
import type { DataStreamWriter } from 'ai';
import { tool } from 'ai';
import { z } from 'zod';
import type { Session } from 'next-auth';
import { put } from '@vercel/blob';

interface QueryDatabaseProps {
  session: Session;
  dataStream: DataStreamWriter;
  brandId: string;
}

function jsonToCsv(json: Record<string, string>[]): string {
  if (!Array.isArray(json) || json.length === 0) return '';

  const MAX_ROWS = 1000;
  const limitedData = json.slice(0, MAX_ROWS);

  const headers = Object.keys(limitedData[0]);
  const csvRows = [headers.join(',')];

  for (const row of limitedData) {
    csvRows.push(headers.map((h) => JSON.stringify(row[h] ?? '')).join(','));
  }

  return csvRows.join('\n');
}

function getCsvHeaders(csv: string): string {
  if (!csv) return '';
  const lines = csv.split('\n');
  return lines[0] || '';
}

export const queryDatabase = ({
  session,
  dataStream,
  brandId,
}: QueryDatabaseProps) =>
  tool({
    description:
      'Whenever a user asks you to query a database, you should use this tool. Query an external database using a prompt. The result will be shown as a sheet (CSV table).',
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
      let csvUrl = '';
      let headers = '';

      try {
        const response = await fetch(
          `${process.env.BACKEND_BASE_URL}${process.env.QUERY_DATABASE_API_ROUTE}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              brandid: brandId,
            },
            body: JSON.stringify({ prompt }),
          },
        );

        const json = (await response.json()) as {
          data: Record<string, string>[];
        };

        csv = jsonToCsv(json.data);
        headers = getCsvHeaders(csv);
      } catch (e) {
        csv = 'Error fetching or converting data.';
        headers = '';
        csvUrl = '';
      }

      const isCsvTooLarge = csv.length > 1_000_000;

      const csvBlob = new Blob([csv], { type: 'text/csv' });
      const csvBuffer = await csvBlob.arrayBuffer();

      if (isCsvTooLarge) {
        const { url } = await put(`${id}.csv`, csvBuffer, {
          access: 'public',
        });

        csvUrl = url;
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
        content: `A sheet artifact was created from the database query. CSV data is available at: ${csvUrl}. Headers: ${headers}`,
        csvData: {
          url: csvUrl,
          headers: headers,
          csvContent: isCsvTooLarge
            ? 'CSV is too large to display. Refer to the CSV URL for the full data.'
            : csv,
        },
        csvUrl: csvUrl,
        csvHeaders: headers,
      };
    },
  });
