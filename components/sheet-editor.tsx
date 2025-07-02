'use client';

import React, { memo, useEffect, useMemo, useState } from 'react';
import DataGrid, { textEditor } from 'react-data-grid';
import { parse, unparse } from 'papaparse';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

import 'react-data-grid/lib/styles.css';

type SheetEditorProps = {
  content: string;
  saveContent: (content: string, isCurrentVersion: boolean) => void;
  status: string;
  isCurrentVersion: boolean;
  currentVersionIndex: number;
};

const MIN_ROWS = 50;
const MIN_COLS = 26;
const MAX_ROWS = 1000;
const MAX_COLS = 50;

const PureSpreadsheetEditor = ({
  content,
  saveContent,
  status,
  isCurrentVersion,
}: SheetEditorProps) => {
  const { resolvedTheme } = useTheme();
  const [isTruncated, setIsTruncated] = useState(false);

  const parseData = useMemo(() => {
    if (!content) return Array(MIN_ROWS).fill(Array(MIN_COLS).fill(''));

    try {
      const result = parse<string[]>(content, { skipEmptyLines: true });

      if (!result.data || result.data.length === 0) {
        return Array(MIN_ROWS).fill(Array(MIN_COLS).fill(''));
      }

      const limitedData = result.data.slice(0, MAX_ROWS);
      const isDataTruncated = result.data.length > MAX_ROWS;

      const paddedData = limitedData.map((row) => {
        const paddedRow = [...row];
        while (paddedRow.length < MIN_COLS) {
          paddedRow.push('');
        }
        if (paddedRow.length > MAX_COLS) {
          paddedRow.splice(MAX_COLS);
        }
        return paddedRow;
      });

      setIsTruncated(
        isDataTruncated ||
          (limitedData.length > 0 && limitedData[0].length > MAX_COLS),
      );

      while (paddedData.length < MIN_ROWS) {
        paddedData.push(Array(MIN_COLS).fill(''));
      }

      return paddedData;
    } catch (error) {
      console.error('Error parsing CSV:', error);
      return Array(MIN_ROWS).fill(Array(MIN_COLS).fill(''));
    }
  }, [content]);

  const columns = useMemo(() => {
    const rowNumberColumn = {
      key: 'rowNumber',
      name: '',
      frozen: true,
      width: 50,
      renderCell: ({ rowIdx }: { rowIdx: number }) => rowIdx + 1,
      cellClass: 'border-t border-r dark:bg-zinc-950 dark:text-zinc-50',
      headerCellClass: 'border-t border-r dark:bg-zinc-900 dark:text-zinc-50',
    };

    const maxCols = Math.max(
      MIN_COLS,
      parseData.length > 0 ? parseData[0].length : MIN_COLS,
    );
    const actualCols = Math.min(maxCols, MAX_COLS);

    const dataColumns = Array.from({ length: actualCols }, (_, i) => ({
      key: i.toString(),
      name: String.fromCharCode(65 + i),
      renderEditCell: textEditor,
      width: 120,
      cellClass: cn(`border-t dark:bg-zinc-950 dark:text-zinc-50`, {
        'border-l': i !== 0,
      }),
      headerCellClass: cn(`border-t dark:bg-zinc-900 dark:text-zinc-50`, {
        'border-l': i !== 0,
      }),
    }));

    return [rowNumberColumn, ...dataColumns];
  }, [parseData]);

  const initialRows = useMemo(() => {
    return parseData.map((row, rowIndex) => {
      const rowData: any = {
        id: rowIndex,
        rowNumber: rowIndex + 1,
      };

      columns.slice(1).forEach((col, colIndex) => {
        rowData[col.key] = row[colIndex] || '';
      });

      return rowData;
    });
  }, [parseData, columns]);

  const [localRows, setLocalRows] = useState(initialRows);

  useEffect(() => {
    setLocalRows(initialRows);
  }, [initialRows]);

  const generateCsv = (data: any[][]) => {
    return unparse(data);
  };

  const handleRowsChange = (newRows: any[]) => {
    setLocalRows(newRows);

    const updatedData = newRows.map((row) => {
      return columns.slice(1).map((col) => row[col.key] || '');
    });

    const newCsvContent = generateCsv(updatedData);
    saveContent(newCsvContent, true);
  };

  return (
    <div className="flex flex-col h-full">
      {isTruncated && (
        <div className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-4 py-2 text-sm border-b">
          Data has been truncated to improve performance. Showing first{' '}
          {MAX_ROWS} rows and {MAX_COLS} columns.
        </div>
      )}
      <DataGrid
        className={resolvedTheme === 'dark' ? 'rdg-dark' : 'rdg-light'}
        columns={columns}
        rows={localRows}
        enableVirtualization
        onRowsChange={handleRowsChange}
        onCellClick={(args) => {
          if (args.column.key !== 'rowNumber') {
            args.selectCell(true);
          }
        }}
        style={{ height: '100%' }}
        defaultColumnOptions={{
          resizable: true,
          sortable: true,
        }}
      />
    </div>
  );
};

function areEqual(prevProps: SheetEditorProps, nextProps: SheetEditorProps) {
  return (
    prevProps.currentVersionIndex === nextProps.currentVersionIndex &&
    prevProps.isCurrentVersion === nextProps.isCurrentVersion &&
    !(prevProps.status === 'streaming' && nextProps.status === 'streaming') &&
    prevProps.content === nextProps.content &&
    prevProps.saveContent === nextProps.saveContent
  );
}

export const SpreadsheetEditor = memo(PureSpreadsheetEditor, areEqual);
