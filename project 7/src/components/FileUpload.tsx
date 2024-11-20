import { ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';
import { InventoryItem } from '@/lib/types';
import { generateId, parseCSVValue } from '@/lib/utils';

interface FileUploadProps {
  onUploadSuccess: (items: InventoryItem[]) => void;
  onUploadError: (error: string) => void;
}

export function FileUpload({ onUploadSuccess, onUploadError }: FileUploadProps) {
  const parseCSV = (content: string): InventoryItem[] => {
    try {
      const lines = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (lines.length < 2) {
        throw new Error('CSV file must contain a header row and at least one data row');
      }

      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());

      const headerMap: { [key: string]: string[] } = {
        name: ['name', 'item name', 'product name', 'title', 'product'],
        quantity: ['quantity', 'qty', 'amount', 'count', 'stock'],
        cost: ['cost', 'price', 'cost per', 'unit price', 'price per unit', 'value'],
        category: ['category', 'type', 'group', 'department']
      };

      const columnIndices: { [key: string]: number } = {};
      
      for (const [required, variations] of Object.entries(headerMap)) {
        const index = headers.findIndex(h => 
          variations.some(v => h.includes(v))
        );
        
        if (index === -1) {
          if (required === 'category') {
            columnIndices[required] = -1;
          } else {
            throw new Error(
              `Missing required column: ${required}. Acceptable headers: ${variations.join(', ')}`
            );
          }
        } else {
          columnIndices[required] = index;
        }
      }

      const validItems = lines.slice(1).reduce<InventoryItem[]>((acc, line) => {
        const values = line.split(',').map(parseCSVValue);
        
        const name = values[columnIndices.name];
        if (!name) {
          return acc;
        }

        let quantity = values[columnIndices.quantity].replace(/[^0-9.-]/g, '');
        const parsedQuantity = parseInt(quantity);
        if (isNaN(parsedQuantity)) {
          return acc;
        }

        let cost = values[columnIndices.cost].replace(/[^0-9.-]/g, '');
        const parsedCost = parseFloat(cost);
        if (isNaN(parsedCost) || parsedCost <= 0) {
          return acc;
        }

        const category = columnIndices.category >= 0 ? values[columnIndices.category] : 'Uncategorized';

        acc.push({
          id: generateId('inv-'),
          name,
          quantity: parsedQuantity,
          cost: parsedCost,
          category: category || 'Uncategorized'
        });

        return acc;
      }, []);

      if (validItems.length === 0) {
        throw new Error('No valid items found in the CSV file');
      }

      return validItems;
    } catch (error) {
      throw new Error(`Error parsing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      onUploadError('Please upload a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const items = parseCSV(content);
        onUploadSuccess(items);
      } catch (error) {
        onUploadError(error instanceof Error ? error.message : 'Error processing file');
      }
    };
    reader.onerror = () => {
      onUploadError('Error reading file');
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <Input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="cursor-pointer"
      />
      <div className="text-sm text-muted-foreground">
        <p className="mb-2">Upload a CSV file with the following columns:</p>
        <div className="bg-muted p-2 rounded-md text-xs mb-2">
          <p>name,quantity,cost,category</p>
          <p>"Product Name",10,99.99,Baseball</p>
          <p>"Another Product",0,49.99,Basketball</p>
        </div>
        <div className="text-xs text-muted-foreground">
          <p className="mb-2">Notes:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Required columns: name, quantity, cost</li>
            <li>Category is optional (defaults to "Uncategorized")</li>
            <li>Quantity can be zero or any number</li>
            <li>Cost must be greater than zero</li>
            <li>Rows with empty names will be skipped</li>
            <li>Headers are case-insensitive and flexible</li>
          </ul>
        </div>
      </div>
    </div>
  );
}