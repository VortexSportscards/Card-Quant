import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InventoryChange } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Box, History, Upload, CheckCircle } from 'lucide-react';

interface InventoryChangesProps {
  inventoryChanges: InventoryChange[];
}

const getChangeTypeIcon = (type: InventoryChange['type']) => {
  switch (type) {
    case 'stream':
      return <Box className="h-4 w-4" />;
    case 'check':
      return <CheckCircle className="h-4 w-4" />;
    case 'manual':
      return <History className="h-4 w-4" />;
    case 'upload':
      return <Upload className="h-4 w-4" />;
    default:
      return null;
  }
};

const getChangeTypeLabel = (type: InventoryChange['type']) => {
  switch (type) {
    case 'stream':
      return 'Stream Sale';
    case 'check':
      return 'Inventory Check';
    case 'manual':
      return 'Manual Update';
    case 'upload':
      return 'Bulk Upload';
    default:
      return 'Unknown';
  }
};

export default function InventoryChanges({ inventoryChanges }: InventoryChangesProps) {
  const sortedChanges = useMemo(() => {
    return [...(inventoryChanges || [])].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [inventoryChanges]);

  if (!inventoryChanges?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inventory History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No inventory changes recorded yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & Time</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Changes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedChanges.map((change) => (
              <TableRow key={change.id}>
                <TableCell>
                  {new Date(change.timestamp).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getChangeTypeIcon(change.type)}
                    <span>{getChangeTypeLabel(change.type)}</span>
                  </div>
                </TableCell>
                <TableCell>{change.user.name}</TableCell>
                <TableCell>{change.description}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {change.changes.map((item, index) => (
                      <div key={index} className="text-sm">
                        {item.itemName}:{' '}
                        <span className={item.difference < 0 ? 'text-red-500' : 'text-green-500'}>
                          {item.difference > 0 ? '+' : ''}{item.difference}
                        </span>
                      </div>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}